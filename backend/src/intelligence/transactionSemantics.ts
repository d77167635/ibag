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
    if (isEconomicOutflow(tx)) outflow += tx.amount;
  }
  return { inflow, outflow, net: inflow - outflow };
}

export function computeRoundupProjectionFromTransactions(transactions: CanonicalTransaction[]) {
  const eligible = transactions.filter(isEligibleRoundup);
  const total = eligible.reduce((sum, tx) => sum + roundupAmount(tx.amount), 0);
  const observedDays = transactions.length ? Math.max(1, Math.round((new Date(transactions[transactions.length - 1].posted_date).getTime() - new Date(transactions[0].posted_date).getTime()) / 86_400_000)) : 0;
  const daily = observedDays ? total / observedDays : 0;
  return { observed_opportunity: total, eligible_purchase_count: eligible.length, observed_days: observedDays, projected_30d: daily * 30, rule_version: ROUNDUP_RULE_VERSION, evidence_state: eligible.length ? "calculated" : "insufficient_evidence" };
}

export function computeSpendingByDomainFromTransactions(transactions: CanonicalTransaction[]) {
  const totals = new Map<string, number>();
  for (const tx of transactions) if (isEconomicOutflow(tx)) {
    const key = tx.domain?.key ?? "unclassified";
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }
  return [...totals.entries()].map(([domain, amount]) => ({ domain, amount }));
}

export function computeCanonicalSpendingHierarchy(transactions: CanonicalTransaction[]) {
  const hierarchy = new Map<string, { amount: number; subdomains: Map<string, number>; merchants: Map<string, number> }>();
  for (const tx of transactions) if (isEconomicOutflow(tx)) {
    const domain = tx.domain?.key ?? "unclassified";
    const subdomain = tx.subdomain?.key ?? "unclassified";
    const merchant = tx.merchant_name ?? "unknown";
    const node = hierarchy.get(domain) ?? { amount: 0, subdomains: new Map(), merchants: new Map() };
    node.amount += tx.amount;
    node.subdomains.set(subdomain, (node.subdomains.get(subdomain) ?? 0) + tx.amount);
    node.merchants.set(merchant, (node.merchants.get(merchant) ?? 0) + tx.amount);
    hierarchy.set(domain, node);
  }
  return [...hierarchy.entries()].map(([domain, value]) => ({ domain, amount: value.amount, subdomains: [...value.subdomains.entries()].map(([key, amount]) => ({ key, amount })), merchants: [...value.merchants.entries()].map(([merchant, amount]) => ({ merchant, amount })) }));
}

export async function computeCanonicalForwardProjection(userId: string, days = 30) {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const transactions = await getCanonicalTransactions(userId, since);
  const { data: accounts, error } = await supabaseAdmin.from("plaid_accounts").select("id, subtype, available_balance").eq("user_id", userId);
  if (error) throw error;
  const checking = (accounts ?? []).filter((a: any) => a.subtype === "checking" && a.available_balance != null);
  const balance = checking.reduce((sum: number, a: any) => sum + Number(a.available_balance), 0);
  const { data: recurring, error: recurringError } = await supabaseAdmin.from("recurring_series").select("account_id, typical_amount, next_expected_date, occurrence_count, category").eq("user_id", userId).gte("occurrence_count", 2);
  if (recurringError) throw recurringError;
  const essential = (recurring ?? []).filter((bill: any) => Number(bill.typical_amount) > 0 && bill.next_expected_date && String(bill.category ?? "").toLowerCase().includes("essential"));
  const essentialTotal = essential.reduce((sum: number, bill: any) => sum + Number(bill.typical_amount), 0);
  return { days, starting_available_balance: balance, projected_essential_bills: essentialTotal, projected_balance_after_essential_bills: balance - essentialTotal, basis: transactions.length && checking.length ? "observed_checking_balance_plus_observed_recurring_essential_bills" : "insufficient_evidence", evidence_state: transactions.length && checking.length ? "calculated" : "insufficient_evidence" };
}
