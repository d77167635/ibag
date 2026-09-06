import { IRIS_ARCHITECTURE_VERSION, IRIS_DATA_PLANE } from "./irisArchitecture.js";

export type IrisGovernorPolicy = {
  architecture_version: "IRIS_GOVERNOR_V5";
  customer_access: true;
  admin_only: false;
  production_self_modification: false;
  governed_promotion_required: true;
  execution_capability: false;
  money_movement_capability: false;
  fabricated_financial_data: false;
  provider_observations_created: false;
  external_knowledge_is_financial_evidence: false;
  canonical_source_of_truth: "supabase";
  ingestion_mechanism: "plaid_link";
};

export type IrisGovernorOperation = {
  id: string;
  data_domains: string[];
  layer_ids: string[];
  operation: string;
  order: string[];
  status: "candidate" | "validated" | "promoted" | "rejected";
  evidence_ready: boolean;
  creates_new_analysis: boolean;
  financial_values_created: false;
  provider_observations_created: false;
  execution_capability: false;
  limitation: string | null;
};

export type IrisGovernorAssembly = {
  architecture_version: "IRIS_GOVERNOR_V5";
  iris: { available_on_every_screen: true; supreme_intelligence: true; governs_all_intelligence: true; customer_facing_governance_controls: false };
  evidence_gate: { status: string; ready: boolean; financial_facts_created: false };
  data_plane: typeof IRIS_DATA_PLANE;
  inputs: { data_domains: string[]; intelligence_layers: string[]; intelligence_outputs: string[]; composition_outputs: string[]; validation_outputs: string[] };
  composition_engine: { version: string; max_path_depth: number; max_compositions: number; generated: number; multi_layer_paths: number; evidence_ready_paths: number; candidate_features: number; intelligence_depth_ceiling: null; path_generation: "lazy_recursive_cycle_safe" };
  validation: { architecture_version: string; validated_predictions: number; calibration: string; metrics: Record<string, number | null> };
  capabilities: { arbitrary_ordered_composition: true; cross_domain_composition: boolean; cross_layer_composition: boolean; recursive_unbounded_depth: true; reusable_outputs: true; new_analysis_candidates: true; bidirectional_learning: true; reverse_lineage: true; external_knowledge_separated_from_financial_evidence: true; production_self_promotion: false; money_movement: false };
  governance: { candidate_requires_validation: true; validated_requires_governed_promotion: true; customer_admin_role_required: false; lineage_required: true; double_counting_prohibited: true; cycles_prohibited: true; evidence_gate_precedes_promotion: true; source_truth_mutation_by_intelligence: false };
  integrity: { fabricated_financial_data: false; provider_observations_created: false; execution_capability: false };
};

export function buildIrisGovernorPolicy(): IrisGovernorPolicy {
  return { architecture_version: "IRIS_GOVERNOR_V5", customer_access: true, admin_only: false, production_self_modification: false, governed_promotion_required: true, execution_capability: false, money_movement_capability: false, fabricated_financial_data: false, provider_observations_created: false, external_knowledge_is_financial_evidence: false, canonical_source_of_truth: "supabase", ingestion_mechanism: "plaid_link" };
}

export function evaluateIrisGovernorOperation(input: Omit<IrisGovernorOperation, "status" | "financial_values_created" | "provider_observations_created" | "execution_capability">): IrisGovernorOperation {
  const uniqueDomains = [...new Set(input.data_domains.filter(Boolean))];
  const uniqueLayers = [...new Set(input.layer_ids.filter(Boolean))];
  const order = input.order.filter(Boolean);
  const validOrder = order.length > 0 && new Set(order).size === order.length;
  const evidenceReady = input.evidence_ready && uniqueDomains.length > 0 && uniqueLayers.length > 0 && validOrder;
  return { ...input, data_domains: uniqueDomains, layer_ids: uniqueLayers, order, status: evidenceReady ? "candidate" : "rejected", evidence_ready: evidenceReady, financial_values_created: false, provider_observations_created: false, execution_capability: false, limitation: evidenceReady ? "Candidate analytics require validation and governed promotion; Iris never silently changes production intelligence." : "Operation cannot be evaluated until its evidence boundary, inputs, and ordered operation path are complete." };
}

/** Final read-only governance assembly. Runtime materialization is bounded for safety, not intelligence depth. */
export function buildIrisGovernorAssembly(input: {
  evidenceGate: { status: string; ready: boolean };
  dataDomains?: string[];
  /** @deprecated Compatibility alias for older callers; values are treated only as domain identifiers. */
  plaidProducts?: string[];
  layers: string[];
  intelligenceOutputs: string[];
  compositionOutputs: string[];
  validationOutputs: string[];
  composition: { engine_version: string; max_path_depth?: number; max_compositions?: number; compositions?: Array<{ layer_ids: string[]; evidence_ready: boolean }>; new_analysis_features?: unknown[] };
  validation: { architecture_version: string; validated_predictions: number; calibration: string; metrics: Record<string, number | null> };
}): IrisGovernorAssembly {
  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];
  const dataDomains = uniq(input.dataDomains ?? input.plaidProducts ?? []);
  const compositions = input.composition.compositions ?? [];
  const multiLayerPaths = compositions.filter(c => c.layer_ids.length > 2).length;
  const evidenceReadyPaths = compositions.filter(c => c.evidence_ready).length;
  return {
    architecture_version: "IRIS_GOVERNOR_V5",
    iris: { available_on_every_screen: true, supreme_intelligence: true, governs_all_intelligence: true, customer_facing_governance_controls: false },
    evidence_gate: { status: input.evidenceGate.status, ready: input.evidenceGate.ready, financial_facts_created: false },
    data_plane: IRIS_DATA_PLANE,
    inputs: { data_domains: dataDomains, intelligence_layers: uniq(input.layers), intelligence_outputs: uniq(input.intelligenceOutputs), composition_outputs: uniq(input.compositionOutputs), validation_outputs: uniq(input.validationOutputs) },
    composition_engine: { version: `${IRIS_ARCHITECTURE_VERSION}:${input.composition.engine_version}`, max_path_depth: input.composition.max_path_depth ?? 0, max_compositions: input.composition.max_compositions ?? compositions.length, generated: compositions.length, multi_layer_paths: multiLayerPaths, evidence_ready_paths: evidenceReadyPaths, candidate_features: (input.composition.new_analysis_features ?? []).length, intelligence_depth_ceiling: null, path_generation: "lazy_recursive_cycle_safe" },
    validation: { architecture_version: input.validation.architecture_version, validated_predictions: input.validation.validated_predictions, calibration: input.validation.calibration, metrics: input.validation.metrics },
    capabilities: { arbitrary_ordered_composition: true, cross_domain_composition: dataDomains.length > 1, cross_layer_composition: multiLayerPaths > 0 || input.layers.length > 1, recursive_unbounded_depth: true, reusable_outputs: true, new_analysis_candidates: true, bidirectional_learning: true, reverse_lineage: true, external_knowledge_separated_from_financial_evidence: true, production_self_promotion: false, money_movement: false },
    governance: { candidate_requires_validation: true, validated_requires_governed_promotion: true, customer_admin_role_required: false, lineage_required: true, double_counting_prohibited: true, cycles_prohibited: true, evidence_gate_precedes_promotion: true, source_truth_mutation_by_intelligence: false },
    integrity: { fabricated_financial_data: false, provider_observations_created: false, execution_capability: false },
  };
}
