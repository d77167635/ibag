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
};

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function overlap(a: string[], b: string[]) { return a.filter(x => b.includes(x)); }
function compatible(a: IrisAnalysisDefinition, b: IrisAnalysisDefinition) {
  const shared = overlap(a.inputs, b.inputs);
  const related = a.family === b.family || shared.length >= 1 || a.output === b.output;
  const forbidden = a.id === b.id;
  return !forbidden && related;
}
function score(a: IrisAnalysisDefinition, b: IrisAnalysisDefinition, shared: string[], ready: boolean) {
  let value = shared.length * 12;
  if (a.family !== b.family) value += 18;
  if (a.output !== b.output) value += 8;
  if (ready) value += 20;
  if (a.family === "synthesis" || b.family === "synthesis") value += 10;
  return Math.min(100, value);
}

/**
 * Chooses analytical layers dynamically instead of assuming one layer is the
 * complete intelligence path. Compositions are proposals over real evidence;
 * they never create provider observations or financial facts.
 */
export function buildLayerCompositionEngine(atlas: { definitions: IrisAnalysisDefinition[] }) {
  const definitions = atlas.definitions;
  const ready = new Set(definitions.filter((d: IrisAnalysisDefinition & { evidence_ready?: boolean }) => d.evidence_ready === true).map(d => d.id));
  const candidates: IrisLayerComposition[] = [];

  for (let i = 0; i < definitions.length; i += 1) {
    const a = definitions[i];
    const singleReady = ready.has(a.id);
    candidates.push({
      id: `layer1:${a.id}`,
      layer_ids: [a.id],
      layer_names: [a.name],
      families: [a.family],
      shared_inputs: a.inputs,
      outputs: [a.output],
      evidence_ready: singleReady,
      analytical_value: singleReady ? 55 : 20,
      rationale: singleReady ? `${a.name} is directly evaluable from the currently certified evidence inputs.` : `${a.name} is a defined analytical capability but remains limited by missing evidence: ${a.inputs.join(", ")}.`,
      creates_new_analysis: false,
      proposed_analysis: null,
    });
    for (let j = i + 1; j < definitions.length; j += 1) {
      const b = definitions[j];
      if (!compatible(a, b)) continue;
      const shared = overlap(a.inputs, b.inputs);
      const bothReady = ready.has(a.id) && ready.has(b.id);
      const families = unique([a.family, b.family]);
      const outputs = unique([a.output, b.output]);
      const crossDomain = a.family !== b.family;
      const creates = crossDomain && shared.length > 0 && outputs.length > 1;
      candidates.push({
        id: `layer2:${a.id}+${b.id}`,
        layer_ids: [a.id, b.id],
        layer_names: [a.name, b.name],
        families,
        shared_inputs: shared,
        outputs,
        evidence_ready: bothReady,
        analytical_value: score(a, b, shared, bothReady),
        rationale: bothReady ? `Combining ${a.name} with ${b.name} creates a jointly evaluable relationship across ${families.join(" + ")}.` : `The combination is theoretically compatible, but at least one layer is evidence-limited until its required inputs are observed and certified.`,
        creates_new_analysis: creates,
        proposed_analysis: creates ? { name: `${a.name} × ${b.name}`, purpose: `Cross-layer analysis connecting ${a.purpose.toLowerCase()} with ${b.purpose.toLowerCase()}.`, inputs: unique([...a.inputs, ...b.inputs]), output: `${a.output}_relationship` } : null,
      });
    }
  }

  const ranked = candidates.sort((a, b) => b.analytical_value - a.analytical_value || a.id.localeCompare(b.id));
  const readyCompositions = ranked.filter(c => c.evidence_ready);
  const newFeatureCandidates = ranked.filter(c => c.creates_new_analysis).slice(0, 24);
  const nextBest = ranked.filter(c => !c.evidence_ready).slice(0, 12).map(c => ({ id: c.id, layer_names: c.layer_names, missing_capability: c.layer_ids.find(id => !ready.has(id)) ?? null, analytical_value: c.analytical_value, rationale: c.rationale }));

  return {
    engine_version: "IRIS_LAYER_COMPOSITION_ENGINE_V1",
    selection_policy: "Iris may select one layer, a pair, or a bounded multi-layer pathway according to evidence readiness, compatibility, incremental analytical value, and downstream uncertainty.",
    compositions: ranked.slice(0, 96),
    best_ready_compositions: readyCompositions.slice(0, 24),
    next_best_missing_compositions: nextBest,
    new_analysis_features: newFeatureCandidates,
    counts: {
      one_layer: ranked.filter(c => c.layer_ids.length === 1).length,
      two_layer: ranked.filter(c => c.layer_ids.length === 2).length,
      evidence_ready: readyCompositions.length,
      evidence_limited: ranked.length - readyCompositions.length,
      new_analysis_features: newFeatureCandidates.length,
    },
    principles: [
      "A single layer may be selected when it answers the question directly.",
      "Two compatible layers may be combined when their evidence and semantics support a relationship.",
      "Additional layers should be added only when they contribute incremental analytical value.",
      "Theoretical compatibility is never represented as observed evidence.",
      "New analysis features are capability proposals until their required evidence is present.",
      "No provider observations, financial values, probabilities, or actions are fabricated or executed.",
    ],
    generation: { source: "Iris analysis atlas and evidence readiness", financial_values_created: false, fake_mock_or_seeded_data: false, provider_observations_created: false, execution_capability: false },
  };
}
