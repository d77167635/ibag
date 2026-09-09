/**
 * Authoritative runtime boundary between Plaid product decisions, observed
 * evidence, Iris feature readiness, and analytical composition.
 *
 * This contract deliberately performs no provider I/O and creates no financial
 * facts. It only reconciles already-certified upstream state into a truthful
 * feature/intelligence readiness model.
 */
import {
  IRIS_FEATURE_REGISTRY,
  evaluateIrisFeatureState,
  type IrisFeatureDefinition,
  type IrisFeatureState,
  type IrisEvidenceStatus,
} from "./irisFeatureRegistry.js";
import type { PlaidDecisionState } from "./plaidProductDecision.js";

export interface IrisProductRuntimeInput {
  product: string;
  capabilityIds: string[];
  decision: PlaidDecisionState;
  evidenceStatus: "observed" | "not_observed" | "not_available";
  availableToIris: boolean;
}

export interface IrisFeatureRuntimeInput {
  activationByFeatureId?: Record<string, "enabled" | "disabled">;
  evidenceCoverageByCapabilityId?: Record<string, number>;
  evidenceStatusByFeatureId?: Record<string, Record<string, IrisEvidenceStatus>>;
  blockersByCapabilityId?: Record<string, string[]>;
  productDecisions?: IrisProductRuntimeInput[];
}

export interface IrisFeatureRuntimeState extends IrisFeatureState {
  featureVersion: string;
  capabilityId: string;
  name: string;
  family: string;
  prerequisites: string[];
  requiredEvidence: string[];
  evidencePolicy: "all";
  intelligenceOutputs: string[];
  uiSurfaces: string[];
  educationSurfaces: string[];
  interactionModes: string[];
  supportingProducts: string[];
  observedSupportingProducts: string[];
}

function productNamesForFeature(feature: IrisFeatureDefinition, products: IrisProductRuntimeInput[]) {
  const related = products.filter((product) =>
    product.availableToIris &&
    product.capabilityIds.includes(feature.capabilityId) &&
    (product.decision === "selected" || product.decision === "eligible_awaiting_evidence"),
  );
  return {
    supporting: [...new Set(related.map((product) => product.product))],
    observed: [...new Set(related
      .filter((product) => product.decision === "selected" && product.evidenceStatus === "observed")
      .map((product) => product.product))],
  };
}

/**
 * Reconciles the feature registry with upstream Plaid product decisions.
 * Feature activation is independent from provider-product activation.
 */
export function buildIrisIntelligenceRuntime(input: IrisFeatureRuntimeInput = {}) {
  const products = input.productDecisions ?? [];
  const states: IrisFeatureRuntimeState[] = IRIS_FEATURE_REGISTRY.map((feature) => {
    const activation = input.activationByFeatureId?.[feature.featureId] ?? "enabled";
    const explicitEvidence = input.evidenceStatusByFeatureId?.[feature.featureId];
    const evidenceCoverage = explicitEvidence
      ? undefined
      : input.evidenceCoverageByCapabilityId?.[feature.capabilityId] ?? 0;
    const blockers = [...(input.blockersByCapabilityId?.[feature.capabilityId] ?? [])];
    const productLinks = productNamesForFeature(feature, products);
    const state = evaluateIrisFeatureState(feature, {
      activation,
      evidenceCoverage,
      evidenceStatusById: explicitEvidence,
      blockers,
    });
    return {
      ...state,
      featureVersion: feature.version,
      capabilityId: feature.capabilityId,
      name: feature.name,
      family: feature.family,
      prerequisites: feature.prerequisites,
      requiredEvidence: feature.requiredEvidence,
      evidencePolicy: feature.evidencePolicy,
      intelligenceOutputs: feature.intelligenceOutputs,
      uiSurfaces: feature.uiSurfaces,
      educationSurfaces: feature.educationSurfaces,
      interactionModes: feature.interactionModes,
      supportingProducts: productLinks.supporting,
      observedSupportingProducts: productLinks.observed,
    };
  });

  const ready = states.filter((state) => state.readiness === "ready");
  const limited = states.filter((state) => state.readiness === "limited");
  const insufficientEvidence = states.filter((state) => state.readiness === "insufficient_evidence");
  const blocked = states.filter((state) => state.readiness === "blocked");

  return {
    engine_version: "IRIS_INTELLIGENCE_RUNTIME_V2",
    registry_version: "IRIS_FEATURE_REGISTRY_V2",
    states,
    available_features: states.filter((state) => state.available),
    ready_features: ready,
    limited_features: limited,
    evidence_limited_features: insufficientEvidence,
    blocked_features: blocked,
    counts: {
      total_features: states.length,
      available: states.filter((state) => state.available).length,
      ready: ready.length,
      limited: limited.length,
      insufficient_evidence: insufficientEvidence.length,
      blocked: blocked.length,
    },
    provider_boundary: {
      product_decisions_consumed: products.length,
      observed_product_decisions: products.filter((product) => product.decision === "selected" && product.evidenceStatus === "observed").length,
      feature_activation_is_independent: true,
      feature_activation_does_not_activate_provider_products: true,
    },
    integrity: {
      financial_values_created: false,
      provider_observations_created: false,
      fake_mock_or_seeded_data: false,
      unobserved_evidence_promoted: false,
      money_movement_executed: false,
    },
  };
}
