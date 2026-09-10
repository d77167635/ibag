import { supabaseAdmin } from "../config/supabase.js";
import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

export async function computeRunBoundForwardProjection(userId: string, runId: string, days = 30, asOf?: string | Date | null) {
  const boundary = asOf ? new Date(asOf) : new Date();
  if (!Number.isFinite(boundary.getTime())) throw new Error("INVALID_EVIDENCE_BOUNDARY");

  const { data: evidence, error: evidenceError } = await supabaseAdmin
    .from("iris_run_evidence")
    .select("raw_observation_id,evidence_type,acquired_at,effective_at,evidence_hash")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .eq("provider", "plaid");
  if (evidenceError) throw new Error(`RUN_PROJECTION_EVIDENCE_READ_FAILED: ${evidenceError.message}`);

  const balanceIds = [...new Set((evidence ?? []).filter((e) => e.evidence_type === "provider_raw_balance").map((e) => e.raw_observation_id).filter((id): id is string => typeof id === "string"))];
  const transactionEvidenceIds = [...new Set((evidence ?? []).filter((e) => e.evidence_type === "provider_raw_transaction").map((e) => e.raw_observation_id).filter((id): id is string => typeof id === "string"))];
  if (!balanceIds.length || !transactionEvidenceIds.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_evidence_missing_balance_or_transactions", evidence_state: "insufficient_evidence" as const, limitations: ["An exact-run projection requires both observed Balance evidence and observed transaction evidence."] };
  }

  const { data: balances, error: balanceError } = await supabaseAdmin
    .from("plaid_raw_balances")
    .select("id,account_id,raw_response,effective_at,acquired_at,evidence_state,is_current")
    .eq("user_id", userId)
    .in("id", balanceIds)
    .eq("is_current", true)
    .eq("evidence_state", "observed")
    .lte("acquired_at", boundary.toISOString());
  if (balanceError) throw new Error(`RUN_PROJECTION_BALANCE_READ_FAILED: ${balanceError.message}`);

  const balanceRows = (balances ?? []).map((row: any) => {
    const response = row.raw_response && typeof row.raw_response === "object" ? row.raw_response : {};
    const available = response.available ?? response.balances?.available;
    return { ...row, available: Number(available) };
  }).filter((row: any) => Number.isFinite(row.available));
  if (!balanceRows.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_balance_not_numerically_observed", evidence_state: "insufficient_evidence" as const, limitations: ["The exact run contains Balance evidence, but no usable observed available balance was found."] };
  }

  const accounts = [...new Set(balanceRows.map((row: any) => row.account_id).filter(Boolean))];
  const { data: accountRows, error: accountError } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id,type,subtype")
    .eq("user_id", userId)
    .in("id", accounts);
  if (accountError) throw new Error(`RUN_PROJECTION_ACCOUNT_READ_FAILED: ${accountError.message}`);
  const checkingIds = new Set((accountRows ?? []).filter((a: any) => a.type === "depository" && a.subtype === "checking").map((a: any) => a.id));
  const checkingBalances = balanceRows.filter((row: any) => checkingIds.has(row.account_id));
  if (!checkingBalances.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_has_no_checking_balance", evidence_state: "insufficient_evidence" as const, limitations: ["The exact run does not contain an observed checking balance suitable for the forward projection."] };
  }
  const startBalance = checkingBalances.reduce((sum: number, row: any) => sum + row.available, 0);

  const widestStart = new Date(boundary.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  const transactions = await getCanonicalTransactions(userId, widestStart, boundary, runId);
  const outflows = transactions.filter(isEconomicOutflow);

  type Recurring = { merchant: string; amount: number; nextDate: string; occurrences: number; averageGapDays: number };
  const groups = new Map<string, typeof outflows>();
  for (const tx of outflows) {
    const key = tx.merchant_id ?? tx.merchant_name ?? `transaction:${tx.id}`;
    const rows = groups.get(key) ?? [];
    rows.push(tx);
    groups.set(key, rows);
  }
  const recurring: Recurring[] = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const ordered = [...rows].sort((a, b) => a.posted_date.localeCompare(b.posted_date));
    const gaps: number[] = [];
    for (let i = 1; i < ordered.length; i++) {
      const gap = (new Date(ordered[i].posted_date).getTime() - new Date(ordered[i - 1].posted_date).getTime()) / 86_400_000;
      if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
    }
    if (!gaps.length) continue;
    const averageGapDays = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
    if (averageGapDays < 5 || averageGapDays > 45) continue;
    const amounts = ordered.map((tx) => tx.amount).filter(Number.isFinite);
    const amount = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    const last = ordered[ordered.length - 1];
    const next = new Date(new Date(last.posted_date).getTime() + averageGapDays * 86_400_000);
    if (next <= boundary) continue;
    recurring.push({ merchant: last.merchant_name ?? "Observed recurring outflow", amount, nextDate: next.toISOString().slice(0, 10), occurrences: ordered.length, averageGapDays });
  }

  const projected: { date: string; balance: number; event: string | null }[] = [];
  let balance = startBalance;
  for (let i = 0; i <= days; i++) {
    const date = new Date(boundary.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const due = recurring.filter((item) => item.nextDate === date);
    let event: string | null = null;
    for (const item of due) {
      balance -= item.amount;
      event = event ? `${event}, ${item.merchant}` : item.merchant;
    }
    projected.push({ date, balance, event });
  }

  return {
    series: projected,
    projectedLiquidPosition: projected.at(-1)?.balance ?? null,
    basis: "exact_run_observed_checking_balance_plus_recurring_patterns_derived_from_exact_run_transactions",
    evidence_state: recurring.length ? "calculated" as const : "limited" as const,
    recurring_series_count: recurring.length,
    recurring_series: recurring,
    transaction_evidence_count: transactions.length,
    balance_evidence_count: checkingBalances.length,
    horizon_days: days,
    limitations: ["Recurring events are derived only from repeated outflows observed inside this exact run; no external recurring-series state is imported.", "The projection does not model unobserved future income or discretionary spending."]
  };
}
