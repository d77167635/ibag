import type { CausalAnalysis } from "./causal.js";
import type { FinancialStateModel } from "./financialState.js";
import type { FinancialReasoning } from "./relational.js";
import type { EvidenceNode } from "./evidenceGraph.js";

export type DecisionNodeKind = "evidence" | "state" | "hypothesis" | "risk" | "opportunity" | "question" | "constraint";
export type DecisionRelation = "supports" | "drives" | "constrains" | "explains" | "suggests" | "requires_evidence";

export interface DecisionNode {
  id: string;
  kind: DecisionNodeKind;
  label: string;
  evidence_state: EvidenceNode["state"];
  source: string;
  value?: unknown;
}

export interface DecisionEdge {
  from: string;
  to: string;
  relation: DecisionRelation;
}

export interface IrisDecisionGraph {
  architecture_version: "IRIS_DECISION_GRAPH_V1";
  nodes: DecisionNode[];
  edges: DecisionEdge[];
  decision_readiness: "ready_for_analysis" | "constrained" | "insufficient_evidence";
  unresolved_questions: string[];
  limitations: string[];
}

const evidenceRank: Record<EvidenceNode["state"], number> = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.65,
  limited: 0.35,
  insufficient_evidence: 0,
};

/** Builds an explicit decision graph. It maps evidence to state, hypotheses, risks and opportunities without inventing actions or causal certainty. */
export function buildDecisionGraph(
  reasoning: FinancialReasoning,
  state: FinancialStateModel,
  causal: CausalAnalysis,
  evidenceNodes: EvidenceNode[] = [],
): IrisDecisionGraph {
  const nodes: DecisionNode[] = [];
  const edges: DecisionEdge[] = [];
  const unresolved = [...reasoning.unresolvedQuestions];
  const limitations = [...state.limitations, ...causal.limitations];

  for (const evidence of evidenceNodes) {
    nodes.push({
      id: `evidence:${evidence.id}`,
      kind: evidence.kind === "limitation" ? "constraint" : "evidence",
      label: evidence.label,
      evidence_state: evidence.state,
      source: evidence.source,
      value: evidence.value,
    });
  }

  for (const [dimension, dimensionState] of Object.entries(state.dimensions)) {
    nodes.push({
      id: `state:${dimension}`,
      kind: "state",
      label: `${dimension} state: ${dimensionState}`,
      evidence_state: dimensionState === "insufficient_evidence" ? "insufficient_evidence" : dimensionState === "mixed" ? "limited" : "calculated",
      source: "Iris financial state model",
      value: dimensionState,
    });
  }

  for (const risk of reasoning.risks) {
    nodes.push({
      id: `risk:${risk.key}`,
      kind: "risk",
      label: risk.statement,
      evidence_state: risk.evidence,
      source: "Iris relational reasoning",
      value: risk.supportingMetrics,
    });
  }

  for (const opportunity of reasoning.opportunities) {
    nodes.push({
      id: `opportunity:${opportunity.key}`,
      kind: "opportunity",
      label: opportunity.statement,
      evidence_state: opportunity.evidence,
      source: "Iris relational reasoning",
      value: opportunity.supportingMetrics,
    });
  }

  for (const hypothesis of causal.hypotheses) {
    nodes.push({
      id: `hypothesis:${hypothesis.id}`,
      kind: "hypothesis",
      label: hypothesis.statement,
      evidence_state: hypothesis.evidence,
      source: "Iris causal analysis",
      value: hypothesis.causal_status,
    });
    for (const support of hypothesis.support) {
      edges.push({ from: `risk:${support}`, to: `hypothesis:${hypothesis.id}`, relation: "supports" });
    }
    for (const missing of hypothesis.missing_evidence) {
      const id = `question:causal:${hypothesis.id}:${nodes.length}`;
      nodes.push({ id, kind: "question", label: `Additional evidence required: ${missing}`, evidence_state: "insufficient_evidence", source: "Iris causal analysis" });
      edges.push({ from: id, to: `hypothesis:${hypothesis.id}`, relation: "requires_evidence" });
    }
  }

  const connectState = (dimension: string, target: string) => {
    if (nodes.some((n) => n.id === target)) edges.push({ from: `state:${dimension}`, to: target, relation: "drives" });
  };
  for (const risk of reasoning.risks) {
    if (risk.key.includes("cash_flow") || risk.key.includes("safe_to_spend") || risk.key.includes("bill")) connectState("cash_flow", `risk:${risk.key}`);
    if (risk.key.includes("debt") || risk.key.includes("payment")) connectState("debt", `risk:${risk.key}`);
    if (risk.key.includes("category_spending")) connectState("spending", `risk:${risk.key}`);
  }
  for (const opportunity of reasoning.opportunities) connectState("spending", `opportunity:${opportunity.key}`);

  const evidenceById = new Set(evidenceNodes.map((n) => n.id));
  for (const driver of state.drivers) {
    if (evidenceById.has(driver.node_id)) {
      const target = driver.node_id === "cash_flow_net" ? "cash_flow" : driver.node_id === "safe_to_spend" || driver.node_id === "liquid_assets" ? "liquidity" : driver.node_id === "debt_cost" ? "debt" : driver.node_id === "trajectory" ? "trajectory" : driver.node_id === "anomalies" ? "spending" : null;
      if (target) edges.push({ from: `evidence:${driver.node_id}`, to: `state:${target}`, relation: driver.role === "constraint" ? "constrains" : "supports" });
    }
  }

  const scores = nodes.map((n) => evidenceRank[n.evidence_state]);
  const strength = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const hasInsufficient = nodes.some((n) => n.evidence_state === "insufficient_evidence");
  const readiness = hasInsufficient && strength < 0.5 ? "insufficient_evidence" : limitations.length || hasInsufficient ? "constrained" : "ready_for_analysis";

  return {
    architecture_version: "IRIS_DECISION_GRAPH_V1",
    nodes,
    edges: edges.filter((edge) => nodes.some((n) => n.id === edge.from) && nodes.some((n) => n.id === edge.to)),
    decision_readiness: readiness,
    unresolved_questions: [...new Set(unresolved)],
    limitations: [...new Set(limitations)],
  };
}
