import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

export const IRIS_ANOMALY_INTELLIGENCE_V2 = "IRIS_ANOMALY_INTELLIGENCE_V2" as const;
const MIN_BASELINE_TRANSACTIONS = 5;
const QUANTILE = 0.90;
const MAD_MULTIPLIER = 3;

export interface IrisAnomaly {
  merchant: string;
  amount: number;
  typicalAmount: number;
  thresholdAmount: number;
  date: string;
  pctAboveTypical: number;
  robustScore: number;
  evidence_state: "calculated";
  rule: "merchant_adaptive_quantile_mad";
  history_count: number;
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function median(values: number[]): number { return quantile(values, 0.5); }

function medianAbsoluteDeviation(values: number[], center: number): number {
  return median(values.map(value => Math.abs(value - center)));
}

/** Merchant-relative anomaly detection using adaptive empirical quantiles and robust dispersion. */
export async function computeCanonicalAnomalies(userId: string, windowDays = 30, asOf?: string | Date | null): Promise<IrisAnomaly[]> {
  const anchor = asOf ? new Date(asOf) : new Date();
  const anchorDate = anchor.toISOString().slice(0, 10);
  const windowStart = new Date(anchor.getTime() - windowDays * 86_400_000).toISOString().slice(0, 10);
  const txs = await getCanonicalTransactions(userId);
  const economic = txs.filter(isEconomicOutflow).filter(tx => tx.posted_date <= anchorDate);
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
    const baseline = (byMerchant.get(tx.merchant_id!) ?? []).filter(h => h.id !== tx.id).map(h => h.amount).filter(Number.isFinite);
    if (baseline.length < MIN_BASELINE_TRANSACTIONS) continue;
    const typicalAmount = median(baseline);
    const q90 = quantile(baseline, QUANTILE);
    const mad = medianAbsoluteDeviation(baseline, typicalAmount);
    const robustThreshold = typicalAmount + MAD_MULTIPLIER * mad;
    const thresholdAmount = Math.max(q90, robustThreshold);
    if (!Number.isFinite(tx.amount) || !Number.isFinite(typicalAmount) || !Number.isFinite(thresholdAmount) || thresholdAmount <= 0) continue;
    if (tx.amount <= thresholdAmount) continue;
    const robustScore = mad > 0 ? (tx.amount - typicalAmount) / (1.4826 * mad) : (tx.amount - typicalAmount) / Math.max(Math.abs(typicalAmount), Number.EPSILON);
    anomalies.push({ merchant: tx.merchant_name ?? "Unknown", amount: tx.amount, typicalAmount, thresholdAmount, date: tx.posted_date, pctAboveTypical: typicalAmount > 0 ? ((tx.amount - typicalAmount) / typicalAmount) * 100 : 0, robustScore, evidence_state: "calculated", rule: "merchant_adaptive_quantile_mad", history_count: baseline.length });
  }
  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}
