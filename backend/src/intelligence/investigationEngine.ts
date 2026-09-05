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

type Path = { analysisIds: string[]; states: string[] };
function unique(values: string[]) { return [...new Set(values)]; }

export function buildInvestigationEngine(
  graph: IntelligenceGraph,
  definitions: IrisAnalysisDefinition[],
): { architecture_version: "IRIS_INVESTIGATION_ENGINE_V3"; investigations: IrisInvestigation[]; counts: { generated: number; ready: number; evidence_limited: number; graph_paths: number } } {
  const definitionById = new Map(definitions.map(definition => [definition.id, definition]));
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const outgoing = new Map<string, IntelligenceGraphEdge[]>();
  for (const edge of graph.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }

  const analysisNodeIds = graph.nodes.filter(node => node.kind === "analysis").map(node => node.id);
  const paths: Path[] = [];
  const pathKeys = new Set<string>();

  for (const analysisNodeId of analysisNodeIds) {
    const analysisId = decodeURIComponent(analysisNodeId.slice("analysis:".length));
    const definition = definitionById.get(analysisId);
    if (!definition) continue;
    const outputs = (outgoing.get(analysisNodeId) ?? []).filter(edge => edge.relation === "supports").map(edge => edge.to);
    for (const outputStateId of outputs) {
      const nextAnalyses = (outgoing.get(outputStateId) ?? []).filter(edge => edge.relation === "depends_on").map(edge => edge.to);
      const targets = nextAnalyses.length ? nextAnalyses : [undefined];
      for (const targetNodeId of targets) {
        const targetId = targetNodeId ? decodeURIComponent(targetNodeId.slice("analysis:".length)) : undefined;
        const targetDefinition = targetId ? definitionById.get(targetId) : undefined;
        const analysisIds = targetDefinition ? [analysisId, targetId!] : [analysisId];
        const states = unique([...definition.inputs, definition.output, ...(targetDefinition ? targetDefinition.inputs : []), ...(targetDefinition ? [targetDefinition.output] : [])]);
        const key = `${analysisIds.join("|")}::${states.join("|")}`;
        if (!pathKeys.has(key)) { pathKeys.add(key); paths.push({ analysisIds, states }); }
      }
    }
  }

  const contextNodes = graph.nodes.filter(node => ["account", "merchant", "domain", "category"].includes(node.kind) && node.observed);
  const investigations: IrisInvestigation[] = [];
  for (const path of paths) {
    const defs = path.analysisIds.map(id => definitionById.get(id)).filter((definition): definition is IrisAnalysisDefinition => Boolean(definition));
    if (!defs.length) continue;
    const contexts: IntelligenceGraphNode[][] = contextNodes.length ? contextNodes.map(node => [node]) : [[]];
    for (const context of contexts.slice(0, 24)) {
      const labels = context.map(node => node.label);
      const families = unique(defs.map(definition => definition.family));
      const names = defs.map(definition => definition.name).filter(Boolean);
      const ready = path.states.every(state => nodeById.get(`state:${encodeURIComponent(state)}`)?.observed === true);
      const contextSuffix = labels.length ? ` for ${labels.join(" / ")}` : "";
      const idContext = context.map(node => node.id).join("|") || "global";
      const id = `investigation:path:${path.analysisIds.join("+")}:${idContext}`;
      const analysisSummary = names.length ? names.join(" → ") : families.join(" + ");
      const missingStates = path.states.filter(state => nodeById.get(`state:${encodeURIComponent(state)}`)?.observed !== true);
      investigations.push({
        id,
        question: `What does ${analysisSummary} establish${contextSuffix}, which observed evidence supports the relationship, and what unresolved condition should Iris test next?`,
        purpose: `${families.join(" + ")} analysis path across explicit evidence dependencies${labels.length ? ` in the ${labels.join(" / ")} context` : ""}.`,
        analysis_ids: path.analysisIds,
        entity_context: context.map(node => node.id),
        evidence_required: path.states,
        status: ready ? "ready" : "evidence_limited",
        rationale: ready
          ? `This investigation follows ${path.analysisIds.length} connected analytical step${path.analysisIds.length === 1 ? "" : "s"} through the current evidence graph; all required states are currently observed.`
          : `The graph exposes this analytical path, but required state evidence is incomplete: ${missingStates.join(", ") || "provider evidence is not certified"}. Iris must not treat the relationship as established beyond the available evidence.`,
      });
    }
  }

  const deduped = [...new Map(investigations.map(item => [item.id, item])).values()];
  const ready = deduped.filter(item => item.status === "ready").length;
  return { architecture_version: "IRIS_INVESTIGATION_ENGINE_V3", investigations: deduped, counts: { generated: deduped.length, ready, evidence_limited: deduped.length - ready, graph_paths: paths.length } };
}
