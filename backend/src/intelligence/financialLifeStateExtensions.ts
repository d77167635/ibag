import type { CanonicalTransaction } from "./transactionSemantics.js";

export type IncomeIntelligence = {
  evidence_state: "calculated" | "insufficient_evidence";
  transaction_count: number;
  total_observed_income: number | null;
  active_income_days: number;
  income_sources: Array<{
    key: string;
    label: string;
    transaction_count: number;
    total_observed_income: number;
    share_of_observed_income: number | null;
  }>;
  limitation: string | null;
};

export type RecurrenceCandidate = {
  key: string;
  merchant: string | null;
  transaction_class: string;
  occurrences: number;
  median_gap_days: number | null;
  gap_mad_days: number | null;
  median_amount: number;
  amount_mad: number;
  regularity: "high" | "moderate" | "limited";
  evidence: "calculated";
  interpretation: string;
};

export type RecurrenceIntelligence = {
  evidence_state: "calculated" | "insufficient_evidence";
  candidate_count: number;
  candidates: RecurrenceCandidate[];
  limitation: string | null;
};

function round(value: number): number {
  return Number(value.toFixed(6));
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function mad(values: number[], center: number | null): number | null {
  if (center === null) return null;
  return median(values.map(value => Math.abs(value - center)));
}

function dateDistanceDays(left: string, right: string): number {
  return Math.round((new Date(`${right}T00:00:00Z`).getTime() - new Date(`${left}T00:00:00Z`).getTime()) / 86_400_000);
}

export function buildIncomeIntelligence(transactions: CanonicalTransaction[]): IncomeIntelligence {
  const income = transactions.filter(tx => tx.transaction_class === "income" && tx.amount < 0 && Number.isFinite(tx.amount) && Boolean(tx.posted_date));
  if (!income.length) {
    return {
      evidence_state: "insufficient_evidence",
      transaction_count: 0,
      total_observed_income: null,
      active_income_days: 0,
      income_sources: [],
      limitation: "No canonical income-classified inflow observations are available in the supplied evidence set.",
    };
  }

  const sourceMap = new Map<string, { label: string; count: number; total: number }>();
  const dates = new Set<string>();
  let total = 0;
  for (const tx of income) {
    const amount = Math.abs(tx.amount);
    total += amount;
    dates.add(tx.posted_date);
    const key = tx.merchant_id ?? tx.merchant_name ?? "unresolved_income_source";
    const current = sourceMap.get(key) ?? { label: tx.merchant_name ?? "Unresolved income source", count: 0, total: 0 };
    current.count += 1;
    current.total += amount;
    sourceMap.set(key, current);
  }

  const incomeSources = [...sourceMap.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      transaction_count: value.count,
      total_observed_income: round(value.total),
      share_of_observed_income: total > 0 ? round(value.total / total) : null,
    }))
    .sort((a, b) => b.total_observed_income - a.total_observed_income);

  return {
    evidence_state: "calculated",
    transaction_count: income.length,
    total_observed_income: round(total),
    active_income_days: dates.size,
    income_sources: incomeSources.slice(0, 50),
    limitation: "Income totals describe observed income-classified transactions; they do not establish salary, permanence, sufficiency, or future income.",
  };
}

export function buildRecurrenceIntelligence(transactions: CanonicalTransaction[]): RecurrenceIntelligence {
  const candidatesByKey = new Map<string, CanonicalTransaction[]>();
  for (const tx of transactions) {
    if (!Number.isFinite(tx.amount) || !tx.posted_date || !["purchase", "debt_payment", "income"].includes(tx.transaction_class)) continue;
    const merchantKey = tx.merchant_id ?? tx.merchant_name ?? "unresolved_entity";
    const key = `${tx.transaction_class}:${merchantKey}`;
    const list = candidatesByKey.get(key) ?? [];
    list.push(tx);
    candidatesByKey.set(key, list);
  }

  const candidates: RecurrenceCandidate[] = [];
  for (const [key, rows] of candidatesByKey) {
    if (rows.length < 3) continue;
    const ordered = [...rows].sort((a, b) => a.posted_date.localeCompare(b.posted_date));
    const gaps = ordered.slice(1).map((row, index) => dateDistanceDays(ordered[index].posted_date, row.posted_date));
    const medianGap = median(gaps);
    const gapMad = mad(gaps, medianGap);
    const amounts = ordered.map(row => Math.abs(row.amount));
    const medianAmount = median(amounts) ?? 0;
    const amountMad = mad(amounts, medianAmount) ?? 0;
    if (medianGap === null || medianGap < 7 || medianGap > 62) continue;

    const gapDeviation = gapMad === null ? Infinity : gapMad;
    const regularity = gapDeviation <= 3 ? "high" : gapDeviation <= 7 ? "moderate" : "limited";
    candidates.push({
      key,
      merchant: ordered[0].merchant_name ?? ordered[0].merchant_id ?? null,
      transaction_class: ordered[0].transaction_class,
      occurrences: ordered.length,
      median_gap_days: round(medianGap),
      gap_mad_days: round(gapDeviation === Infinity ? 0 : gapDeviation),
      median_amount: round(medianAmount),
      amount_mad: round(amountMad),
      regularity,
      evidence: "calculated",
      interpretation: "Repeated observed transactions with a recurring interval are a recurrence candidate only; recurrence does not establish a contractual obligation, essential status, intent, or future occurrence.",
    });
  }

  candidates.sort((a, b) => b.occurrences - a.occurrences || (b.median_amount - a.median_amount));
  return {
    evidence_state: candidates.length ? "calculated" : "insufficient_evidence",
    candidate_count: candidates.length,
    candidates: candidates.slice(0, 100),
    limitation: candidates.length ? null : "At least three repeated observations with a plausible recurring interval are required to identify a recurrence candidate.",
  };
}
