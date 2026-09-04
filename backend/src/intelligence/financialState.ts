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
function classifyPresent(n: EvidenceNode | undefined, positive: boolean): FinancialState {
  if (!n) return "insufficient_evidence";
  if (n.state === "insufficient_evidence") return "insufficient_evidence";
  if (n.state === "limited") return "mixed";
  if (n.state === "inferred" && !positive) return "deteriorating";
  return positive ? "stable" : "spending_pressure";
}

/** Converts existing evidence into a typed financial state without inventing provider facts. */
export function buildFinancialStateModel(graph: EvidenceGraph, uncertainty: UncertaintyAssessment): FinancialStateModel {
  const cash = node(graph, "cash_flow_net");
  const liquid = node(graph, "liquid_assets");
  const safe = node(graph, "safe_to_spend");
  const debt = node(graph, "debt_cost");
  const trajectory = node(graph, "trajectory");
  const anomalies = node(graph, "anomalies");

  const spending: FinancialState = !anomalies ? "insufficient_evidence" : anomalies.state === "inferred" && Number(anomalies.value) > 0 ? "spending_pressure" : "stable";
  const trajectoryState: FinancialState = !trajectory ? "insufficient_evidence" : trajectory.state === "inferred" ? "mixed" : "stable";
  const dimensions = {
    liquidity: classifyPresent(safe ?? liquid, Boolean(safe && safe.value != null)),
    cash_flow: classifyPresent(cash, Boolean(cash && Number(cash.value) >= 0)),
    debt: debt ? (debt.state === "limited" ? "mixed" : "stable") as FinancialState : "insufficient_evidence" as FinancialState,
    spending,
    trajectory: trajectoryState,
  };

  const active = Object.values(dimensions).filter((state, index, arr) => state !== "stable" && arr.indexOf(state) === index) as FinancialState[];
  const hasInsufficient = Object.values(dimensions).includes("insufficient_evidence");
  const primary: FinancialState = hasInsufficient && active.length === 0 ? "insufficient_evidence" : active.length === 1 ? active[0] : active.length > 1 ? "mixed" : "stable";
  const drivers = graph.nodes.filter((n) => ["cash_flow_net", "safe_to_spend", "liquid_assets", "debt_cost", "trajectory", "anomalies"].includes(n.id)).map((n) => ({ node_id: n.id, label: n.label, state: n.state, role: n.id === "debt_cost" || n.id === "safe_to_spend" ? "constraint" as const : n.state === "inferred" ? "signal" as const : "driver" as const }));
  const transitions: FinancialStateModel["transitions"] = [];
  if (trajectory?.state === "inferred") transitions.push({ from: "stable", to: "mixed", trigger_nodes: ["trajectory"], evidence_state: trajectory.state });
  if (cash?.state === "calculated" && Number(cash.value) < 0) transitions.push({ from: "stable", to: "cash_flow_pressure", trigger_nodes: ["cash_flow_net"], evidence_state: cash.state });

  return {
    architecture_version: "IRIS_FINANCIAL_STATE_V1",
    primary_state: primary,
    active_states: active.length ? active : [primary],
    state_strength: Number(uncertainty.evidence_strength.toFixed(3)),
    dimensions,
    drivers,
    transitions,
    limitations: [...new Set([...uncertainty.known_unknowns, ...uncertainty.blocked_conclusions])],
  };
}
