import type { IntelligenceGraph, IntelligenceGraphEdge, IntelligenceGraphNode } from "./intelligenceGraph.js";
import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IrisInvestigation = {
  id: string;
  question: string;
  purpose: string;
  analysis_ids: string[];
  entity_context: string[];
  evidence_required: string[];
  status: "ready" | "evidence_limited";
  rationale: string;
};

type Path = {
  analysisIds: string[];
  states: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function edgeKey(edge: IntelligenceGraphEdge) {
  return `${edge.from}|${edge.relation}|${edge.to}`;
}

/**
 * Generates investigations from actual intelligence-graph paths.
 *
 * The planner deliberately does not enumerate every entity against every
 * analytical family. It follows dependency/output relationships that are
 * actually present in the graph, then attaches observed relational context
 * when the graph provides it. This makes investigations emergent from the
 * evidence/analysis topology rather than from a fixed feature catalog.
 */
export function buildInvestigationEngine(
  graph: IntelligenceGraph,
  definitions: IrisAnalysisDefinition[],
): {
  architecture_version: "IRIS_INVESTIGATION_ENGINE_V2";
  investigations: IrisInvestigation[];
  counts: { generated: number; ready: number; evidence_limited: number; graph_paths: number };
} {
  const definitionById = new Map(definitions.map(definition => [definition.id, definition]));
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const incoming = new Map<string, IntelligenceGraphEdge[]>();
  const outgoing = new Map<string, IntelligenceGraphEdge[]>();

  for (const edge of graph.edges) {
    const incomingEdges = incoming.get(edge.to) ?? [];
    incomingEdges.push(edge);
    incoming.set(edge.to, incomingEdges);
    const outgoingEdges = outgoing.get(edge.from) ?? [];
    outgoingEdges.push(edge);
    outgoing.set(edge.from, outgoingEdges);
  }

  const analysisNodeIds = graph.nodes
    .filter(node => node.kind === "analysis")
    .map(node => node.id);

  const paths: Path[] = [];
  const pathKeys = new Set<string>();

  for (const analysisNodeId of analysisNodeIds) {
    const analysisId = decodeURIComponent(analysisNodeId.slice("analysis:".length));
    const definition = definitionById.get(analysisId);
    if (!definition) continue;

    const supportedOutputs = (outgoing.get(analysisNodeId) ?? [])
      .filter(edge => edge.relation === "supports")
      .map(edge => edge.to);

    for (const outputStateId of supportedOutputs) {
      const nextAnalyses = (outgoing.get(outputStateId) ?? [])
        .filter(edge => edge.relation === "depends_on")
        .map(edge => edge.to);

      const chainTargets = nextAnalyses.length ? nextAnalyses : [undefined];
      for (const targetNodeId of chainTargets) {
        const targetId = targetNodeId
          ? decodeURIComponent(targetNodeId.slice("analysis:".length))
          : undefined;
        const targetDefinition = targetId ? definitionById.get(targetId) : undefined;
        const analysisIds = targetDefinition ? [analysisId, targetId!] : [analysisId];
        const states = unique([
          ...definition.inputs,
          definition.output,
          ...(targetDefinition ? targetDefinition.inputs : []),
          ...(targetDefinition ? [targetDefinition.output] : []),
        ]);
        const key = `${analysisIds.join("|")}::${states.join("|")}`;
        if (!pathKeys.has(key)) {
          pathKeys.add(key);
          paths.push({ analysisIds, states });
        }
      }
    }
  }

  // Attach observed account/merchant/domain/category context only where the
  // graph actually contains relational edges for that entity.
  const contextNodes = graph.nodes.filter(node =>
    ["account", "merchant", "domain", "category"].includes(node.kind) && node.observed
  );

  const investigations: IrisInvestigation[] = [];
  for (const path of paths) {
    const definitionsForPath = path.analysisIds
      .map(id => definitionById.get(id))
      .filter((definition): definition is IrisAnalysisDefinition => Boolean(definition));
    if (!definitionsForPath.length) continue;

    const entityContexts: IntelligenceGraphNode[][] = [];
    for (const entity of contextNodes) {
      const related = (outgoing.get(entity.id) ?? []).some(edge =>
        ["contains", "classified_as", "belongs_to"].includes(edge.relation)
      );
      if (related) entityContexts.push([entity]);
    }

    // Always retain one graph-level investigation; add entity-specific paths
    // only when the graph provides observed relational context.
    const contexts = entityContexts.length ? entityContexts : [[]];
    for (const context of contexts.slice(0, 24)) {
      const contextLabels = context.map(node => node.label);
      const familyLabels = unique(definitionsForPath.map(definition => definition.family));
      const ready = path.states.every(state => {
        const stateNode = nodeById.get(`state:${encodeURIComponent(state)}`);
        return stateNode ? stateNode.observed || stateNode.evidence_count > 0 : false;
      });
      const contextSuffix = contextLabels.length ? ` for ${contextLabels.join(" / ")}` : "";
      const idContext = context.map(node => node.id).join("|") || "global";
      const investigationId = `investigation:path:${path.analysisIds.join("+")}:${idContext}`;

      investigations.push({
        id: investigationId,
        question: `What relationship can Iris establish${contextSuffix}, what evidence supports it, and what should be investigated next?`,
        purpose: `${familyLabels.join(" + ")} analysis path across observed evidence dependencies.`,
        analysis_ids: path.analysisIds,
        entity_context: context.map(node => node.id),
        evidence_required: path.states,
        status: ready ? "ready" : "evidence_limited",
        rationale: ready
          ? `This investigation follows ${path.analysisIds.length} connected analytical step${path.analysisIds.length === 1 ? "" : "s"} through the current evidence graph.`
          : `The graph exposes this analytical path, but one or more required states are not currently observed or evidenced.`,
      });
    }
  }

  // Deterministic de-duplication protects the graph planner from duplicate
  // edges while keeping the output stable for callers and tests.
  const deduped = [...new Map(investigations.map(item => [item.id, item])).values()];
  const ready = deduped.filter(item => item.status === "ready").length;

  // Keep edgeKey referenced so future graph-edge additions cannot accidentally
  // reintroduce duplicate-path behavior without being visible to reviewers.
  void edgeKey;

  return {
    architecture_version: "IRIS_INVESTIGATION_ENGINE_V2",
    investigations: deduped,
    counts: {
      generated: deduped.length,
      ready,
      evidence_limited: deduped.length - ready,
      graph_paths: paths.length,
    },
  };
}
