import { supabase } from "../supabase";

export type EvidenceState = "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence";
export type CanonicalTransactionClass = "purchase" | "debt_payment" | "fee" | "income" | "refund" | "transfer" | "withdrawal" | "unknown";

export type CanonicalTransaction = {
  id: string;
  amount: number;
  posted_date: string;
  transaction_class: CanonicalTransactionClass;
  classification_evidence: EvidenceState;
  plaid_primary_category?: string | null;
  plaid_detailed_category?: string | null;
  merchant?: string | null;
  subdomain?: string | null;
  domain?: string | null;
};

const PURCHASE_CLASSES = new Set<CanonicalTransactionClass>(["purchase"]);
const OUTFLOW_CLASSES = new Set<CanonicalTransactionClass>(["purchase", "debt_payment", "fee"]);
const INFLOW_CLASSES = new Set<CanonicalTransactionClass>(["income", "refund"]);

function classify(row: any): CanonicalTransactionClass {
  const detailed = String(row.plaid_detailed_category ?? row.personal_finance_category_detailed ?? "").toLowerCase();
  const primary = String(row.plaid_primary_category ?? row.personal_finance_category_primary ?? "").toLowerCase();
  if (detailed.includes("transfer") || primary.includes("transfer")) return "transfer";
  if (detailed.includes("loan") || detailed.includes("credit card") || detailed.includes("debt")) return "debt_payment";
  if (detailed.includes("fee") || primary.includes("fee")) return "fee";
  if (detailed.includes("refund") || primary.includes("refund")) return "refund";
  if (detailed.includes("income") || primary.includes("income")) return "income";
  if (detailed.includes("withdrawal") || detailed.includes("cash withdrawal")) return "withdrawal";
  if (Number(row.amount) > 0) return "purchase";
  return "unknown";
}

export async function getCanonicalTransactions(userId: string, since?: string): Promise<CanonicalTransaction[]> {
  let query = supabase
    .from("transactions")
    .select("id, amount, posted_date, plaid_primary_category, plaid_detailed_category, evidence_state, merchant:merchants(canonical_name), subdomain:spending_subdomains(name), domain:spending_domains(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_pending", false)
    .order("posted_date", { ascending: false });
  if (since) query = query.gte("posted_date", since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    amount: Number(row.amount),
    posted_date: row.posted_date,
    transaction_class: classify(row),
    classification_evidence: row.evidence_state === "observed" ? "observed" : "calculated",
    plaid_primary_category: row.plaid_primary_category,
    plaid_detailed_category: row.plaid_detailed_category,
    merchant: Array.isArray(row.merchant) ? row.merchant[0]?.canonical_name ?? null : row.merchant?.canonical_name ?? null,
    subdomain: Array.isArray(row.subdomain) ? row.subdomain[0]?.name ?? null : row.subdomain?.name ?? null,
    domain: Array.isArray(row.domain) ? row.domain[0]?.name ?? null : row.domain?.name ?? null,
  }));
}

export function isEconomicInflow(tx: CanonicalTransaction): boolean {
  return tx.amount < 0 && INFLOW_CLASSES.has(tx.transaction_class);
}

export function isEconomicOutflow(tx: CanonicalTransaction): boolean {
  return tx.amount > 0 && OUTFLOW_CLASSES.has(tx.transaction_class);
}

export function isEligibleRoundup(tx: CanonicalTransaction): boolean {
  return tx.amount > 0 && tx.amount < 800 && PURCHASE_CLASSES.has(tx.transaction_class);
}

export function roundupAmount(amount: number): number {
  if (amount <= 0 || amount >= 800) return 0;
  return Math.ceil(amount) - amount;
}

export function computeEconomicCashFlow(transactions: CanonicalTransaction[]) {
  const inflow = transactions.filter(isEconomicInflow).reduce((s, t) => s + Math.abs(t.amount), 0);
  const outflow = transactions.filter(isEconomicOutflow).reduce((s, t) => s + t.amount, 0);
  return { inflow, outflow, net: inflow - outflow };
}

export function computeRoundupProjectionFromTransactions(transactions: CanonicalTransaction[]) {
  const eligible = transactions.filter(isEligibleRoundup);
  const total = eligible.reduce((s, t) => s + roundupAmount(t.amount), 0);
  return { eligible_count: eligible.length, total, average: eligible.length ? total / eligible.length : 0, evidence_state: "calculated" as EvidenceState };
}

export function computeSpendingByDomainFromTransactions(transactions: CanonicalTransaction[]) {
  const map = new Map<string, number>();
  for (const tx of transactions.filter(isEconomicOutflow)) {
    const key = tx.domain ?? "Unclassified";
    map.set(key, (map.get(key) ?? 0) + tx.amount);
  }
  return [...map.entries()].map(([domain, amount]) => ({ domain, amount })).sort((a, b) => b.amount - a.amount);
}

export function computeCanonicalSpendingHierarchy(transactions: CanonicalTransaction[]) {
  const economic = transactions.filter(isEconomicOutflow);
  const categories = new Map<string, number>();
  const merchants = new Map<string, number>();
  for (const tx of economic) {
    const category = tx.domain ?? tx.subdomain ?? "Unclassified";
    categories.set(category, (categories.get(category) ?? 0) + tx.amount);
    const merchant = tx.merchant ?? "Unknown merchant";
    merchants.set(merchant, (merchants.get(merchant) ?? 0) + tx.amount);
  }
  return {
    evidence_state: "calculated" as EvidenceState,
    total: economic.reduce((s, t) => s + t.amount, 0),
    categories: [...categories.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    merchants: [...merchants.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
  };
}

export async function computeCanonicalForwardProjection(userId: string, days = 30) {
  const { data: checkingAccounts, error: accountError } = await supabase
    .from("accounts")
    .select("available_balance")
    .eq("user_id", userId)
    .eq("is_active", true)
    .ilike("type", "%checking%");
  if (accountError) throw accountError;
  if (!checkingAccounts?.length) return { series: [], basis: "no_checking_balance", evidence_state: "insufficient_evidence" as const, limitations: ["No observed checking available balance."] };
  const startBalance = checkingAccounts.reduce((sum, a) => sum + Number(a.available_balance), 0);
  const { data: series, error: seriesError } = await supabase
    .from("recurring_series")
    .select("next_expected_date, typical_amount, occurrence_count, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("classification", "essential")
    .gte("occurrence_count", 2);
  if (seriesError) throw seriesError;
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
  return {
    series: projected,
    basis: "observed checking balance plus repeated essential obligations",
    evidence_state: "calculated" as const,
    limitations: ["Projection does not invent income or discretionary spending.", ...(observedSeriesCount ? [] : ["No repeated essential obligations were observed."])],
  };
}

export function computeCanonicalWindowFlows(transactions: CanonicalTransaction[], startDate?: string, endDate?: string) {
  const scoped = transactions.filter(tx => (!startDate || tx.posted_date >= startDate) && (!endDate || tx.posted_date <= endDate));
  return computeEconomicCashFlow(scoped);
}
