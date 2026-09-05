import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IrisGovernanceInput = {
  providerDomainIntelligence: any;
  sourceFidelity: any;
  integrity: any;
  evidenceGraph: any;
  intelligenceGraph: any;
  investigations: any;
  composition: any;
  layerComposition: any;
  higherOrderSynthesis: any;
  adversarialReasoning: any;
  counterfactualIntelligence: any;
  metaIntelligence: any;
  atlasDefinitions: IrisAnalysisDefinition[];
};

const canonicalProducts = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;

function countNodes(value: any): number { return Array.isArray(value?.nodes) ? value.nodes.length : 0; }
function hasEvidence(value: any): boolean { return value?.evidence_ready === true || value?.evidenceReady === true; }

/**
 * Iris is the supervisory intelligence layer. It does not replace Plaid's
 * provider truth or silently correct evidence. It continuously evaluates the
 * health of the entire intelligence chain and exposes explicit alerts when a
 * guarantee is not proven.
 */
export function buildIrisGovernance(input: IrisGovernanceInput) {
  const provider = input.providerDomainIntelligence ?? {};
  const source = input.sourceFidelity ?? {};
  const utilization = provider.utilization ?? {};
  const providerProducts = new Set(Array.isArray(utilization.products) ? utilization.products : []);
  const selectedItemId = provider.selected_item_id ?? null;
  const canonicalObserved = canonicalProducts.filter(product => providerProducts.has(product));
  const sameItem = utilization.same_item === true && Boolean(selectedItemId);
  const graphNodes = countNodes(input.evidenceGraph) + countNodes(input.intelligenceGraph);
  const alerts: string[] = [];

  if (canonicalObserved.length !== canonicalProducts.length) alerts.push(`Canonical Plaid evidence incomplete: ${canonicalObserved.length}/8 domains are usable in the selected Item.`);
  if (!sameItem) alerts.push("Same-Item evidence conjunction is not certified; higher-order cross-product synthesis must remain closed.");
  if (source.status && source.status !== "pass" && source.status !== "ready") alerts.push(`Source fidelity status is ${String(source.status)}; Iris must not present the chain as fully certified.`);
  if (!input.integrity?.valid && input.integrity) alerts.push("Canonical intelligence input integrity is not fully valid; affected analyses must remain evidence-bounded.");
  if (!provider.evidence_ready) alerts.push("Provider-domain evidence gate is closed.");
  if ((input.composition?.evidence_gate?.status ?? "") !== "pass" && input.composition?.evidence_gate) alerts.push("Higher-order composition evidence gate is not fully open.");

  return {
    architecture_version: "IRIS_SUPERVISORY_INTELLIGENCE_V1",
    role: "top_layer_supervisory_intelligence",
    authority: "Iris governs the use, combination, ordering, explanation, validation, and protection of downstream intelligence while Plaid remains the provider evidence source.",
    guarantees: {
      provider_truth_preserved: true,
      no_fake_mock_or_seeded_financial_data: true,
      evidence_gated_intelligence: true,
      same_item_required_for_cross_product_synthesis: true,
      downstream_outputs_must_remain_traceable: true,
      silent_correction_of_provider_data: false,
      money_movement_authority: false,
      automatic_parameter_change: false,
      automatic_model_promotion: false,
    },
    provider_chain: {
      canonical_domains: [...canonicalProducts],
      observed_domains: canonicalObserved,
      observed_count: canonicalObserved.length,
      complete: canonicalObserved.length === canonicalProducts.length,
      selected_item_id: selectedItemId,
      same_item: sameItem,
      utilization_products: Array.isArray(utilization.products) ? utilization.products : [],
      source_observations: utilization.source_observations ?? {},
    },
    supervision: {
      source_fidelity_status: source.status ?? null,
      higher_order_ready: source.ready_for_higher_order_intelligence === true,
      provider_evidence_ready: provider.evidence_ready === true,
      evidence_graph_nodes: graphNodes,
      atlas_defined_layers: input.atlasDefinitions.length,
      investigations: Array.isArray(input.investigations?.investigations) ? input.investigations.investigations.length : 0,
      adversarial_findings: Array.isArray(input.adversarialReasoning?.findings) ? input.adversarialReasoning.findings.length : 0,
      counterfactual_findings: Array.isArray(input.counterfactualIntelligence?.findings) ? input.counterfactualIntelligence.findings.length : 0,
    },
    composition_authority: {
      may_select_any_defined_layer: true,
      may_select_any_supported_subset: true,
      may_change_layer_order: true,
      may_mix_provider_domains_and_intelligence_layers: true,
      may_create_feature_proposals_from_supported_compositions: true,
      must_recheck_evidence_for_each_execution: true,
      must_preserve_provenance: true,
      must_withhold_unproven_results: true,
      materialized_subset_count_for_eight_provider_domains: 255,
      materialized_ordered_provider_sequences_for_eight_domains: 109600,
      ordering_note: "Provider-domain order is an execution-path concern; permutations are not treated as new provider facts. Iris may choose an order when downstream semantics make order material.",
    },
    learning_and_improvement: {
      bidirectional_pattern_learning_supported: true,
      learning_inputs: ["provider_evidence", "intelligence_outputs", "relationships", "uncertainty", "validation_results", "user_feedback", "feature_outcomes"],
      directionality: ["evidence_to_intelligence", "intelligence_to_validation", "outcome_to_learning", "learning_to_candidate_improvement"],
      automatic_self_modification: false,
      automatic_model_promotion: false,
      improvement_rule: "Iris may discover and record candidate improvements, but a candidate cannot silently change production logic or provider evidence semantics.",
    },
    alerts: alerts,
    status: alerts.length === 0 ? "governance_clear" : "governance_alert",
    certification: {
      fully_certified: false,
      reason: "Full certification requires fresh live execution, field-level provider-to-surface verification, output-to-surface verification, and current runtime lineage evidence. Governance never upgrades an unproven condition to 100%.",
    },
    protection_rule: "When any required chain condition is unproven, Iris raises an alert and constrains affected intelligence instead of guessing or silently substituting data.",
    evidence_state: hasEvidence(provider) ? "observed" : "limited",
  };
}
