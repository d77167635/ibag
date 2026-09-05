import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

const MIN_BASELINE_TRANSACTIONS = 3;
const SIGNIFICANT_DEVIATION_PCT = 25;

export interface CategoryDrift {
  subdomainKey: string;
  subdomainLabel: string;
  recentDailyAvg: number;
  baselineDailyAvg: number;
  deviationPct: number;
  significant: boolean;
  evidence: "calculated" | "insufficient_evidence";
  baselineTransactionCount: number;
}

/** LAYER 5/6 — spending behavior excludes transfers and other non-economic movements. */
export async function computeCategoryDrift(userId: string, recentDays = 30, baselineDays = 90): Promise<CategoryDrift[]> {
  const baselineStart = new Date(Date.now() - baselineDays * 86_400_000).toISOString().slice(0, 10);
  const recentStart = new Date(Date.now() - recentDays * 86_400_000).toISOString().slice(0, 10);
  const txs = await getCanonicalTransactions(userId, baselineStart);
  const rows = txs.filter(isEconomicOutflow);
  if (!rows.length) return [];

  const bySubdomain = new Map<string, typeof rows>();
  for (const tx of rows) {
    const key = tx.subdomain?.key ?? "uncategorized";
    const list = bySubdomain.get(key) ?? [];
    list.push(tx);
    bySubdomain.set(key, list);
  }

  const results: CategoryDrift[] = [];
  for (const [key, categoryRows] of bySubdomain) {
    const recentRows = categoryRows.filter(r => r.posted_date >= recentStart);
    if (categoryRows.length < MIN_BASELINE_TRANSACTIONS) {
      results.push({ subdomainKey: key, subdomainLabel: categoryRows[0].subdomain?.label ?? "Uncategorized", recentDailyAvg: 0, baselineDailyAvg: 0, deviationPct: 0, significant: false, evidence: "insufficient_evidence", baselineTransactionCount: categoryRows.length });
      continue;
    }
    const baselineTotal = categoryRows.reduce((s, r) => s + r.amount, 0);
    const recentTotal = recentRows.reduce((s, r) => s + r.amount, 0);
    const baselineDailyAvg = baselineTotal / baselineDays;
    const recentDailyAvg = recentTotal / recentDays;
    const deviationPct = baselineDailyAvg > 0 ? ((recentDailyAvg - baselineDailyAvg) / baselineDailyAvg) * 100 : 0;
    results.push({ subdomainKey: key, subdomainLabel: categoryRows[0].subdomain?.label ?? "Uncategorized", recentDailyAvg, baselineDailyAvg, deviationPct, significant: Math.abs(deviationPct) >= SIGNIFICANT_DEVIATION_PCT, evidence: "calculated", baselineTransactionCount: categoryRows.length });
  }
  return results.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}
