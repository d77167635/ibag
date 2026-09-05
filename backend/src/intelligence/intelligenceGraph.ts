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
  architecture_version: "IRIS_INTELLIGENCE_GRAPH_V1";
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

function addNode(map: Map<string, IntelligenceGraphNode>, key: Keyed, count = 1) {
  const id = nodeId(key.kind, key.value);
  const existing = map.get(id);
  if (existing) existing.evidence_count += count;
  else map.set(id, { id, kind: key.kind, label: key.value, evidence_count: count, observed: true });
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
 * observations. This graph is intentionally not a fixed feature list: new
 * analyses can attach to existing entities and relationships without changing
 * the graph model or imposing a maximum intelligence tier.
 */
export function buildIntelligenceGraph(canonical: CanonicalLike[], atlas: AtlasLike): IntelligenceGraph {
  const nodes = new Map<string, IntelligenceGraphNode>();
  const edges = new Map<string, IntelligenceGraphEdge>();
  const analysisNodes = new Map<string, string>();

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
    const id = addNode(nodes, { kind: "analysis", value: definition.id }, definition.inputs.length);
    analysisNodes.set(definition.id, id);
    for (const input of definition.inputs) {
      const state = addNode(nodes, { kind: "state", value: input });
      addEdge(edges, state, id, "depends_on");
    }
  }

  const relationalContexts = [...edges.values()].filter(edge => ["contains", "belongs_to", "classified_as"].includes(edge.relation)).length;
  const analysisDependencies = [...edges.values()].filter(edge => edge.relation === "depends_on").length;
  const investigationPaths = atlas.definitions.filter(definition =>
    definition.family === "causal" || definition.family === "decisions" || definition.family === "synthesis"
  ).length;

  return {
    architecture_version: "IRIS_INTELLIGENCE_GRAPH_V1",
    node_count: nodes.size,
    edge_count: edges.size,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    capabilities: { relational_contexts: relationalContexts, analysis_dependencies: analysisDependencies, investigation_paths: investigationPaths, evidence_bounded: true },
  };
}
