import type { EvidenceGraph, EvidenceNode } from "./evidenceGraph.js";
import { intentDomains, type IrisIntent } from "./irisContext.js";

export interface IrisReasoningStep {
  order: number;
  node_id: string;
  operation: "observe" | "derive" | "infer" | "constrain" | "limit" | "compare";
  statement: string;
  evidence_state: EvidenceNode["state"];
  source: string;
  supporting_nodes: string[];
  relations: string[];
}

export interface IrisReasoningTrace {
  architecture_version: "IRIS_REASONING_TRACE_V2";
  question_intent: IrisIntent;
  requested_domains: string[];
  relevant_nodes: string[];
  steps: IrisReasoningStep[];
  uncertainty: {
    evidence_state: "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence";
    limitations: string[];
    blocked_conclusions: string[];
    unresolved_nodes: string[];
  };
  provenance: Array<{ node_id: string; source: string; state: EvidenceNode["state"] }>;
}

const DOMAIN_NODE_MAP: Record<string, string[]> = {
  cash_flow: ["cash_flow_net", "trajectory", "forward_projection"],
  balance_history: ["liquid_assets", "safe_to_spend"],
  temporal: ["trajectory", "forward_projection"],
  spending_by_domain: ["category_drift", "anomalies"],
  spending_hierarchy: ["category_drift"],
  behavioral: ["category_drift", "anomalies"],
  cash_flow_safety: ["safe_to_spend", "liquid_assets", "cash_flow_net", "debt_cost"],
  debt_health: ["debt_cost"],
  debt_cost: ["debt_cost", "safe_to_spend"],
  roundup_projection: ["roundup_projection", "forward_projection"],
  roundups: ["roundup_projection"],
  transactions: ["anomalies", "roundup_projection"],
  anomalies: ["anomalies", "category_drift", "trajectory"],
  provenance: [],
  reasoning: ["safe_to_spend", "trajectory", "forward_projection", "anomalies"],
  evidence_coverage: [],
  plaid_source: ["liquid_assets"],
  accounts: ["liquid_assets"],
  product_observations: [],
};

function operationFor(node: EvidenceNode): IrisReasoningStep["operation"] {
  if (node.kind === "provider") return "observe";
  if (node.kind === "limitation") return "limit";
  if (node.state === "inferred") return "infer";
  return "derive";
}

function statementFor(node: EvidenceNode): string {
  switch (node.kind) {
    case "provider": return `${node.label} is treated as a provider observation from ${node.source}.`;
    case "limitation": return `This limitation constrains what Iris can responsibly conclude: ${node.label}`;
    case "inference": return `${node.label} is an Iris inference derived from available evidence.`;
    default: return `${node.label} is an Iris calculation derived from the available evidence.`;
  }
}

function mergeState(states: EvidenceNode["state"][]): IrisReasoningTrace["uncertainty"]["evidence_state"] {
  if (!states.length) return "insufficient_evidence";
  if (states.includes("insufficient_evidence")) return "insufficient_evidence";
  if (states.includes("limited")) return "limited";
  if (states.includes("inferred")) return "inferred";
  if (states.includes("calculated")) return "calculated";
  return "observed";
}

function edgeOperation(relation: string): IrisReasoningStep["operation"] {
  if (relation === "constrains") return "constrain";
  if (relation === "limits") return "limit";
  if (relation === "compares_with") return "compare";
  if (relation === "supports" || relation === "derived_from") return "derive";
  return "derive";
}

/** Builds an evidence-grounded, relationship-aware reasoning trace without inventing conclusions. */
export function buildReasoningTrace(intent: IrisIntent, graph: EvidenceGraph): IrisReasoningTrace {
  const domains = intentDomains(intent);
  const targetIds = new Set(domains.flatMap((domain) => DOMAIN_NODE_MAP[domain] ?? []));
  const relevant = graph.nodes.filter((node) => targetIds.has(node.id) || node.kind === "limitation");
  const relevantIds = new Set(relevant.map((node) => node.id));

  // Traverse outward through the graph so evidence dependencies become part of the reasoning chain.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      if (!relevantIds.has(edge.from) && relevantIds.has(edge.to)) {
        const node = graph.nodes.find((candidate) => candidate.id === edge.from);
        if (node) { relevant.push(node); relevantIds.add(node.id); changed = true; }
      }
      if (!relevantIds.has(edge.to) && relevantIds.has(edge.from)) {
        const node = graph.nodes.find((candidate) => candidate.id === edge.to);
        if (node) { relevant.push(node); relevantIds.add(node.id); changed = true; }
      }
    }
  }

  const rank = (node: EvidenceNode) => node.kind === "provider" ? 0 : node.kind === "limitation" ? 4 : node.state === "calculated" ? 1 : node.state === "inferred" ? 2 : 3;
  const ordered = relevant.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  const relevantSet = new Set(ordered.map((node) => node.id));

  const steps: IrisReasoningStep[] = ordered.map((node, index) => {
    const incoming = graph.edges.filter((edge) => edge.to === node.id && relevantSet.has(edge.from));
    const outgoing = graph.edges.filter((edge) => edge.from === node.id && relevantSet.has(edge.to));
    const relations = [...incoming, ...outgoing].map((edge) => edge.relation);
    const supportingNodes = [...incoming.map((edge) => edge.from), ...outgoing.map((edge) => edge.to)];
    return {
      order: index + 1,
      node_id: node.id,
      operation: incoming.some((edge) => edge.relation === "constrains") || outgoing.some((edge) => edge.relation === "constrains")
        ? "constrain"
        : incoming.some((edge) => edge.relation === "limits") || outgoing.some((edge) => edge.relation === "limits")
          ? "limit"
          : relations.length ? edgeOperation(relations[0]) : operationFor(node),
      statement: statementFor(node),
      evidence_state: node.state,
      source: node.source,
      supporting_nodes: [...new Set(supportingNodes)],
      relations: [...new Set(relations)],
    };
  });

  const blockedConclusions = graph.limitations.map((limitation) => `Cannot establish a stronger conclusion than the available evidence supports: ${limitation}`);
  const unresolvedNodes = ordered.filter((node) => node.state === "insufficient_evidence" || node.state === "limited").map((node) => node.id);

  return {
    architecture_version: "IRIS_REASONING_TRACE_V2",
    question_intent: intent,
    requested_domains: domains,
    relevant_nodes: ordered.map((node) => node.id),
    steps,
    uncertainty: {
      evidence_state: mergeState(ordered.map((node) => node.state)),
      limitations: graph.limitations,
      blocked_conclusions: blockedConclusions,
      unresolved_nodes: unresolvedNodes,
    },
    provenance: ordered.map((node) => ({ node_id: node.id, source: node.source, state: node.state })),
  };
}
