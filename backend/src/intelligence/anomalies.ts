import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";
import { buildAdaptiveBaseline, isRobustOutlier, round } from "./statisticalPrimitives.js";

export const IRIS_ANOMALY_INTELLIGENCE_V2 = "IRIS_ANOMALY_INTELLIGENCE_V2" as const;

export interface IrisAnomaly {
  merchant: string;
  amount: number;
  typicalAmount: number;
  date: string;
  pctAboveTypical: number;
  evidence_state: "calculated";
  rule: "merchant_relative_robust_mad";
  history_count: number;
  modified_z: number | null;
  baseline_status: "established" | "limited" | "insufficient_evidence";
}

/** Merchant-relative robust anomaly detection over canonical transactions. A run ID makes the calculation exact-run bounded. */
export async function computeCanonicalAnomalies(userId: string, windowDays = 30, evidenceBoundary?: string | null, runId?: string | null, asOf?: string | null): Promise<IrisAnomaly[]> {
  const anchor = asOf ? new Date(asOf) : evidenceBoundary ? new Date(evidenceBoundary) : new Date();
  const safeAnchor = Number.isFinite(anchor.getTime()) ? anchor : new Date();
  const windowStart = new Date(safeAnchor.getTime() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const historicalStart = new Date(safeAnchor.getTime() - Math.max(windowDays * 6, 365) * 86_400_000).toISOString().slice(0, 10);
  const boundary = evidenceBoundary ?? asOf ?? null;
  const txs = await getCanonicalTransactions(userId, historicalStart, boundary, runId ?? null);
  const economic = txs.filter(isEconomicOutflow);
  const recent = economic.filter(tx => tx.posted_date >= windowStart && tx.merchant_id);
  if (!recent.length) return [];

  const byMerchant = new Map<string, typeof economic>();
  for (const tx of economic) {
    if (!tx.merchant_id) continue;
    const rows = byMerchant.get(tx.merchant_id) ?? [];
    rows.push(tx);
    byMerchant.set(tx.merchant_id, rows);
  }

  const anomalies: IrisAnomaly[] = [];
  for (const tx of recent) {
    const baselineRows = (byMerchant.get(tx.merchant_id!) ?? []).filter(h => h.id !== tx.id && h.posted_date < tx.posted_date);
    const baseline = buildAdaptiveBaseline(baselineRows.map(h => h.amount), null);
    if (baseline.status !== "established" || baseline.center === null) continue;
    if (!isRobustOutlier(tx.amount, baseline, 3.5)) continue;
    const typicalAmount = baseline.center;
    if (typicalAmount <= 0 || !Number.isFinite(tx.amount)) continue;
    anomalies.push({
      merchant: tx.merchant_name ?? "Unknown",
      amount: round(tx.amount),
      typicalAmount: round(typicalAmount),
      date: tx.posted_date,
      pctAboveTypical: round(((tx.amount - typicalAmount) / typicalAmount) * 100),
      evidence_state: "calculated",
      rule: "merchant_relative_robust_mad",
      history_count: baseline.sampleSize,
      modified_z: baseline.modifiedZ,
      baseline_status: baseline.status,
    });
  }
  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}
