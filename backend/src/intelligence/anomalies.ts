import { supabaseAdmin } from "../config/supabase.js";
import { isEconomicOutflow } from "./transactionSemantics.js";

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

/**
 * Merchant-relative anomaly detection over canonical economic outflows only.
 * Transfers, unknown movements, refunds/credits and other non-economic
 * movements cannot become spending anomalies merely because their amount is
 * positive. A minimum two-point historical baseline is required.
 */
export async function computeCanonicalAnomalies(userId: string, windowDays = 30): Promise<IrisAnomaly[]> {
  const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, posted_date, merchant_id, transaction_class, classification_evidence, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("pending", false)
    .gte("posted_date", windowStart)
    .not("merchant_id", "is", null);

  if (error) throw error;
  const recent = (data ?? []).filter((tx: any) => isEconomicOutflow(tx));
  if (!recent.length) return [];

  const merchantIds = [...new Set(recent.map((tx: any) => tx.merchant_id).filter(Boolean))];
  const { data: history, error: historyError } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, merchant_id, transaction_class, classification_evidence")
    .eq("user_id", userId)
    .eq("pending", false)
    .in("merchant_id", merchantIds)
    .lt("posted_date", windowStart);

  if (historyError) throw historyError;

  const byMerchant = new Map<string, number[]>();
  for (const tx of history ?? []) {
    if (!isEconomicOutflow(tx)) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const values = byMerchant.get(tx.merchant_id) ?? [];
    values.push(amount);
    byMerchant.set(tx.merchant_id, values);
  }

  const anomalies: IrisAnomaly[] = [];
  for (const tx of recent as any[]) {
    const baseline = byMerchant.get(tx.merchant_id) ?? [];
    if (baseline.length < 2) continue;
    const amount = Number(tx.amount);
    const typicalAmount = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
    if (!Number.isFinite(amount) || !Number.isFinite(typicalAmount) || typicalAmount <= 0) continue;
    if (amount < typicalAmount * 1.5) continue;

    anomalies.push({
      merchant: tx.merchants?.canonical_name ?? "Unknown",
      amount,
      typicalAmount,
      date: tx.posted_date,
      pctAboveTypical: ((amount - typicalAmount) / typicalAmount) * 100,
      evidence_state: "calculated",
      rule: "merchant_relative_50_percent_above_historical_average",
      history_count: baseline.length,
    });
  }

  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}
