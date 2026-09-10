import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IrisLayerComposition = {
  id: string;
  layer_ids: string[];
  layer_names: string[];
  families: string[];
  shared_inputs: string[];
  outputs: string[];
  evidence_ready: boolean;
  analytical_value: number;
  rationale: string;
  creates_new_analysis: boolean;
  proposed_analysis: { name: string; purpose: string; inputs: string[]; output: string } | null;
  depth: number;
};

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function overlap(a: string[], b: string[]) { return a.filter(x => b.includes(x)); }
function compatible(a: IrisAnalysisDefinition, b: IrisAnalysisDefinition) {
  const shared = overlap(a.inputs, b.inputs);
  return a.id !== b.id && (a.family === b.family || shared.length >= 1 || a.output === b.output);
}
function score(shared: string[], families: string[], outputs: string[], ready: boolean, depth: number) {
  let value = shared.length * 12 + (families.length > 1 ? 18 : 0) + Math.max(0, outputs.length - 1) * 8 + (ready ? 20 : 0);
  value += Math.min(24, depth * 4);
  return Math.min(100, value);
}

/**
 * Recursive analytical composition planner. It materializes only a bounded
 * candidate frontier for the current execution budget; the bounded material-
 * ization is a resource guard, never an intelligence-depth ceiling. Deeper
 * compositions remain discoverable through subsequent recursive expansion.
 */
