import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IntelligenceGraphNodeKind =
  | "account"
  | "merchant"
  | "domain"
  | "category"
  | "transaction_class"
  | "analysis"
  | "state"
  | "goal";

export type IntelligenceGraphRelation =
  | "contains"
  | "occurs_at"
  | "classified_as"
  | "belongs_to"
  | "supports"
  | "depends_on"
  | "compares_with"
  | "investigates"
  | "constrains"
  | "optimizes_for";

export type IntelligenceGraphNode = {
  id: string;
  kind: IntelligenceGraphNodeKind;
  label: string;
  evidence_count: number;
  observed: boolean;
};

export type IntelligenceGraphEdge = {
  from: string;
  to: string;
  relation: IntelligenceGraphRelation;
  evidence_count: number;
};

export type IntelligenceGraph = {
  architecture_version: "IRIS_INTELLIGENCE_GRAPH_V2";
  node_count: number;
  edge_count: number;
  nodes: IntelligenceGraphNode[];
  edges: IntelligenceGraphEdge[];
  capabilities: {
    relational_contexts: number;
    analysis_dependencies: number;
    investigation_paths: number;
    evidence_bounded: true;
  };
};

type CanonicalLike = {
  id: string;
  account_id?: string | null;
  merchant_name?: string | null;
  domain?: { key?: string | null; label?: string | null } | null;
  plaid_category_primary?: string | null;
  plaid_category_detailed?: string | null;
  transaction_class?: string | null;
};

type AtlasLike = { definitions: IrisAnalysisDefinition[] };
type Keyed = { kind: IntelligenceGraphNodeKind; value: string };

function nodeId(kind: IntelligenceGraphNodeKind, value: string) {
  return `${kind}:${encodeURIComponent(value)}`;
}

function addNode(map: Map<string, IntelligenceGraphNode>, key: Keyed, count = 1, observed = true) {
  const id = nodeId(key.kind, key.value);
  const existing = map.get(id);
  if (existing) {
    existing.evidence_count += count;
    existing.observed = existing.observed || observed;
  } else {
    map.set(id, { id, kind: key.kind, label: key.value, evidence_count: count, observed });
  }
  return id;
}

function addEdge(map: Map<string, IntelligenceGraphEdge>, from: string, to: string, relation: IntelligenceGraphRelation, count = 1) {
  const id = `${from}|${relation}|${to}`;
  const existing = map.get(id);
  if (existing) existing.evidence_count += count;
  else map.set(id, { from, to, relation, evidence_count: count });
}

/**
 * Builds Iris's relational intelligence substrate from canonical provider-backed
 * observations and the analytical dependency registry.
 *
 * V2 makes the semantic relationships explicit: analyses support their declared
 * outputs, analyses depend on their input states, and compatible analytical
 * families are connected for comparison/investigation. No relationship is
 * presented as provider fact; graph edges are derived metadata over evidence.
 */
export function buildIntelligenceGraph(canonical: CanonicalLike[], atlas: AtlasLike): IntelligenceGraph {
  const nodes = new Map<string, IntelligenceGraphNode>();
  const edges = new Map<string, IntelligenceGraphEdge>();
  const analysisNodes = new Map<string, string>();
  const outputNodes = new Map<string, string[]>();

  for (const tx of canonical) {
    if (!tx.account_id) continue;
    const account = addNode(nodes, { kind: "account", value: tx.account_id });

    if (tx.merchant_name) {
      const merchant = addNode(nodes, { kind: "merchant", value: tx.merchant_name });
      addEdge(edges, account, merchant, "contains");
    }

    const domainValue = tx.domain?.key ?? tx.domain?.label;
    if (domainValue) {
      const domain = addNode(nodes, { kind: "domain", value: domainValue });
      addEdge(edges, account, domain, "contains");
    }

    const categoryValue = tx.plaid_category_detailed ?? tx.plaid_category_primary;
    if (categoryValue) {
      const category = addNode(nodes, { kind: "category", value: categoryValue });
      addEdge(edges, account, category, "contains");
    }

    if (tx.transaction_class) {
      const classification = addNode(nodes, { kind: "transaction_class", value: tx.transaction_class });
      addEdge(edges, account, classification, "classified_as");
    }

    if (tx.merchant_name && domainValue) {
      addEdge(edges, nodeId("merchant", tx.merchant_name), nodeId("domain", domainValue), "belongs_to");
    }
    if (tx.merchant_name && categoryValue) {
      addEdge(edges, nodeId("merchant", tx.merchant_name), nodeId("category", categoryValue), "belongs_to");
    }
  }

  for (const definition of atlas.definitions) {
    const analysis = addNode(nodes, { kind: "analysis", value: definition.id }, Math.max(1, definition.inputs.length), false);
    analysisNodes.set(definition.id, analysis);

    for (const input of definition.inputs) {
      const state = addNode(nodes, { kind: "state", value: input }, 1, false);
      addEdge(edges, state, analysis, "depends_on");
    }

    const output = addNode(nodes, { kind: "state", value: definition.output }, 1, false);
    addEdge(edges, analysis, output, "supports");
    const existingOutputs = outputNodes.get(definition.output) ?? [];
    existingOutputs.push(definition.id);
    outputNodes.set(definition.output, existingOutputs);
  }

  // Analyses producing the same state are alternative/comparable analytical paths.
  for (const definitions of outputNodes.values()) {
    for (let i = 0; i < definitions.length; i += 1) {
      for (let j = i + 1; j < definitions.length; j += 1) {
        const left = analysisNodes.get(definitions[i]);
        const right = analysisNodes.get(definitions[j]);
        if (left && right) addEdge(edges, left, right, "compares_with");
      }
    }
  }

  // Causal, decision and synthesis analyses investigate their declared inputs.
  for (const definition of atlas.definitions) {
    const analysis = analysisNodes.get(definition.id);
    if (!analysis) continue;
    if (!["causal", "decisions", "synthesis"].includes(definition.family)) continue;
    for (const input of definition.inputs) {
      const state = nodeId("state", input);
      if (nodes.has(state)) addEdge(edges, analysis, state, "investigates");
    }
  }

  const relationalContexts = [...edges.values()].filter(edge =>
    ["contains", "belongs_to", "classified_as"].includes(edge.relation)
  ).length;
  const analysisDependencies = [...edges.values()].filter(edge =>
    ["depends_on", "supports", "compares_with"].includes(edge.relation)
  ).length;
  const investigationPaths = [...edges.values()].filter(edge =>
    edge.relation === "investigates"
  ).length;

  return {
    architecture_version: "IRIS_INTELLIGENCE_GRAPH_V2",
    node_count: nodes.size,
    edge_count: edges.size,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    capabilities: {
      relational_contexts: relationalContexts,
      analysis_dependencies: analysisDependencies,
      investigation_paths: investigationPaths,
      evidence_bounded: true,
    },
  };
}
