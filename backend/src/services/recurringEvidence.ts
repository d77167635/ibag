import { supabaseAdmin } from "../config/supabase.js";

/**
 * Evidence-bounded recurring-series detector.
 *
 * Only active, posted canonical transactions whose semantic class was
 * calculated/observed and whose class is economically compatible with a
 * recurring outflow may create a series. Derived rows are rebuilt from the
 * current evidence set so stale series cannot survive a provider removal.
 */
export async function detectRecurringSeriesEvidenceBounded(userId: string) {
  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("merchant_id, amount, posted_date, plaid_category_detailed, transaction_class, classification_evidence")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .not("merchant_id", "is", null)
    .gt("amount", 0)
    .in("transaction_class", ["purchase", "debt_payment"])
    .in("classification_evidence", ["calculated", "observed"])
    .order("posted_date", { ascending: true });
  if (error) throw error;

  const { data: essentialCategories, error: categoryError } = await supabaseAdmin
    .from("category_mapping")
    .select("plaid_category_detailed")
    .eq("is_essential", true);
  if (categoryError) throw categoryError;

  const essentialSet = new Set((essentialCategories ?? []).map((c) => c.plaid_category_detailed));
  const byMerchant = new Map<string, { amount: number; date: string; category: string | null }[]>();
  for (const tx of txs ?? []) {
    const list = byMerchant.get(tx.merchant_id) ?? [];
    list.push({ amount: Number(tx.amount), date: tx.posted_date, category: tx.plaid_category_detailed });
    byMerchant.set(tx.merchant_id, list);
  }

  // Remove prior derived output before recomputing from the current evidence set.
  const { error: clearError } = await supabaseAdmin.from("recurring_series").delete().eq("user_id", userId);
  if (clearError) throw clearError;

  const median = (nums: number[]) => {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const daysBetween = (a: string, b: string) =>
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

  for (const [merchantId, occurrences] of byMerchant) {
    if (occurrences.length < 3) continue;
    const amounts = occurrences.map((o) => o.amount);
    const medianAmount = median(amounts);
    if (medianAmount <= 0 || !amounts.every((a) => Math.abs(a - medianAmount) / medianAmount <= 0.1)) continue;

    const gaps: number[] = [];
    for (let i = 1; i < occurrences.length; i++) gaps.push(daysBetween(occurrences[i - 1].date, occurrences[i].date));
    const medianGap = median(gaps);
    if (medianGap < 1 || !gaps.every((g) => Math.abs(g - medianGap) <= 5)) continue;

    const lastSeen = occurrences[occurrences.length - 1].date;
    const nextExpected = new Date(new Date(lastSeen).getTime() + medianGap * 86_400_000).toISOString().slice(0, 10);
    const mostRecentCategory = occurrences[occurrences.length - 1].category;
    const isEssential = mostRecentCategory ? essentialSet.has(mostRecentCategory) : false;

    const { error: upsertError } = await supabaseAdmin.from("recurring_series").upsert(
      {
        user_id: userId,
        merchant_id: merchantId,
        typical_amount: medianAmount,
        interval_days: Math.round(medianGap),
        last_seen_date: lastSeen,
        next_expected_date: nextExpected,
        occurrence_count: occurrences.length,
        is_essential: isEssential,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,merchant_id" },
    );
    if (upsertError) throw upsertError;
  }
}
