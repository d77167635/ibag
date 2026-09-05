import { supabaseAdmin } from "../config/supabase.js";

export const ROUNDUP_RENT_SIZED_THRESHOLD = 800;
export const ROUNDUP_RULE_VERSION = "ROUNDUP_STANDARD_V2";

export type CanonicalTransaction = {
  id: string;
  account_id: string;
  amount: number;
  posted_date: string;
  transaction_class: string;
  classification_evidence: string;
  plaid_category_primary: string | null;
  plaid_category_detailed: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  subdomain: { key: string; label: string } | null;
  domain: { key: string; label: string } | null;
};

const ECONOMIC_INFLOW = new Set(["income", "refund"]);
const ECONOMIC_OUTFLOW = new Set(["purchase", "debt_payment", "fee"]);

export async function getCanonicalTransactions(userId: string, since?: string): Promise<CanonicalTransaction[]> {
  let query = supabaseAdmin
    .from("transactions")
    .select("id, account_id, amount, posted_date, transaction_class, classification_evidence, plaid_category_primary, plaid_category_detailed, merchant_id, merchant_name, merchants(canonical_name), subdomains(key, label, domains(key, label))")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .in("classification_evidence", ["observed", "calculated"]);
  if (since) query = query.gte("posted_date", since);
  const { data, error } = await query.order("posted_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    account_id: row.account_id,
    amount: Number(row.amount),
    posted_date: row.posted_date,
    transaction_class: row.transaction_class,
    classification_evidence: row.classification_evidence,
    plaid_category_primary: row.plaid_category_primary ?? null,
    plaid_category_detailed: row.plaid_category_detailed ?? null,
    merchant_id: row.merchant_id ?? null,
    merchant_name: row.merchant_name ?? row.merchants?.canonical_name ?? null,
    subdomain: row.subdomains ? { key: row.subdomains.key, label: row.subdomains.label } : null,
    domain: row.subdomains?.domains ? { key: row.subdomains.domains.key, label: row.subdomains.domains.label } : null,
  }));
}

export function isEconomicInflow(tx: Pick<CanonicalTransaction, "amount" | "transaction_class">) {
  return tx.amount < 0 && ECONOMIC_INFLOW.has(tx.transaction_class);
}

export function isEconomicOutflow(tx: Pick<CanonicalTransaction, "amount" | "transaction_class">) {
  return tx.amount > 0 && ECONOMIC_OUTFLOW.has(tx.transaction_class);
}

export function isEligibleRoundup(tx: Pick<CanonicalTransaction, "amount" | "transaction_class" | "classification_evidence">) {
  return tx.amount > 0 && tx.amount < ROUNDUP_RENT_SIZED_THRESHOLD && tx.transaction_class === "purchase" && ["observed", "calculated"].includes(tx.classification_evidence);
}

export function roundupAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount >= ROUNDUP_RENT_SIZED_THRESHOLD) return 0;
  return Math.max(0, Math.ceil(amount) - amount);
}

export function computeEconomicCashFlow(transactions: CanonicalTransaction[]) {
  let inflow = 0;
  let outflow = 0;
  for (const tx of transactions) {
    if (isEconomicInflow(tx)) inflow += Math.abs(tx.amount);
    else if (isEconomicOutflow(tx)) outflow += tx.amount;
  }
  return { inflow, outflow, net: inflow - outflow };
}

export function computeRoundupProjectionFromTransactions(transactions: CanonicalTransaction[], projectDays = 30) {
  const eligible = transactions.filter(isEligibleRoundup);
  if (!eligible.length) return { total: 0, dailyRate: null, projected: null, projectedAmount: null, projectedTotal: null, basisDays: 0, projectDays, eligibleTransactionCount: 0, calculation_version: ROUNDUP_RULE_VERSION };
  const total = eligible.reduce((sum, tx) => sum + roundupAmount(tx.amount), 0);
  const dates = eligible.map(tx => new Date(tx.posted_date).getTime());
  const spanDays = Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000));
  const dailyRate = total / spanDays;
  const projected = dailyRate * projectDays;
  return { total, dailyRate, projected, projectedAmount: projected, projectedTotal: projected, basisDays: spanDays, projectDays, eligibleTransactionCount: eligible.length, calculation_version: ROUNDUP_RULE_VERSION };
}

export function computeSpendingByDomainFromTransactions(transactions: CanonicalTransaction[], windowDays = 30) {
  const now = Date.now();
  const currentStart = new Date(now - windowDays * 86_400_000).toISOString().slice(0, 10);
  const priorStart = new Date(now - 2 * windowDays * 86_400_000).toISOString().slice(0, 10);
  const spending = transactions.filter(tx => isEconomicOutflow(tx) && tx.posted_date >= priorStart);
  const groups = new Map<string, { label: string; current: number; prior: number }>();
  for (const tx of spending) {
    const key = tx.subdomain?.key ?? "uncategorized";
    const label = tx.subdomain?.label ?? "Uncategorized";
    const entry = groups.get(key) ?? { label, current: 0, prior: 0 };
    if (tx.posted_date >= currentStart) entry.current += tx.amount;
    else entry.prior += tx.amount;
    groups.set(key, entry);
  }
  return Array.from(groups.entries()).map(([key, v]) => ({ key, label: v.label, amount: v.current, changePct: v.prior > 0 ? ((v.current - v.prior) / v.prior) * 100 : null })).sort((a, b) => b.amount - a.amount);
}

