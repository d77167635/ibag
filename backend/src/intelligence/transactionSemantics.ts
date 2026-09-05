import { supabaseAdmin } from "../config/supabase.js";

export const ROUNDUP_RENT_SIZED_THRESHOLD = 800;
export const ROUNDUP_RULE_VERSION = "ROUNDUP_STANDARD_V2";

export type CanonicalTransaction = {
  id: string;
  amount: number;
  posted_date: string;
  transaction_class: string;
  classification_evidence: string;
  plaid_category_primary: string | null;
  plaid_category_detailed: string | null;
  subdomain: { key: string; label: string } | null;
};

const ECONOMIC_INFLOW = new Set(["income", "refund"]);
const ECONOMIC_OUTFLOW = new Set(["purchase", "debt_payment", "fee"]);

export async function getCanonicalTransactions(userId: string, since?: string): Promise<CanonicalTransaction[]> {
  let query = supabaseAdmin
    .from("transactions")
    .select("id, amount, posted_date, transaction_class, classification_evidence, plaid_category_primary, plaid_category_detailed, subdomains(key, label)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .in("classification_evidence", ["observed", "calculated"]);
  if (since) query = query.gte("posted_date", since);
  const { data, error } = await query.order("posted_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    amount: Number(row.amount),
    posted_date: row.posted_date,
    transaction_class: row.transaction_class,
    classification_evidence: row.classification_evidence,
    plaid_category_primary: row.plaid_category_primary ?? null,
    plaid_category_detailed: row.plaid_category_detailed ?? null,
    subdomain: row.subdomains ? { key: row.subdomains.key, label: row.subdomains.label } : null,
  }));
}

export function isEconomicInflow(tx: Pick<CanonicalTransaction, "amount" | "transaction_class">) {
  return tx.amount < 0 && ECONOMIC_INFLOW.has(tx.transaction_class);
}

export function isEconomicOutflow(tx: Pick<CanonicalTransaction, "amount" | "transaction_class">) {
  return tx.amount > 0 && ECONOMIC_OUTFLOW.has(tx.transaction_class);
}

export function isEligibleRoundup(tx: Pick<CanonicalTransaction, "amount" | "transaction_class" | "classification_evidence">) {
  return tx.amount > 0 &&
    tx.amount < ROUNDUP_RENT_SIZED_THRESHOLD &&
    tx.transaction_class === "purchase" &&
    ["observed", "calculated"].includes(tx.classification_evidence);
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
  if (!eligible.length) return { dailyRate: null, projected: null, projectedAmount: null, basisDays: 0, projectDays, eligibleTransactionCount: 0, calculation_version: ROUNDUP_RULE_VERSION };
  const total = eligible.reduce((sum, tx) => sum + roundupAmount(tx.amount), 0);
  const dates = eligible.map(tx => new Date(tx.posted_date).getTime());
  const spanDays = Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000));
  const dailyRate = total / spanDays;
  const projected = dailyRate * projectDays;
  return { dailyRate, projected, projectedAmount: projected, basisDays: spanDays, projectDays, eligibleTransactionCount: eligible.length, calculation_version: ROUNDUP_RULE_VERSION };
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
  return Array.from(groups.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    amount: v.current,
    changePct: v.prior > 0 ? ((v.current - v.prior) / v.prior) * 100 : null,
  })).sort((a, b) => b.amount - a.amount);
}

export function computeCanonicalWindowFlows(transactions: CanonicalTransaction[], windows: readonly number[]) {
  return [...windows].sort((a, b) => a - b).map(windowDays => {
    const start = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
    const rows = transactions.filter(tx => tx.posted_date >= start);
    const flow = computeEconomicCashFlow(rows);
    return {
      windowDays,
      ...flow,
      purchaseTotal: rows.filter(tx => tx.transaction_class === "purchase" && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
      debtPaymentTotal: rows.filter(tx => tx.transaction_class === "debt_payment" && tx.amount > 0).reduce((s, tx) => s + tx.amount, 0),
      txCount: rows.length,
      economicTxCount: rows.filter(tx => isEconomicInflow(tx) || isEconomicOutflow(tx)).length,
    };
  });
}
