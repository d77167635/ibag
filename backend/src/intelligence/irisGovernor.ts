export type IrisGovernorPolicy = {
  architecture_version: "IRIS_GOVERNOR_V1";
  customer_access: false;
  admin_only: true;
  production_promotion_requires_admin: true;
  execution_capability: false;
  money_movement_capability: false;
  fabricated_financial_data: false;
  provider_observations_created: false;
  external_knowledge_is_financial_evidence: false;
};

export type IrisGovernorOperation = {
  id: string;
  product_domains: string[];
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
  architecture_version: "IRIS_GOVERNOR_V3";
  user_iris: { available_on_every_screen: true; admin_controls_exposed: false };
  admin_iris: { available_only_to_admin: true; production_promotion_requires_admin: true };
  evidence_gate: { status: string; ready: boolean; financial_facts_created: false };
  inputs: { plaid_products: string[]; intelligence_layers: string[]; intelligence_outputs: string[]; composition_outputs: string[]; validation_outputs: string[] };
  composition_engine: { version: string; max_path_depth: number; max_compositions: number; generated: number; multi_layer_paths: number; evidence_ready_paths: number; candidate_features: number };
  validation: { architecture_version: string; validated_predictions: number; calibration: string; metrics: Record<string, number | null> };
  capabilities: {
    arbitrary_ordered_composition: boolean;
    cross_product_composition: boolean;
    cross_layer_composition: boolean;
    reusable_outputs: true;
    new_analysis_candidates: true;
    external_knowledge_separated_from_financial_evidence: true;
    production_self_promotion: false;
    money_movement: false;
  };
  governance: { candidate_requires_validation: true; validated_requires_admin_promotion: true; lineage_required: true; double_counting_prohibited: true };
  integrity: { fabricated_financial_data: false; provider_observations_created: false; execution_capability: false };
};

export function buildIrisGovernorPolicy(): IrisGovernorPolicy {
  return { architecture_version: "IRIS_GOVERNOR_V1", customer_access: false, admin_only: true, production_promotion_requires_admin: true, execution_capability: false, money_movement_capability: false, fabricated_financial_data: false, provider_observations_created: false, external_knowledge_is_financial_evidence: false };
}

export function evaluateIrisGovernorOperation(input: Omit<IrisGovernorOperation, "status" | "financial_values_created" | "provider_observations_created" | "execution_capability">): IrisGovernorOperation {
  const uniqueProducts = [...new Set(input.product_domains)];
  const uniqueLayers = [...new Set(input.layer_ids)];
  const order = input.order.filter(Boolean);
  const validOrder = order.length > 0 && new Set(order).size === order.length;
  const evidenceReady = input.evidence_ready && uniqueProducts.length > 0 && uniqueLayers.length > 0 && validOrder;
  return { ...input, product_domains: uniqueProducts, layer_ids: uniqueLayers, order, status: evidenceReady ? "candidate" : "rejected", evidence_ready: evidenceReady, financial_values_created: false, provider_observations_created: false, execution_capability: false, limitation: evidenceReady ? "Candidate analytics require validation and explicit administrator promotion before production use." : "Operation cannot be evaluated until its evidence boundary, inputs, and ordered operation path are complete." };
}

/** Final read-only assembly point. It records what the actual composition engine and validation engine have established. */
export function buildIrisGovernorAssembly(input: {
  evidenceGate: { status: string; ready: boolean };
  plaidProducts: string[];
  layers: string[];
  intelligenceOutputs: string[];
  compositionOutputs: string[];
  validationOutputs: string[];
  composition: { engine_version: string; max_path_depth?: number; max_compositions?: number; compositions?: Array<{ layer_ids: string[]; evidence_ready: boolean }>; new_analysis_features?: unknown[] };
  validation: { architecture_version: string; validated_predictions: number; calibration: string; metrics: Record<string, number | null> };
}): IrisGovernorAssembly {
  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];
  const compositions = input.composition.compositions ?? [];
  const multiLayerPaths = compositions.filter(c => c.layer_ids.length > 2).length;
  const evidenceReadyPaths = compositions.filter(c => c.evidence_ready).length;
  return {
    architecture_version: "IRIS_GOVERNOR_V3",
    user_iris: { available_on_every_screen: true, admin_controls_exposed: false },
    admin_iris: { available_only_to_admin: true, production_promotion_requires_admin: true },
    evidence_gate: { status: input.evidenceGate.status, ready: input.evidenceGate.ready, financial_facts_created: false },
    inputs: { plaid_products: uniq(input.plaidProducts), intelligence_layers: uniq(input.layers), intelligence_outputs: uniq(input.intelligenceOutputs), composition_outputs: uniq(input.compositionOutputs), validation_outputs: uniq(input.validationOutputs) },
    composition_engine: { version: input.composition.engine_version, max_path_depth: input.composition.max_path_depth ?? 0, max_compositions: input.composition.max_compositions ?? compositions.length, generated: compositions.length, multi_layer_paths: multiLayerPaths, evidence_ready_paths: evidenceReadyPaths, candidate_features: (input.composition.new_analysis_features ?? []).length },
    validation: { architecture_version: input.validation.architecture_version, validated_predictions: input.validation.validated_predictions, calibration: input.validation.calibration, metrics: input.validation.metrics },
    capabilities: {
      arbitrary_ordered_composition: Boolean(input.composition.max_path_depth && input.composition.max_path_depth > 2),
      cross_product_composition: input.plaidProducts.length > 1,
      cross_layer_composition: multiLayerPaths > 0,
      reusable_outputs: true,
      new_analysis_candidates: true,
      external_knowledge_separated_from_financial_evidence: true,
      production_self_promotion: false,
      money_movement: false,
    },
    governance: { candidate_requires_validation: true, validated_requires_admin_promotion: true, lineage_required: true, double_counting_prohibited: true },
    integrity: { fabricated_financial_data: false, provider_observations_created: false, execution_capability: false },
  };
}
