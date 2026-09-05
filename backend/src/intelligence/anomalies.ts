import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

export const IRIS_ANOMALY_INTELLIGENCE_V1 = "IRIS_ANOMALY_INTELLIGENCE_V1" as const;

export interface IrisAnomaly {
  merchant: string;
  amount: number;
  typicalAmount: number;
  date: string;
  pctAboveTypical: number;
  evidence_state: "calculated";
  rule: "merchant_relative_50_percent_above_historical_average";
  history_count: number;
}

/** Merchant-relative anomaly detection over the canonical active transaction population. */
export async function computeCanonicalAnomalies(userId: string, windowDays = 30): Promise<IrisAnomaly[]> {
  const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const txs = await getCanonicalTransactions(userId);
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
    const baseline = (byMerchant.get(tx.merchant_id!) ?? []).filter(h => h.id !== tx.id);
    if (baseline.length < 2) continue;
    const typicalAmount = baseline.reduce((sum, h) => sum + h.amount, 0) / baseline.length;
    if (!Number.isFinite(tx.amount) || !Number.isFinite(typicalAmount) || typicalAmount <= 0) continue;
    if (tx.amount < typicalAmount * 1.5) continue;
    anomalies.push({
      merchant: tx.merchant_name ?? "Unknown",
      amount: tx.amount,
      typicalAmount,
      date: tx.posted_date,
      pctAboveTypical: ((tx.amount - typicalAmount) / typicalAmount) * 100,
      evidence_state: "calculated",
      rule: "merchant_relative_50_percent_above_historical_average",
      history_count: baseline.length,
    });
  }
  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}
