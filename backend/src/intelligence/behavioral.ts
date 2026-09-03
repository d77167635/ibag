import { supabaseAdmin } from "../config/supabase.js";

/**
 * LAYER 5/6 — BEHAVIORAL & PATTERN INTELLIGENCE
 *
 * Prior state: computeSpendingByDomain() in services/intelligence.ts
 * compared a window only to the immediately preceding window of equal
 * length (e.g. this 30 days vs the prior 30 days). That answers "did
 * this category go up last month" but not "is this category actually
 * unusual for this person" — a category that's up 20% two months running
 * has a new baseline, not an anomaly, and the old two-window comparison
 * cannot tell those apart.
 *
 * This module compares a short recent window against a longer BASELINE
 * window per spending subdomain, and requires a minimum transaction count
 * in the baseline before calling anything meaningful — a category with
 * one baseline transaction has no real average to deviate from.
 */

const MIN_BASELINE_TRANSACTIONS = 3;
const SIGNIFICANT_DEVIATION_PCT = 25; // stated threshold, not statistically derived

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

export async function computeCategoryDrift(
  userId: string,
  recentDays = 30,
  baselineDays = 90
): Promise<CategoryDrift[]> {
  const baselineStart = new Date(Date.now() - baselineDays * 86_400_000).toISOString().slice(0, 10);
  const recentStart = new Date(Date.now() - recentDays * 86_400_000).toISOString().slice(0, 10);

  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date, subdomains(key, label)")
    .eq("user_id", userId)
    .eq("pending", false)
    .gt("amount", 0) // outflows only — drift is a spending-behavior concept
    .gte("posted_date", baselineStart);

  if (error) throw error;
  if (!txs || txs.length === 0) return [];

  type Row = { key: string; label: string; amount: number; date: string };
  const bySubdomain = new Map<string, Row[]>();

  for (const tx of txs as any[]) {
    const sd = tx.subdomains;
    const key = sd?.key ?? "uncategorized";
    const label = sd?.label ?? "Uncategorized";
    const list = bySubdomain.get(key) ?? [];
    list.push({ key, label, amount: Number(tx.amount), date: tx.posted_date });
    bySubdomain.set(key, list);
  }

  const results: CategoryDrift[] = [];

  for (const [key, rows] of bySubdomain) {
    const baselineRows = rows; // already filtered to >= baselineStart
    const recentRows = rows.filter((r) => r.date >= recentStart);

    if (baselineRows.length < MIN_BASELINE_TRANSACTIONS) {
      results.push({
        subdomainKey: key,
        subdomainLabel: rows[0].label,
        recentDailyAvg: 0,
        baselineDailyAvg: 0,
        deviationPct: 0,
        significant: false,
        evidence: "insufficient_evidence",
        baselineTransactionCount: baselineRows.length,
      });
      continue;
    }

    const baselineTotal = baselineRows.reduce((s, r) => s + r.amount, 0);
    const recentTotal = recentRows.reduce((s, r) => s + r.amount, 0);
    const baselineDailyAvg = baselineTotal / baselineDays;
    const recentDailyAvg = recentTotal / recentDays;

    const deviationPct =
      baselineDailyAvg > 0 ? ((recentDailyAvg - baselineDailyAvg) / baselineDailyAvg) * 100 : 0;

    results.push({
      subdomainKey: key,
      subdomainLabel: rows[0].label,
      recentDailyAvg,
      baselineDailyAvg,
      deviationPct,
      significant: Math.abs(deviationPct) >= SIGNIFICANT_DEVIATION_PCT,
      evidence: "calculated",
      baselineTransactionCount: baselineRows.length,
    });
  }

  return results.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}
