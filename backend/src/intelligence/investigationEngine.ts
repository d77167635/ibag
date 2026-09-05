import type { IntelligenceGraph } from "./intelligenceGraph.js";
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

/**
 * Turns the graph into investigations instead of forcing users to choose one
 * isolated feature. The planner is intentionally generative: every compatible
 * graph context can become a distinct investigation without a hard-coded
 * feature-count ceiling.
 */
export function buildInvestigationEngine(
  graph: IntelligenceGraph,
  definitions: IrisAnalysisDefinition[],
): { architecture_version: "IRIS_INVESTIGATION_ENGINE_V1"; investigations: IrisInvestigation[]; counts: { generated: number; ready: number; evidence_limited: number } } {
  const byFamily = new Map<string, IrisAnalysisDefinition[]>();
  for (const definition of definitions) {
    const list = byFamily.get(definition.family) ?? [];
    list.push(definition);
    byFamily.set(definition.family, list);
  }

  const entityNodes = graph.nodes.filter(node => ["account", "merchant", "domain", "category"].includes(node.kind));
  const investigations: IrisInvestigation[] = [];

  for (const [family, familyDefinitions] of byFamily) {
    if (!["causal", "decisions", "synthesis", "behavior", "spending", "cash_flow", "forecast"].includes(family)) continue;
    const analysisIds = familyDefinitions.map(definition => definition.id);
    const inputs = [...new Set(familyDefinitions.flatMap(definition => definition.inputs))];
    for (const entity of entityNodes) {
      const ready = entity.observed && familyDefinitions.length > 0;
      investigations.push({
        id: `investigation:${family}:${entity.id}`,
        question: `What is happening with ${entity.label}, why might it be happening, and what should be investigated next?`,
        purpose: `${family} investigation grounded in the observed ${entity.kind}.`,
        analysis_ids: analysisIds,
        entity_context: [entity.id],
        evidence_required: inputs,
        status: ready ? "ready" : "evidence_limited",
        rationale: ready
          ? `The ${family} analysis set and the ${entity.kind} are available within the current Iris evidence graph.`
          : `Iris identified a potentially useful ${family} investigation, but the entity is not backed by an observed evidence node.`,
      });
    }
  }

  const ready = investigations.filter(item => item.status === "ready").length;
  return {
    architecture_version: "IRIS_INVESTIGATION_ENGINE_V1",
    investigations,
    counts: { generated: investigations.length, ready, evidence_limited: investigations.length - ready },
  };
}