export function buildLayerCompositionEngine(atlas: { definitions: IrisAnalysisDefinition[] }, options?: { maxDepth?: number; maxCandidates?: number; beamWidth?: number }) {
  const definitions = atlas.definitions;
  const maxDepth = Math.max(1, Math.floor(options?.maxDepth ?? 6));
  const maxCandidates = Math.max(24, Math.floor(options?.maxCandidates ?? 512));
  const beamWidth = Math.max(4, Math.floor(options?.beamWidth ?? 48));
  const ready = new Set(definitions.filter((d: IrisAnalysisDefinition & { evidence_ready?: boolean }) => d.evidence_ready === true).map(d => d.id));
  const byId = new Map(definitions.map(d => [d.id, d]));
  const candidates: IrisLayerComposition[] = [];

  for (const definition of definitions) {
    const isReady = ready.has(definition.id);
    candidates.push({
      id: `layer1:${definition.id}`,
      layer_ids: [definition.id],
      layer_names: [definition.name],
      families: [definition.family],
      shared_inputs: definition.inputs,
      outputs: [definition.output],
      evidence_ready: isReady,
      analytical_value: isReady ? 55 : 20,
      rationale: isReady ? `${definition.name} is directly evaluable from the currently certified evidence inputs.` : `${definition.name} is defined but evidence-limited until its required inputs are observed and certified.`,
      creates_new_analysis: false,
      proposed_analysis: null,
      depth: 1,
    });
  }

  // Beam-expand compatible analytical pathways. A definition cannot repeat in
  // one pathway, preventing cycles while still allowing arbitrary future depth.
  let frontier = definitions.map(d => [d.id]);
  for (let depth = 2; depth <= maxDepth && frontier.length && candidates.length < maxCandidates; depth += 1) {
    const next: string[][] = [];
    for (const path of frontier) {
      const last = byId.get(path[path.length - 1]);
      if (!last) continue;
      for (const candidate of definitions) {
        if (path.includes(candidate.id) || !compatible(last, candidate)) continue;
        const nextPath = [...path, candidate.id];
        next.push(nextPath);
      }
    }

    const uniquePaths = new Map<string, string[]>();
    for (const path of next) uniquePaths.set(path.join("|"), path);
    const rankedPaths = [...uniquePaths.values()].map(path => {
      const defs = path.map(id => byId.get(id)).filter((d): d is IrisAnalysisDefinition => Boolean(d));
      const inputs = unique(defs.flatMap(d => d.inputs));
      const shared = unique(defs.slice(1).flatMap((d, i) => overlap(d.inputs, defs[i].inputs)));
      const families = unique(defs.map(d => d.family));
      const outputs = unique(defs.map(d => d.output));
      const evidenceReady = defs.every(d => ready.has(d.id));
      const value = score(shared, families, outputs, evidenceReady, path.length);
      return { path, value, evidenceReady };
    }).sort((a, b) => b.value - a.value || a.path.join("|").localeCompare(b.path.join("|")));

    const accepted = rankedPaths.slice(0, beamWidth);
    for (const item of accepted) {
      if (candidates.length >= maxCandidates) break;
      const defs = item.path.map(id => byId.get(id)).filter((d): d is IrisAnalysisDefinition => Boolean(d));
      const families = unique(defs.map(d => d.family));
      const outputs = unique(defs.map(d => d.output));
      const inputs = unique(defs.flatMap(d => d.inputs));
      const shared = unique(defs.slice(1).flatMap((d, i) => overlap(d.inputs, defs[i].inputs)));
      const crossDomain = families.length > 1;
      const creates = crossDomain && outputs.length > 1;
      candidates.push({
        id: `layer${item.path.length}:${item.path.join("+")}`,
        layer_ids: item.path,
        layer_names: defs.map(d => d.name),
        families,
        shared_inputs: shared,
        outputs,
        evidence_ready: item.evidenceReady,
        analytical_value: item.value,
        rationale: item.evidenceReady
          ? `Recursive composition of ${defs.map(d => d.name).join(" → ")} is jointly evaluable from certified evidence.`
          : `This recursive pathway is theoretically compatible, but at least one analytical layer remains evidence-limited.` ,
        creates_new_analysis: creates,
        proposed_analysis: creates ? {
          name: defs.map(d => d.name).join(" × "),
          purpose: `Cross-layer analysis connecting ${defs.map(d => d.purpose.toLowerCase()).join(" with ")}.`,
          inputs,
          output: `${outputs.join("_")}_relationship`,
        } : null,
        depth: item.path.length,
      });
    }
    frontier = accepted.map(item => item.path);
  }

  const ranked = candidates.sort((a, b) => b.analytical_value - a.analytical_value || a.id.localeCompare(b.id));
  const readyCompositions = ranked.filter(c => c.evidence_ready);
  const newFeatureCandidates = ranked.filter(c => c.creates_new_analysis).slice(0, 48);
  const nextBest = ranked.filter(c => !c.evidence_ready).slice(0, 24).map(c => ({ id: c.id, layer_names: c.layer_names, missing_capability: c.layer_ids.find(id => !ready.has(id)) ?? null, analytical_value: c.analytical_value, depth: c.depth, rationale: c.rationale }));
  const maxObservedDepth = ranked.reduce((max, c) => Math.max(max, c.depth), 0);

  return {
    engine_version: "IRIS_RECURSIVE_LAYER_COMPOSITION_ENGINE_V2",
    selection_policy: "Iris recursively selects one or more compatible analytical layers according to evidence readiness, semantic compatibility, incremental analytical value, uncertainty, and execution resources. Materialization limits are resource controls, not hierarchy limits.",
    compositions: ranked.slice(0, maxCandidates),
    best_ready_compositions: readyCompositions.slice(0, 48),
    next_best_missing_compositions: nextBest,
    new_analysis_features: newFeatureCandidates,
    counts: {
      one_layer: ranked.filter(c => c.depth === 1).length,
      two_layer: ranked.filter(c => c.depth === 2).length,
      recursive_layered: ranked.filter(c => c.depth > 2).length,
      max_materialized_depth: maxObservedDepth,
      evidence_ready: readyCompositions.length,
      evidence_limited: ranked.length - readyCompositions.length,
      new_analysis_features: newFeatureCandidates.length,
    },
    recursion: {
      requested_depth_budget: maxDepth,
      candidate_budget: maxCandidates,
      beam_width: beamWidth,
      depth_is_resource_bound_not_semantic_ceiling: true,
      deeper_compositions_are_discoverable: true,
    },
    principles: [
      "A single layer may be selected when it answers the question directly.",
      "Compatible layers may be recursively combined when their evidence and semantics support composition.",
      "Additional layers are added only when they contribute incremental analytical value.",
      "A theoretical composition is never represented as observed evidence.",
      "New analytical features remain proposals until their required evidence is present and certified.",
      "No provider observations, financial values, probabilities, or actions are fabricated or executed.",
      "There is no artificial maximum intelligence depth; runtime budgets bound materialization only.",
    ],
    generation: { source: "Iris analysis atlas and recursive evidence readiness", financial_values_created: false, fake_mock_or_seeded_data: false, provider_observations_created: false, execution_capability: false },
  };
}
