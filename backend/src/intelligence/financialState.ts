import type { EvidenceGraph, EvidenceNode } from "./evidenceGraph.js";
import type { UncertaintyAssessment } from "./uncertainty.js";

export type FinancialState = "stable" | "liquidity_pressure" | "cash_flow_pressure" | "debt_pressure" | "spending_pressure" | "improving" | "deteriorating" | "mixed" | "insufficient_evidence";

export interface FinancialStateModel {
  architecture_version: "IRIS_FINANCIAL_STATE_V2";
  primary_state: FinancialState;
  active_states: FinancialState[];
  state_strength: number;
  dimensions: { liquidity: FinancialState; cash_flow: FinancialState; debt: FinancialState; spending: FinancialState; trajectory: FinancialState };
  drivers: Array<{ node_id: string; label: string; state: EvidenceNode["state"]; role: "driver" | "constraint" | "signal" }>;
  transitions: Array<{ from: FinancialState; to: FinancialState; trigger_nodes: string[]; evidence_state: EvidenceNode["state"] }>;
  limitations: string[];
}

function node(graph: EvidenceGraph, id: string) { return graph.nodes.find((item) => item.id === id); }
function numericValue(n: EvidenceNode | undefined): number | null { return n && typeof n.value === "number" && Number.isFinite(n.value) ? n.value : null; }
function directionOf(n: EvidenceNode | undefined): string | null {
  if (!n || typeof n.value !== "object' || n.value === null || !("direction" in n.value)) return null;
  return String((n.value as any).direction);
}

/** Converts canonical evidence into a typed financial state without inventing provider facts. */
export function buildFinancialStateModel(graph: EvidenceGraph, uncertainty: UncertaintyAssessment): FinancialStateModel {
  const cash = node(graph, "cash_flow_net");
  const liquid = node(graph, "liquid_assets");
  const safe = node(graph, "safe_to_spend");
  const debt = node(graph, "revolving_debt");
  const utilization = node(graph, "credit_utilization");
  const debtCost = node(graph, "debt_cost");
  const trajectory = node(graph, "trajectory");
  const anomalies = node(graph, "anomalies");

  const cashValue = numericValue(cash);
  const safeValue = numericValue(safe);
  const debtValue = numericValue(debt);
  const utilizationValue = numericValue(utilization);
  const anomalyCount = numericValue(anomalies);

  const liquidity: FinancialState = safeValue !== null
    ? (safeValue < 0 ? "liquidity_pressure" : "stable")
    : numericValue(liquid) !== null ? "stable" : "insufficient_evidence";

  const cashFlow: FinancialState = cashValue !== null ? (cashValue < 0 ? "cash_flow_pressure" : "stable") : "insufficient_evidence";

  // Debt balance alone establishes debt existence, not pressure. Pressure is
  // classified only when a real utilization signal is available. The 30%
  // threshold is an Iris heuristic, not a provider assertion.
  const debtState: FinancialState = debtValue === null
    ? "insufficient_evidence"
    : debtValue === 0
      ? "stable"
      : utilizationValue === null
        ? "insufficient_evidence"
        : utilizationValue >= 0.30
          ? "debt_pressure"
          : "stable";

  // An anomaly is a signal, not financial pressure by itself. Iris only labels
  // spending pressure when anomalous spending coincides with an independently
  // evidenced liquidity or cash-flow constraint.
  const spending: FinancialState = anomalies
    ? (anomalies.state === "insufficient_evidence"
      ? "insufficient_evidence"
      : anomalyCount !== null && anomalyCount > 0
        ? (safeValue !== null && safeValue < 0) || (cashValue !== null && cashValue < 0)
          ? "spending_pressure"
          : "stable"
        : "stable")
    : "insufficient_evidence";

  const direction = directionOf(trajectory);
  const trajectoryState: FinancialState = !trajectory || trajectory.state === "insufficient_evidence" || trajectory.state === "limited"
    ? "insufficient_evidence"
    : (trajectory.state === "inferred" || trajectory.state === "calculated")
      ? direction === "decelerating" ? "improving" : direction === "accelerating" ? "deteriorating" : "mixed"
      : "stable";

  const dimensions = { liquidity, cash_flow: cashFlow, debt: debtState, spending, trajectory: trajectoryState };
  const nonStable = Object.values(dimensions).filter((state) => state !== "stable" && state !== "insufficient_evidence") as FinancialState[];
  const uniqueActive = [...new Set(nonStable)];
  const hasInsufficient = Object.values(dimensions).includes("insufficient_evidence");
  const primary: FinancialState = uniqueActive.length > 1 ? "mixed" : uniqueActive.length === 1 ? uniqueActive[0] : hasInsufficient ? "insufficient_evidence" : "stable";

  const drivers = graph.nodes
    .filter((n) => ["cash_flow_net", "safe_to_spend", "liquid_assets", "revolving_debt", "credit_utilization", "debt_cost", "trajectory", "anomalies"].includes(n.id))
    .map((n) => ({ node_id: n.id, label: n.label, state: n.state, role: n.id === "debt_cost" || n.id === "safe_to_spend" || n.id === "revolving_debt" ? "constraint" as const : n.state === "inferred" ? "signal" as const : "driver" as const }));

  const transitions: FinancialStateModel["transitions"] = [];
  if (trajectory && ["inferred", "calculated"].includes(trajectory.state)) {
    if (direction === "accelerating") transitions.push({ from: "stable", to: "deteriorating", trigger_nodes: ["trajectory"], evidence_state: trajectory.state });
    if (direction === "decelerating") transitions.push({ from: "stable", to: "improving", trigger_nodes: ["trajectory"], evidence_state: trajectory.state });
  }
  if (cash?.state === "calculated" && cashValue !== null && cashValue < 0) transitions.push({ from: "stable", to: "cash_flow_pressure", trigger_nodes: ["cash_flow_net"], evidence_state: cash.state });
  if (safe?.state === "calculated" && safeValue !== null && safeValue < 0) transitions.push({ from: "stable", to: "liquidity_pressure", trigger_nodes: ["safe_to_spend"], evidence_state: safe.state });
  if (debt?.state === "observed" && debtValue !== null && debtValue > 0 && utilizationValue !== null && utilizationValue >= 0.30) transitions.push({ from: "stable", to: "debt_pressure", trigger_nodes: ["revolving_debt", "credit_utilization"], evidence_state: utilization?.state ?? debt.state });
  if (anomalies?.state === "calculated" && anomalyCount !== null && anomalyCount > 0 && ((safeValue !== null && safeValue < 0) || (cashValue !== null && cashValue < 0))) transitions.push({ from: "stable", to: "spending_pressure", trigger_nodes: ["anomalies", ...(safeValue !== null && safeValue < 0 ? ["safe_to_spend"] : ["cash_flow_net"])], evidence_state: anomalies.state });

  const limitations = [...new Set([
    ...uncertainty.known_unknowns,
    ...uncertainty.blocked_conclusions,
    ...(debtValue !== null && debtValue > 0 && utilizationValue === null ? ["Revolving debt exists, but utilization evidence is unavailable; Iris does not label the balance itself as debt pressure."] : []),
    ...(debtValue !== null && debtValue > 0 && utilizationValue !== null ? ["Debt pressure uses a 30% utilization threshold as an Iris heuristic; it is not a provider-defined risk boundary."] : []),
    ...(anomalyCount !== null && anomalyCount > 0 && spending === "stable" ? ["Anomalous spending was detected, but Iris did not classify it as spending pressure because no independent liquidity or cash-flow constraint was evidenced."] : []),
    ...(debtCost?.state === "insufficient_evidence" ? ["Debt-cost pressure could not be established from available liability evidence."] : []),
  ])];

  return {
    architecture_version: "IRIS_FINANCIAL_STATE_V2",
    primary_state: primary,
    active_states: uniqueActive.length ? uniqueActive : [primary],
    state_strength: Number(uncertainty.evidence_strength.toFixed(3)),
    dimensions,
    drivers,
    transitions,
    limitations,
  };
}