export function computeCanonicalSpendingHierarchy(transactions: CanonicalTransaction[], windowDays = 30) {
  const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const spending = transactions.filter(tx => isEconomicOutflow(tx) && tx.posted_date >= windowStart);
  type DomainAcc = { key: string; label: string; amount: number; subdomains: Map<string, { label: string; amount: number }> };
  const byDomain = new Map<string, DomainAcc>();
  for (const tx of spending) {
    const domainKey = tx.domain?.key ?? "uncategorized";
    const domainLabel = tx.domain?.label ?? "Uncategorized";
    const subKey = tx.subdomain?.key ?? "uncategorized";
    const subLabel = tx.subdomain?.label ?? "Uncategorized";
    const entry = byDomain.get(domainKey) ?? { key: domainKey, label: domainLabel, amount: 0, subdomains: new Map() };
    entry.amount += tx.amount;
    const sub = entry.subdomains.get(subKey) ?? { label: subLabel, amount: 0 };
    sub.amount += tx.amount;
    entry.subdomains.set(subKey, sub);
    byDomain.set(domainKey, entry);
  }
  const total = spending.reduce((sum, tx) => sum + tx.amount, 0);
  return Array.from(byDomain.values()).map(d => ({ key: d.key, label: d.label, amount: d.amount, pctOfTotal: total > 0 ? (d.amount / total) * 100 : 0, subdomains: Array.from(d.subdomains.entries()).map(([key, v]) => ({ key, label: v.label, amount: v.amount })).sort((a, b) => b.amount - a.amount) })).sort((a, b) => b.amount - a.amount);
}

export async function computeCanonicalForwardProjection(userId: string, days = 30) {
  const [{ data: checkingAccounts, error: balanceError }, { data: series, error: seriesError }] = await Promise.all([
    supabaseAdmin.from("plaid_accounts").select("available_balance").eq("user_id", userId).eq("type", "depository").eq("subtype", "checking").not("available_balance", "is", null),
    supabaseAdmin.from("recurring_series").select("typical_amount, next_expected_date, occurrence_count, merchants(canonical_name)").eq("user_id", userId).eq("is_essential", true).gte("occurrence_count", 2).not("typical_amount", "is", null).not("next_expected_date", "is", null),
  ]);
  if (balanceError) throw balanceError;
  if (seriesError) throw seriesError;
  if (!checkingAccounts?.length) return { series: [], basis: "no_checking_balance", evidence_state: "insufficient_evidence" as const, limitations: ["No observed checking available balance."] };
  const startBalance = checkingAccounts.reduce((sum, a) => sum + Number(a.available_balance), 0);
  const projected: { date: string; balance: number; event: string | null }[] = [];
  let balance = startBalance;
  for (let i = 0; i <= days; i++) {
    const date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    const dueToday = (series ?? []).filter((s: any) => s.next_expected_date === date && Number(s.typical_amount) > 0);
    let event: string | null = null;
    for (const bill of dueToday) {
      balance -= Number(bill.typical_amount);
      const merchant = bill.merchants?.[0]?.canonical_name;
      const label = merchant ?? "Known essential bill";
      event = event ? `${event}, ${label}` : label;
    }
    projected.push({ date, balance, event });
  }
  const observedSeriesCount = (series ?? []).length;
  const limitations = ["Projection models only recurring essential bills with at least two observed occurrences; it does not model unobserved income or discretionary spending."];
  return { series: projected, basis: "observed_checking_balance_plus_recurring_essential_series", evidence_state: observedSeriesCount ? "calculated" as const : "limited" as const, recurring_series_count: observedSeriesCount, horizon_days: days, limitations };
}

export function computeCanonicalWindowFlows(transactions: CanonicalTransaction[], windows: readonly number[]) {
  return [...windows].sort((a, b) => a - b).map(windowDays => {
    const start = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
    const rows = transactions.filter(tx => tx.posted_date >= start);
    const flow = computeEconomicCashFlow(rows);
    return { windowDays, ...flow, purchaseTotal: rows.filter(tx => tx.transaction_class === "purchase" && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0), debtPaymentTotal: rows.filter(tx => tx.transaction_class === "debt_payment" && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0), txCount: rows.length, economicTxCount: rows.filter(tx => isEconomicInflow(tx) || isEconomicOutflow(tx)).length };
  });
}
