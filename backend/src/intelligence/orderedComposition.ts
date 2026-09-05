import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type OrderedLayerPath = {
  layer_ids: string[];
  layer_names: string[];
  order_sensitive: boolean;
  inputs: string[];
  outputs: string[];
  families: string[];
  evidence_ready: boolean;
  rationale: string;
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/**
 * Plans an arbitrary non-empty ordered path over Iris analysis definitions.
 * It does not fabricate compatibility: every requested layer must exist and
 * its evidence readiness is evaluated independently at execution time.
 */
export function planOrderedLayerPath(definitions: IrisAnalysisDefinition[], requestedLayerIds: string[]): OrderedLayerPath {
  if (!requestedLayerIds.length) throw new Error("An Iris ordered composition requires at least one layer.");
  const byId = new Map(definitions.map(definition => [definition.id, definition]));
  const selected = requestedLayerIds.map(id => byId.get(id));
  if (selected.some(value => !value)) throw new Error("Iris ordered composition contains an undefined layer.");
  const layers = selected as IrisAnalysisDefinition[];
  const duplicateIds = requestedLayerIds.filter((id, index) => requestedLayerIds.indexOf(id) !== index);
  if (duplicateIds.length) throw new Error("An Iris execution path cannot execute the same analytical layer twice in one path.");
  const inputs = unique(layers.flatMap(layer => layer.inputs));
  const outputs = unique(layers.map(layer => layer.output));
  const families = unique(layers.map(layer => layer.family));
  const evidenceReady = layers.every(layer => (layer as IrisAnalysisDefinition & { evidence_ready?: boolean }).evidence_ready !== false);
  return {
    layer_ids: requestedLayerIds,
    layer_names: layers.map(layer => layer.name),
    order_sensitive: layers.length > 1,
    inputs,
    outputs,
    families,
    evidence_ready: evidenceReady,
    rationale: evidenceReady
      ? `Iris may execute the selected ${layers.length}-layer path in the requested order while preserving shared evidence and provenance.`
      : "At least one selected layer is evidence-limited; Iris must withhold any result that depends on the missing evidence.",
  };
}

/** Number of ordered non-empty paths across n distinct layers: sum P(n,k). */
export function orderedPathCount(layerCount: number): number {
  if (!Number.isInteger(layerCount) || layerCount < 0) return 0;
  let total = 0;
  let permutations = 1;
  for (let k = 1; k <= layerCount; k += 1) {
    permutations *= layerCount - k + 1;
    total += permutations;
  }
  return total;
}
