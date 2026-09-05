import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

export async function computeCanonicalAnomalies(userId: string, windowDays = 30) {
  const cutoff = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const txs = await getCanonicalTransactions(userId);
  const recent = txs.filter(tx => isEconomicOutflow(tx) && tx.posted_date >= cutoff && tx.merchant_id);
  const byMerchant = new Map<string, typeof txs>();
  for (const tx of txs.filter(isEconomicOutflow)) {
    if (!tx.merchant_id) continue;
    const rows = byMerchant.get(tx.merchant_id) ?? [];
    rows.push(tx);
    byMerchant.set(tx.merchant_id, rows);
  }
  return recent.flatMap(tx => {
    const history = (byMerchant.get(tx.merchant_id!) ?? []).filter(h => h.id !== tx.id);
    if (history.length < 2) return [];
    const avg = history.reduce((s, h) => s + h.amount, 0) / history.length;
    if (avg <= 0 || tx.amount < avg * 1.5) return [];
    return [{ merchant: tx.merchant_name ?? "Unknown", amount: tx.amount, typicalAmount: avg, date: tx.posted_date, pctAboveTypical: ((tx.amount - avg) / avg) * 100 }];
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export async function computeCanonicalSpendingHierarchy(userId: string, windowDays = 30) {
  const cutoff = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const txs = (await getCanonicalTransactions(userId)).filter(tx => isEconomicOutflow(tx) && tx.posted_date >= cutoff);
  const domains = new Map<string, { label: string; amount: number; subdomains: Map<string, { label: string; amount: number }> }>();
  for (const tx of txs) {
    const dk = tx.domain?.key ?? "uncategorized";
    const dl = tx.domain?.label ?? "Uncategorized";
    const domain = domains.get(dk) ?? { label: dl, amount: 0, subdomains: new Map() };
    domain.amount += tx.amount;
    const sk = tx.subdomain?.key ?? "uncategorized";
    const sl = tx.subdomain?.label ?? "Uncategorized";
    const sub = domain.subdomains.get(sk) ?? { label: sl, amount: 0 };
    sub.amount += tx.amount;
    domain.subdomains.set(sk, sub);
    domains.set(dk, domain);
  }
  const total = txs.reduce((s, tx) => s + tx.amount, 0);
  return Array.from(domains.entries()).map(([key, d]) => ({ key, label: d.label, amount: d.amount, pctOfTotal: total > 0 ? d.amount / total * 100 : 0, subdomains: Array.from(d.subdomains.values()).sort((a,b) => b.amount-a.amount) })).sort((a,b) => b.amount-a.amount);
}

export async function computeCanonicalForwardProjection(userId: string, days = 30) {
  const txs = await getCanonicalTransactions(userId);
  const { data: essentialCategories } = await (await import("../config/supabase.js")).supabaseAdmin.from("category_mapping").select("plaid_category_detailed").eq("is_essential", true);
  const essential = new Set((essentialCategories ?? []).map((x: any) => x.plaid_category_detailed));
  const outflows = txs.filter(isEconomicOutflow).filter(tx => tx.plaid_category_detailed && essential.has(tx.plaid_category_detailed));
  const checking = await (await import("../config/supabase.js")).supabaseAdmin.from("plaid_accounts").select("available_balance").eq("user_id", userId).eq("type", "depository").eq("subtype", "checking").not("available_balance", "is", null);
  const rows = checking.data ?? [];
  if (!rows.length) return { series: [], basis: "no_checking_balance" };
  const start = rows.reduce((s: number, a: any) => s + Number(a.available_balance), 0);
  const result: { date: string; balance: number; event: string | null }[] = [];
  let balance = start;
  for (let i = 0; i <= days; i++) {
    const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    const eventRows = outflows.filter(tx => tx.posted_date === date);
    for (const tx of eventRows) balance -= tx.amount;
    result.push({ date, balance, event: eventRows.length ? `${eventRows.length} observed economic outflow(s)` : null });
  }
  return { series: result, basis: "observed_canonical_essential_category_outflows_only", evidence_window_days: 90 };
}
