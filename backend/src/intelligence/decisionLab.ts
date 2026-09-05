import type { CanonicalTransaction } from "./transactionSemantics.js";
import { computeEconomicCashFlow } from "./transactionSemantics.js";

export const IRIS_DECISION_LAB_VERSION = "IRIS_DECISION_LAB_V1";

export type DecisionLabRequest = {
  question?: string;
  amount?: number;
  horizon_days?: number;
};

export type DecisionLabOption = {
  id: string;
  label: string;
  action: "proceed" | "reduce_amount" | "delay" | "monitor";
  hypothetical_amount: number;
  projected_net_change: number;
  evidence_state: "calculated" | "limited" | "insufficient_evidence";
  tradeoffs: string[];
};

export type DecisionLabResult = {
  architecture_version: string;
  mode: "decision_analysis";
  financial_source: "real_observed_evidence";
  question: string;
  horizon_days: number;
  baseline: { inflow: number; outflow: number; net: number };
  options: DecisionLabOption[];
  recommendation: string;
  constraints: string[];
  uncertainty: string[];
  evidence: { transaction_count: number; source_transaction_ids: string[] };
};

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Compares reversible hypothetical choices against real canonical evidence.
 * It never creates, mutates, or executes a financial transaction.
 */
export function buildDecisionLab(transactions: CanonicalTransaction[], request: DecisionLabRequest): DecisionLabResult {
  const baseline = computeEconomicCashFlow(transactions);
  const amount = Math.max(0, safeNumber(request.amount));
  const horizon = Math.max(1, Math.min(3650, Math.round(safeNumber(request.horizon_days, 30))));
  const question = typeof request.question === "string" && request.question.trim()
    ? request.question.trim().slice(0, 500)
    : amount > 0 ? `What would spending $${amount.toFixed(2)} change?` : "What financial choice should I examine next?";

  const make = (id: string, label: string, action: DecisionLabOption["action"], hypotheticalAmount: number, state: DecisionLabOption["evidence_state"], tradeoffs: string[]): DecisionLabOption => ({
    id, label, action, hypothetical_amount: hypotheticalAmount,
    projected_net_change: -hypotheticalAmount,
    evidence_state: state, tradeoffs,
  });

  const options: DecisionLabOption[] = amount > 0 ? [
    make("proceed", "Proceed at the requested amount", "proceed", amount, "calculated", ["Reduces modeled net cash flow by the requested amount.", "Does not establish that the expense is affordable after obligations not present in the evidence."]),
    make("reduce", "Reduce the amount by 25%", "reduce_amount", amount * 0.75, "calculated", ["Preserves 25% of the hypothetical outflow.", "May not materially change the decision if the underlying pressure is larger than this amount."]),
    make("delay", "Delay and reassess", "delay", 0, "limited", ["Preserves current modeled liquidity until additional evidence is observed.", "The future cost or urgency of the decision is not known from transaction history alone."]),
  ] : [
    make("monitor", "Monitor before committing", "monitor", 0, transactions.length ? "calculated" : "insufficient_evidence", ["Preserves optionality while Iris gathers or receives additional authorized evidence."]),
  ];

  const uncertainty = [
    "This is a hypothetical analysis, not a prediction of provider behavior or future transactions.",
    "The calculation is bounded by the authorized canonical transaction evidence supplied to Iris.",
    "Future income, bills, emergencies, and transactions not yet observed may change the result.",
  ];
  const constraints = [
    "No bank, card, payment, or investment account is changed by Decision Lab.",
    "Iris must not represent a calculated scenario as an observed fact.",
    `Analysis horizon is ${horizon} days; evidence outside the supplied transaction set is not assumed.`,
  ];
  const recommendation = amount > 0
    ? "Compare the requested amount against the reduced and delayed alternatives before deciding; Iris will not call an expense affordable unless the evidence supports that conclusion."
    : "Define the decision amount or question to unlock a quantitative comparison.";

  return {
    architecture_version: IRIS_DECISION_LAB_VERSION,
    mode: "decision_analysis",
    financial_source: "real_observed_evidence",
    question,
    horizon_days: horizon,
    baseline,
    options,
    recommendation,
    constraints,
    uncertainty,
    evidence: { transaction_count: transactions.length, source_transaction_ids: transactions.map(tx => tx.id) },
  };
}
