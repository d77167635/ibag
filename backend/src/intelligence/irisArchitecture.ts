/**
 * Executable architecture contract for Iris.
 *
 * This registry is deliberately provider-neutral above ingestion. Plaid is a
 * connection/ingestion mechanism; Supabase is the canonical application
 * source of truth; Iris owns presentation and intelligence.
 */
export const IRIS_ARCHITECTURE_VERSION = "IRIS_HYBRID_SUPABASE_V1" as const;

export const IRIS_DATA_PLANE = {
  connection: "plaid_link",
  provider_ingestion: "plaid_authorized_data",
  raw_source_of_truth: "supabase_raw_evidence",
  canonical_source_of_truth: "supabase_canonical_model",
  presentation: "iris",
} as const;

export const IRIS_DATA_INTEGRITY_GATES = [
  "provider_transmission",
  "supabase_receipt",
  "supabase_preservation",
  "canonicalization",
  "supabase_to_iris_delivery",
  "iris_input_mapping",
  "iris_display_mapping",
  "display_reconciliation",
  "intelligence_input_lineage",
  "intelligence_output_lineage",
] as const;

export const IRIS_INTELLIGENCE_FAMILIES = [
  "data_integrity",
  "semantics",
  "relationships",
  "temporal",
  "behavior",
  "patterns_anomalies",
  "explanation",
  "causal_mechanistic",
  "predictive",
  "scenario_counterfactual",
  "decision",
  "recommendation",
  "action_planning",
  "outcome",
  "learning",
  "adaptive",
  "emergent_discovery",
  "meta_intelligence",
] as const;

export const IRIS_COMPOSITION_RULES = {
  hierarchical_progression: true,
  arbitrary_valid_order: true,
  graph_cross_domain_edges: true,
  recursive_reuse_of_validated_outputs: true,
  bidirectional_lineage: true,
  bidirectional_learning: true,
  dynamic_capability_registry: true,
  artificial_depth_ceiling: false,
  runtime_resource_budget: true,
  cycles_allowed: false,
  fabricated_financial_values: false,
  provider_observation_creation: false,
  source_truth_mutation_by_intelligence: false,
  automatic_production_self_modification: false,
} as const;

export const IRIS_EVIDENCE_STATES = [
  "observed",
  "calculated",
  "inferred",
  "limited",
  "insufficient_evidence",
] as const;

export type IrisEvidenceState = (typeof IRIS_EVIDENCE_STATES)[number];

export type IrisLineageNode = {
  node_id: string;
  node_type: "provider_observation" | "supabase_raw" | "supabase_canonical" | "iris_input" | "intelligence" | "derived" | "validation" | "output";
  parent_ids: string[];
  source_paths: string[];
  evidence_state: IrisEvidenceState;
};

export function canEnterIntelligence(evidenceState: IrisEvidenceState, required: boolean): boolean {
  if (!required) return true;
  return evidenceState === "observed" || evidenceState === "calculated";
}

export function assertNoFabricatedFinancialData(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.fake_mock_or_seeded_data === true || record.financial_values_created === true || record.provider_observations_created === true) {
    throw new Error("IRIS_INTEGRITY_VIOLATION: fabricated or synthetic financial evidence cannot enter the intelligence plane");
  }
}

export function buildIrisArchitectureContract() {
  return {
    architecture_version: IRIS_ARCHITECTURE_VERSION,
    data_plane: IRIS_DATA_PLANE,
    integrity_gates: IRIS_DATA_INTEGRITY_GATES,
    intelligence_families: IRIS_INTELLIGENCE_FAMILIES,
    composition_rules: IRIS_COMPOSITION_RULES,
    evidence_states: IRIS_EVIDENCE_STATES,
    certification_boundary: "100% of applicable canonical user-data fields/records and every selected intelligence pathway must be accounted for, reconciled, lineage-complete, and evidence-valid before certification.",
  };
}
