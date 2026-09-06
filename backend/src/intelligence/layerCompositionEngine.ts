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
  order: string[];
};

const MAX_PATH_DEPTH = 6;
const MAX_COMPOSITIONS = 192;
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const overlap = (a: string[], b: string[]) => a.filter(x => b.includes(x));

function compatible(a: IrisAnalysisDefinition, b: IrisAnalysisDefinition) {
  return a.id !== b.id && (a.family === b.family || overlap(a.inputs, b.inputs).length > 0 || a.output === b.output);
}

function score(path: IrisAnalysisDefinition[], ready: Set<string>) {
  const families = unique(path.map(d => d.family));
  const outputs = unique(path.map(d => d.output));
  const shared = path.reduce((sum, d, i) => sum + (i === 0 ? d.inputs.length : overlap(path[i - 1].inputs, d.inputs).length), 0);
  const readyCount = path.filter(d => ready.has(d.id)).length;
  return Math.min(100, shared * 8 + Math.max(0, families.length - 1) * 14 + Math.min(outputs.length, 4) * 5 + readyCount * 7 + Math.max(0, path.length - 1) * 3);
}

/** Bounded ordered path planner. It constructs real paths rather than claiming arbitrary composition in metadata. */
export function buildLayerCompositionEngine(atlas: { definitions: IrisAnalysisDefinition[] }) {
  const definitions = atlas.definitions;
  const ready = new Set(definitions.filter((d: IrisAnalysisDefinition & { evidence_ready?: boolean }) => d.evidence_ready === true).map(d => d.id));
  const candidates: IrisLayerComposition[] = [];
  const seen = new Set<string>();
  const add = (path: IrisAnalysisDefinition[]) => {
    if (!path.length || path.length > MAX_PATH_DEPTH) return;
    const ids = path.map(d => d.id);
    const id = `path:${ids.join("->")}`;
    if (seen.has(id)) return;
    seen.add(id);
    const families = unique(path.map(d => d.family));
    const outputs = unique(path.map(d => d.output));
    const sharedInputs = unique(path.flatMap((d, i) => i === 0 ? d.inputs : overlap(path[i - 1].inputs, d.inputs)));
    const evidenceReady = path.every(d => ready.has(d.id));
    const creates = path.length > 1 && families.length > 1 && outputs.length > 1;
    candidates.push({
      id,
      layer_ids: ids,
      layer_names: path.map(d => d.name),
      families,
      shared_inputs: sharedInputs,
      outputs,
      evidence_ready: evidenceReady,
      analytical_value: score(path, ready),
      rationale: evidenceReady ? `Ordered composition ${path.map(d => d.name).join(" → ")} is evaluable from currently ready analytical inputs.` : `Ordered composition is defined, but one or more required analytical layers remain evidence-limited.`,
      creates_new_analysis: creates,
      proposed_analysis: creates ? { name: path.map(d => d.name).join(" × "), purpose: `Cross-layer ordered analysis combining ${path.map(d => d.purpose.toLowerCase()).join("; ")}.`, inputs: unique(path.flatMap(d => d.inputs)), output: `${path[path.length - 1].output}_ordered_relationship` } : null,
      order: ids,
    });
  };
  const walk = (path: IrisAnalysisDefinition[]) => {
    if (candidates.length >= MAX_COMPOSITIONS || path.length >= MAX_PATH_DEPTH) return;
    const last = path[path.length - 1];
    for (const next of definitions) {
      if (candidates.length >= MAX_COMPOSITIONS) break;
      if (path.some(d => d.id === next.id) || !compatible(last, next)) continue;
      const nextPath = [...path, next];
      add(nextPath);
      walk(nextPath);
    }
  };
  for (const start of definitions) {
    if (candidates.length >= MAX_COMPOSITIONS) break;
    add([start]);
    walk([start]);
  }
  const ranked = candidates.sort((a, b) => b.analytical_value - a.analytical_value || a.id.localeCompare(b.id));
  const readyCompositions = ranked.filter(c => c.evidence_ready);
  const newFeatureCandidates = ranked.filter(c => c.creates_new_analysis).slice(0, 48);
  const nextBest = ranked.filter(c => !c.evidence_ready).slice(0, 24).map(c => ({ id: c.id, layer_names: c.layer_names, missing_capability: c.layer_ids.find(id => !ready.has(id)) ?? null, analytical_value: c.analytical_value, rationale: c.rationale }));
  return {
    engine_version: "IRIS_LAYER_COMPOSITION_ENGINE_V2",
    max_path_depth: MAX_PATH_DEPTH,
    max_compositions: MAX_COMPOSITIONS,
    selection_policy: "Iris selects bounded ordered paths according to evidence readiness, semantic compatibility, incremental analytical value, and downstream uncertainty.",
    compositions: ranked.slice(0, MAX_COMPOSITIONS),
    best_ready_compositions: readyCompositions.slice(0, 48),
    next_best_missing_compositions: nextBest,
    new_analysis_features: newFeatureCandidates,
    counts: { one_layer: ranked.filter(c => c.layer_ids.length === 1).length, two_layer: ranked.filter(c => c.layer_ids.length === 2).length, multi_layer: ranked.filter(c => c.layer_ids.length > 2).length, evidence_ready: readyCompositions.length, evidence_limited: ranked.length - readyCompositions.length, new_analysis_features: newFeatureCandidates.length },
    principles: [
      "A single layer may be selected when it answers the question directly.",
      "Compatible layers may be composed in an explicit ordered path.",
      "Paths are bounded to prevent uncontrolled combinatorial expansion.",
      "Theoretical compatibility never becomes observed evidence.",
      "New analysis remains a candidate until validated and explicitly promoted by an administrator.",
      "No provider observations, financial values, probabilities, or actions are fabricated or executed.",
    ],
    generation: { source: "Iris analysis atlas and evidence readiness", financial_values_created: false, fake_mock_or_seeded_data: false, provider_observations_created: false, execution_capability: false },
  };
}
