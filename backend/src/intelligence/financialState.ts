import type { EvidenceGraph, EvidenceNode } from "./evidenceGraph.js";
import type { UncertaintyAssessment } from "./uncertainty.js";

export type FinancialState =
  | "stable"
  | "liquidity_pressure"
  | "cash_flow_pressure"
  | "debt_pressure"
  | "spending_pressure"
  | "improving"
  | "deteriorating"
  | "mixed"
  | "insufficient_evidence";

export interface FinancialStateModel {
  architecture_version: "IRIS_FINANCIAL_STATE_V1";
  primary_state: FinancialState;
  active_states: FinancialState[];
  state_strength: number;
  dimensions: { liquidity: FinancialState; cash_flow: FinancialState; debt: FinancialState; spending: FinancialState; trajectory: FinancialState };
  drivers: Array<{ node_id: string; label: string; state: EvidenceNode["state"]; role: "driver" | "constraint" | "signal" }>;
  transitions: Array<{ from: FinancialState; to: FinancialState; trigger_nodes: string[]; evidence_state: EvidenceNode["state"] }>;
  limitations: string[];
}

function node(graph: EvidenceGraph, id: string) { return graph.nodes.find((item) => item.id === id); }

function numericValue(n: EvidenceNode | undefined): number | null {
  if (!n || typeof n.value !== "number" || !Number.isFinite(n.value)) return null;
  return n.value;
}

function evidenceAllowsState(n: EvidenceNode | undefined) {
  return Boolean(n) && n!.state !== "insufficient_evidence";
}

/** Converts canonical evidence into a typed financial state without inventing provider facts. */
export function buildFinancialStateModel(graph: EvidenceGraph, uncertainty: UncertaintyAssessment): FinancialStateModel {
  const cash = node(graph, "cash_flow_net");
  const liquid = node(graph, "liquid_assets");
  const safe = node(graph, "safe_to_spend");
  const debt = node(graph, "debt_cost");
  const trajectory = node(graph, "trajectory");
  const anomalies = node(graph, "anomalies");

  const cashValue = numericValue(cash);
  const safeValue = numericValue(safe);
  const debtValue = numericValue(debt);
  const anomalyCount = numericValue(anomalies);

  const liquidity: FinancialState = safeValue !== null
    ? (safeValue < 0 ? "liquidity_pressure" : "stable")
    : evidenceAllowsState(liquid) ? "stable" : "insufficient_evidence";

  const cashFlow: FinancialState = cashValue !== null
    ? (cashValue < 0 ? "cash_flow_pressure" : "stable")
    : "insufficient_evidence";

  const debtState: FinancialState = debt
    ? (debt.state === "limited" || debt.state === "insufficient_evidence" ? "insufficient_evidence" : debtValue !== null && debtValue > 0 ? "debt_pressure" : "stable")
    : "insufficient_evidence";

  const spending: FinancialState = anomalies
    ? (anomalies.state === "insufficient_evidence" ? "insufficient_evidence" : anomalyCount !== null && anomalyCount > 0 ? "spending_pressure" : "stable")
    : "insufficient_evidence";

  const trajectoryState: FinancialState = !trajectory
    ? "insufficient_evidence"
    : trajectory.state === "insufficient_evidence" || trajectory.state === "limited"
      ? "insufficient_evidence"
      : trajectory.state === "inferred"
        ? (typeof trajectory.value === "object" && trajectory.value !== null && "direction" in trajectory.value && (trajectory.value as any).direction === "decelerating" ? "improving" : "deteriorating")
        : "stable";

  const dimensions = { liquidity, cash_flow: cashFlow, debt: debtState, spending, trajectory: trajectoryState };
  const nonStable = Object.values(dimensions).filter((state) => state !== "stable" && state !== "insufficient_evidence") as FinancialState[];
  const hasInsufficient = Object.values(dimensions).includes("insufficient_evidence");
  const uniqueActive = [...new Set(nonStable)];
  const primary: FinancialState = uniqueActive.length > 1
    ? "mixed"
    : uniqueActive.length === 1
      ? uniqueActive[0]
      : hasInsufficient
        ? "insufficient_evidence"
        : "stable";

  const drivers = graph.nodes
    .filter((n) => ["cash_flow_net", "safe_to_spend", "liquid_assets", "debt_cost", "trajectory", "anomalies"].includes(n.id))
    .map((n) => ({
      node_id: n.id,
      label: n.label,
      state: n.state,
      role: n.id === "debt_cost" || n.id === "safe_to_spend" ? "constraint" as const : n.state === "inferred" ? "signal" as const : "driver" as const,
    }));

  const transitions: FinancialStateModel["transitions"] = [];
  if (trajectory?.state === "inferred" && typeof trajectory.value === "object" && trajectory.value !== null && "direction" in trajectory.value) {
    const direction = (trajectory.value as any).direction;
    if (direction === "accelerating") transitions.push({ from: "stable", to: "deteriorating", trigger_nodes: ["trajectory"], evidence_state: trajectory.state });
    if (direction === "decelerating") transitions.push({ from: "stable", to: "improving", trigger_nodes: ["trajectory"], evidence_state: trajectory.state });
  }
  if (cash?.state === "calculated" && cashValue !== null && cashValue < 0) transitions.push({ from: "stable", to: "cash_flow_pressure", trigger_nodes: ["cash_flow_net"], evidence_state: cash.state });
  if (safe?.state === "calculated" && safeValue !== null && safeValue < 0) transitions.push({ from: "stable", to: "liquidity_pressure", trigger_nodes: ["safe_to_spend"], evidence_state: safe.state });

  return {
    architecture_version: "IRIS_FINANCIAL_STATE_V1",
    primary_state: primary,
    active_states: uniqueActive.length ? uniqueActive : [primary],
    state_strength: Number(uncertainty.evidence_strength.toFixed(3)),
    dimensions,
    drivers,
    transitions,
    limitations: [...new Set([...uncertainty.known_unknowns, ...uncertainty.blocked_conclusions])],
  };
}
