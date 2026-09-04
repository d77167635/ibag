import type { EvidenceGraph, EvidenceNode } from "./evidenceGraph.js";

export type UncertaintyState = EvidenceNode["state"];

export interface UncertaintyAssessment {
  architecture_version: "IRIS_UNCERTAINTY_V1";
  state: UncertaintyState;
  evidence_strength: number;
  known_unknowns: string[];
  blocked_conclusions: string[];
  propagation: Array<{
    node_id: string;
    state: UncertaintyState;
    upstream_nodes: string[];
    downstream_nodes: string[];
    constraint_count: number;
  }>;
}

const STATE_SCORE: Record<UncertaintyState, number> = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.65,
  limited: 0.35,
  insufficient_evidence: 0,
};

function combine(states: UncertaintyState[]): UncertaintyState {
  if (!states.length) return "insufficient_evidence";
  if (states.includes("insufficient_evidence")) return "insufficient_evidence";
  if (states.includes("limited")) return "limited";
  if (states.includes("inferred")) return "inferred";
  if (states.includes("calculated")) return "calculated";
  return "observed";
}

/** Propagates evidence limitations through the directed evidence graph without fabricating certainty. */
export function assessUncertainty(graph: EvidenceGraph): UncertaintyAssessment {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const propagation = graph.nodes.map((node) => {
    const upstream = graph.edges.filter((edge) => edge.to === node.id).map((edge) => edge.from).filter((id) => byId.has(id));
    const downstream = graph.edges.filter((edge) => edge.from === node.id).map((edge) => edge.to).filter((id) => byId.has(id));
    const constraints = graph.edges.filter((edge) => (edge.from === node.id || edge.to === node.id) && (edge.relation === "constrains" || edge.relation === "limits")).length;
    return { node_id: node.id, state: node.state, upstream_nodes: [...new Set(upstream)], downstream_nodes: [...new Set(downstream)], constraint_count: constraints };
  });

  const scores = graph.nodes.map((node) => STATE_SCORE[node.state]);
  const evidenceStrength = scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3)) : 0;
  const states = graph.nodes.map((node) => node.state);
  const knownUnknowns = graph.nodes.filter((node) => node.state === "limited" || node.state === "insufficient_evidence").map((node) => node.label);
  const blockedConclusions = graph.limitations.map((text) => `Conclusion constrained by evidence limitation: ${text}`);

  return {
    architecture_version: "IRIS_UNCERTAINTY_V1",
    state: combine(states),
    evidence_strength: evidenceStrength,
    known_unknowns: knownUnknowns,
    blocked_conclusions: blockedConclusions,
    propagation,
  };
}
