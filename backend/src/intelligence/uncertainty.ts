import type { EvidenceGraph, EvidenceNode, EvidenceState } from "./evidenceGraph.js";

export type UncertaintyState = EvidenceState;

export interface UncertaintyAssessment {
  architecture_version: "IRIS_UNCERTAINTY_V2";
  state: UncertaintyState;
  evidence_strength: number;
  known_unknowns: string[];
  blocked_conclusions: string[];
  propagation: Array<{
    node_id: string;
    state: UncertaintyState;
    native_state: UncertaintyState;
    upstream_nodes: string[];
    downstream_nodes: string[];
    constraint_count: number;
    limiting_nodes: string[];
  }>;
}

const STATE_SCORE: Record<UncertaintyState, number> = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.65,
  limited: 0.35,
  insufficient_evidence: 0,
};

const RANK: Record<UncertaintyState, number> = {
  observed: 0,
  calculated: 1,
  inferred: 2,
  limited: 3,
  insufficient_evidence: 4,
};

function combine(states: UncertaintyState[]): UncertaintyState {
  if (!states.length) return "insufficient_evidence";
  return states.reduce((worst, state) => RANK[state] > RANK[worst] ? state : worst, states[0]);
}

/**
 * Propagates evidence limitations through the dependency graph. Provider observations
 * remain immutable source evidence; only derived/intelligence nodes are downgraded.
 * A limiting edge is allowed to constrain its destination even when the source is
 * otherwise valid. This prevents downstream certainty from exceeding its evidence.
 */
export function assessUncertainty(graph: EvidenceGraph): UncertaintyAssessment {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, typeof graph.edges>();
  const outgoing = new Map<string, typeof graph.edges>();
  for (const edge of graph.edges) {
    const inEdges = incoming.get(edge.to) ?? [];
    inEdges.push(edge);
    incoming.set(edge.to, inEdges);
    const outEdges = outgoing.get(edge.from) ?? [];
    outEdges.push(edge);
    outgoing.set(edge.from, outEdges);
  }

  const effective = new Map<string, UncertaintyState>();
  const visiting = new Set<string>();

  const resolve = (nodeId: string): UncertaintyState => {
    const cached = effective.get(nodeId);
    if (cached) return cached;
    const node = byId.get(nodeId);
    if (!node) return "insufficient_evidence";
    if (visiting.has(nodeId)) return node.state;
    visiting.add(nodeId);

    // Source observations are never rewritten by Iris uncertainty propagation.
    if (node.kind === "provider") {
      effective.set(nodeId, node.state);
      visiting.delete(nodeId);
      return node.state;
    }

    const dependencies: UncertaintyState[] = [node.state];
    const limitingNodes: string[] = [];
    for (const edge of incoming.get(nodeId) ?? []) {
      const upstreamState = resolve(edge.from);
      if (edge.relation === "limits" || edge.relation === "constrains") {
        dependencies.push(upstreamState === "observed" ? "limited" : upstreamState);
        limitingNodes.push(edge.from);
      } else if (edge.relation === "derived_from" || edge.relation === "supports") {
        dependencies.push(upstreamState);
      }
    }

    const result = combine(dependencies);
    effective.set(nodeId, result);
    visiting.delete(nodeId);
    return result;
  };

  const propagation = graph.nodes.map((node) => {
    const upstreamNodes = [...new Set((incoming.get(node.id) ?? []).map((edge) => edge.from).filter((id) => byId.has(id)))];
    const downstreamNodes = [...new Set((outgoing.get(node.id) ?? []).map((edge) => edge.to).filter((id) => byId.has(id)))];
    const constraints = (incoming.get(node.id) ?? []).concat(outgoing.get(node.id) ?? [])
      .filter((edge) => edge.relation === "constrains" || edge.relation === "limits").length;
    const limitingNodes = [...new Set(
      (incoming.get(node.id) ?? [])
        .filter((edge) => edge.relation === "limits" || edge.relation === "constrains")
        .map((edge) => edge.from),
    )];
    return {
      node_id: node.id,
      state: resolve(node.id),
      native_state: node.state,
      upstream_nodes: upstreamNodes,
      downstream_nodes: downstreamNodes,
      constraint_count: constraints,
      limiting_nodes: limitingNodes,
    };
  });

  const scores = propagation.map((entry) => STATE_SCORE[entry.state]);
  const evidenceStrength = scores.length
    ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(3))
    : 0;
  const states = propagation.map((entry) => entry.state);
  const knownUnknowns = propagation
    .filter((entry) => entry.state === "limited" || entry.state === "insufficient_evidence")
    .map((entry) => byId.get(entry.node_id)?.label ?? entry.node_id);
  const blockedConclusions = [
    ...graph.limitations.map((text) => `Conclusion constrained by evidence limitation: ${text}`),
    ...propagation
      .filter((entry) => entry.state === "insufficient_evidence")
      .map((entry) => `Conclusion blocked: ${byId.get(entry.node_id)?.label ?? entry.node_id} lacks sufficient evidence.`),
  ];

  return {
    architecture_version: "IRIS_UNCERTAINTY_V2",
    state: combine(states),
    evidence_strength: evidenceStrength,
    known_unknowns: [...new Set(knownUnknowns)],
    blocked_conclusions: [...new Set(blockedConclusions)],
    propagation,
  };
}
