import type { CanonicalTransaction } from "./transactionSemantics.js";

export type DebtPaymentIntelligence = {
  evidence_state: "calculated" | "insufficient_evidence";
  transaction_count: number;
  total_observed_debt_payments: number | null;
  payment_sources: Array<{
    key: string;
    label: string;
    transaction_count: number;
    total_observed_payments: number;
    share_of_observed_payments: number | null;
    median_amount: number | null;
    amount_mad: number | null;
  }>;
  cadence: {
    observation_count: number;
    median_gap_days: number | null;
    gap_mad_days: number | null;
    regularity: "high" | "moderate" | "limited" | "insufficient_evidence";
    modeled_next_date: string | null;
  };
  trend: {
    early_average_amount: number | null;
    recent_average_amount: number | null;
    change_ratio: number | null;
    direction: "increasing" | "decreasing" | "stable" | "insufficient_evidence";
  };
  limitations: string[];
};

function round(value: number): number { return Number(value.toFixed(6)); }
function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
function mad(values: number[], center: number | null): number | null {
  return center === null ? null : median(values.map(value => Math.abs(value - center)));
}
function gapDays(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}
function nextDate(last: string, gap: number | null): string | null {
  if (gap === null || !Number.isFinite(gap) || gap <= 0) return null;
  const date = new Date(`${last}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.round(gap));
  return date.toISOString().slice(0, 10);
}

export function buildDebtPaymentIntelligence(transactions: CanonicalTransaction[]): DebtPaymentIntelligence {
  const payments = transactions
    .filter(tx => tx.transaction_class === "debt_payment" && tx.amount > 0 && Number.isFinite(tx.amount) && Boolean(tx.posted_date));

  if (!payments.length) {
    return {
      evidence_state: "insufficient_evidence",
      transaction_count: 0,
      total_observed_debt_payments: null,
      payment_sources: [],
      cadence: { observation_count: 0, median_gap_days: null, gap_mad_days: null, regularity: "insufficient_evidence", modeled_next_date: null },
      trend: { early_average_amount: null, recent_average_amount: null, change_ratio: null, direction: "insufficient_evidence" },
      limitations: ["No canonical debt-payment outflow observations are available in the supplied evidence set.", "Debt payment observations do not establish outstanding balance, APR, minimum payment, due date, or payoff date."],
    };
  }

  const total = payments.reduce((sum, tx) => sum + tx.amount, 0);
  const sourceMap = new Map<string, { label: string; amounts: number[] }>();
  for (const tx of payments) {
    const source = tx.merchant_id ?? tx.merchant_name ?? tx.account_id;
    const key = `debt_payment:${source}`;
    const current = sourceMap.get(key) ?? { label: tx.merchant_name ?? tx.account_id, amounts: [] };
    current.amounts.push(tx.amount);
    sourceMap.set(key, current);
  }

  const paymentSources = [...sourceMap.entries()].map(([key, value]) => {
    const center = median(value.amounts);
    return {
      key,
      label: value.label,
      transaction_count: value.amounts.length,
      total_observed_payments: round(value.amounts.reduce((sum, amount) => sum + amount, 0)),
      share_of_observed_payments: total > 0 ? round(value.amounts.reduce((sum, amount) => sum + amount, 0) / total) : null,
      median_amount: center === null ? null : round(center),
      amount_mad: mad(value.amounts, center) === null ? null : round(mad(value.amounts, center)!),
    };
  }).sort((a, b) => b.total_observed_payments - a.total_observed_payments).slice(0, 50);

  const ordered = [...payments].sort((a, b) => a.posted_date.localeCompare(b.posted_date));
  const dates = [...new Set(ordered.map(tx => tx.posted_date))];
  const gaps = dates.slice(1).map((date, index) => gapDays(dates[index], date));
  const medianGap = median(gaps);
  const gapMad = mad(gaps, medianGap);
  const regularity = dates.length < 2
    ? dates.length === 1 ? "limited" : "insufficient_evidence"
    : gapMad !== null && gapMad <= 3 ? "high" : gapMad !== null && gapMad <= 7 ? "moderate" : "limited";

  const split = Math.max(1, Math.floor(ordered.length / 2));
  const early = ordered.slice(0, split).map(tx => tx.amount);
  const recent = ordered.slice(-split).map(tx => tx.amount);
  const earlyAverage = early.reduce((sum, amount) => sum + amount, 0) / early.length;
  const recentAverage = recent.reduce((sum, amount) => sum + amount, 0) / recent.length;
  const changeRatio = earlyAverage !== 0 ? round((recentAverage - earlyAverage) / earlyAverage) : null;
  const direction = ordered.length < 4 || changeRatio === null
    ? "insufficient_evidence"
    : changeRatio > 0.1 ? "increasing" : changeRatio < -0.1 ? "decreasing" : "stable";

  return {
    evidence_state: "calculated",
    transaction_count: payments.length,
    total_observed_debt_payments: round(total),
    payment_sources: paymentSources,
    cadence: {
      observation_count: dates.length,
      median_gap_days: medianGap === null ? null : round(medianGap),
      gap_mad_days: gapMad === null ? null : round(gapMad),
      regularity,
      modeled_next_date: nextDate(dates.at(-1)!, medianGap),
    },
    trend: {
      early_average_amount: round(earlyAverage),
      recent_average_amount: round(recentAverage),
      change_ratio: changeRatio,
      direction,
    },
    limitations: [
      "Debt-payment intelligence is calculated only from observed debt-payment transactions.",
      "It does not infer outstanding debt, APR, minimum payment, due date, utilization, payoff date, or whether a payment is sufficient.",
      "A recurring payment date is a modeled timing estimate, not a verified contractual due date or guarantee of future occurrence.",
    ],
  };
}
