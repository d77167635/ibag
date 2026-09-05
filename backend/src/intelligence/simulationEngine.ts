import type { CanonicalTransaction } from "./transactionSemantics.js";
import { computeEconomicCashFlow, isEligibleRoundup, roundupAmount } from "./transactionSemantics.js";

export const IRIS_SIMULATION_VERSION = "IRIS_SIMULATION_V1";

export type SimulationKind =
  | "roundup"
  | "spending_reduction"
  | "income_change"
  | "budget_change"
  | "custom_cashflow";

export type SimulationRequest = {
  kind: SimulationKind;
  label?: string;
  percent?: number;
  amount?: number;
  days?: number;
};

export type SimulationResult = {
  simulation_version: string;
  mode: "simulation";
  execution_state: "not_executed";
  financial_source: "real_observed_evidence";
  hypothetical_inputs: Record<string, number | string>;
  baseline: { inflow: number; outflow: number; net: number };
  projected: { inflow: number; outflow: number; net: number; delta_net: number };
  evidence: { transaction_count: number; eligible_roundup_count: number; source_transaction_ids: string[] };
  limitations: string[];
};

function clampPercent(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, Number(value)));
}

/**
 * Simulates a change against actual canonical transactions without creating,
 * mutating, or fabricating a financial transaction. The source transaction set
 * is immutable evidence; only the requested hypothetical transformation is
 * projected.
 */
export function simulateTransactions(transactions: CanonicalTransaction[], request: SimulationRequest): SimulationResult {
  const baseline = computeEconomicCashFlow(transactions);
  let inflow = baseline.inflow;
  let outflow = baseline.outflow;
  const percent = clampPercent(request.percent);
  const amount = Number.isFinite(request.amount) ? Number(request.amount) : 0;

  if (request.kind === "roundup") {
    const eligible = transactions.filter(isEligibleRoundup);
    const roundup = eligible.reduce((sum, tx) => sum + roundupAmount(tx.amount), 0);
    outflow += roundup;
  } else if (request.kind === "spending_reduction" || request.kind === "budget_change") {
    const reduction = outflow * (percent / 100);
    outflow = Math.max(0, outflow - reduction);
  } else if (request.kind === "income_change") {
    inflow = Math.max(0, inflow * (1 + percent / 100));
  } else if (request.kind === "custom_cashflow") {
    if (amount >= 0) inflow += amount;
    else outflow += Math.abs(amount);
  }

  const projected = { inflow, outflow, net: inflow - outflow, delta_net: (inflow - outflow) - baseline.net };
  const eligible = transactions.filter(isEligibleRoundup);
  return {
    simulation_version: IRIS_SIMULATION_VERSION,
    mode: "simulation",
    execution_state: "not_executed",
    financial_source: "real_observed_evidence",
    hypothetical_inputs: {
      kind: request.kind,
      ...(request.label ? { label: request.label } : {}),
      ...(Number.isFinite(request.percent) ? { percent } : {}),
      ...(Number.isFinite(request.amount) ? { amount } : {}),
      ...(Number.isFinite(request.days) ? { days: Number(request.days) } : {}),
    },
    baseline,
    projected,
    evidence: {
      transaction_count: transactions.length,
      eligible_roundup_count: eligible.length,
      source_transaction_ids: transactions.map(tx => tx.id),
    },
    limitations: [
      "Simulation does not move money or change provider state.",
      "Simulation is bounded by the supplied canonical evidence and cannot establish facts that are absent from that evidence.",
      "Projected outcomes are hypothetical and must never be represented as completed financial actions.",
    ],
  };
}

export function assertSimulationIntegrity(result: SimulationResult) {
  if (result.mode !== "simulation") throw new Error("Simulation integrity failure: invalid mode.");
  if (result.execution_state !== "not_executed") throw new Error("Simulation integrity failure: execution state is not simulated-only.");
  if (result.financial_source !== "real_observed_evidence") throw new Error("Simulation integrity failure: source is not observed evidence.");
  if (result.evidence.source_transaction_ids.some(id => !id)) throw new Error("Simulation integrity failure: missing source transaction lineage.");
  return true;
}
