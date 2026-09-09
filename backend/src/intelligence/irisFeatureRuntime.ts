import {
  IRIS_FEATURE_REGISTRY,
  evaluateIrisFeatureState,
  type IrisFeatureActivation,
  type IrisFeatureState,
} from "../contracts/irisFeatureRegistry.js";

export interface IrisFeatureRuntimeSnapshot {
  registry_version: "IRIS_FEATURE_REGISTRY_V1";
  features: IrisFeatureState[];
  enabled_count: number;
  ready_count: number;
  limited_count: number;
  insufficient_evidence_count: number;
  blocked_count: number;
}

export interface IrisFeatureRuntimeInput {
  /** User feature preferences. Missing entries are enabled by default. */
  activations?: Record<string, IrisFeatureActivation>;
  /**
   * Evidence-engine output keyed by feature id. Values must represent only
   * persisted/validated evidence; this layer performs no provider discovery.
   */
  evidenceCoverage?: Record<string, number>;
  /**
   * Optional hard blockers from upstream analytical readiness, keyed by
   * feature id. Provider-product selection remains a separate boundary.
   */
  blockers?: Record<string, string[]>;
}

/**
 * Builds the runtime feature state from authoritative registry metadata plus
 * evidence-engine output. Plaid product selection is intentionally not
 * reimplemented here: provider availability, consent, entitlement,
 * commercial terms, and observed evidence remain owned by the Plaid decision
 * engine. This layer consumes the resulting evidence boundary only.
 */
export function buildIrisFeatureRuntime(input: IrisFeatureRuntimeInput = {}): IrisFeatureRuntimeSnapshot {
  const features = IRIS_FEATURE_REGISTRY.map((feature) => {
    const activation = input.activations?.[feature.featureId] ?? "enabled";
    const evidenceCoverage = input.evidenceCoverage?.[feature.featureId] ?? 0;
    const blockers = input.blockers?.[feature.featureId] ?? [];

    return evaluateIrisFeatureState(feature, {
      activation,
      evidenceCoverage,
      blockers,
    });
  });

  return {
    registry_version: "IRIS_FEATURE_REGISTRY_V1",
    features,
    enabled_count: features.filter((feature) => feature.activation === "enabled").length,
    ready_count: features.filter((feature) => feature.readiness === "ready").length,
    limited_count: features.filter((feature) => feature.readiness === "limited").length,
    insufficient_evidence_count: features.filter((feature) => feature.readiness === "insufficient_evidence").length,
    blocked_count: features.filter((feature) => feature.readiness === "blocked").length,
  };
}
