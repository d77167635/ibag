import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureRuntimeSnapshot } from "./irisFeatureRuntime.js";

type AtlasDefinition = {
  id: string;
  family: string;
  name: string;
  purpose: string;
  output: string;
  evidence_ready: boolean;
  missing_inputs: string[];
};

export type IrisIntelligenceOutputState =
  | "ready"
  | "limited"
  | "suppressed";

export interface IrisIntelligenceOutput {
  analysis_id: string;
  analysis_name: string;
  family: string;
  output: string;
  purpose: string;
  feature_id: string | null;
  capability_id: string | null;
  state: IrisIntelligenceOutputState;
  evidence_coverage: number;
  blockers: string[];
  missing_evidence: string[];
}

/**
 * Final publication boundary between analytical definitions and user-facing
 * Iris intelligence. This function never computes financial facts. It only
 * decides whether an already-computed analytical definition may be exposed
 * according to the authoritative feature runtime.
 */
export function buildIrisIntelligenceOutputRuntime(
  atlas: { definitions: AtlasDefinition[] },
  featureRuntime: IrisFeatureRuntimeSnapshot,
) {
  const states = new Map(featureRuntime.features.map((state) => [state.featureId, state]));
  const definitions = atlas.definitions.map((definition) => {
    const feature = IRIS_FEATURE_REGISTRY.find((candidate) =>
      candidate.requiredEvidence.includes(definition.id),
    );
    const state = feature ? states.get(feature.featureId) : undefined;

    if (!feature || !state) {
      return {
        analysis_id: definition.id,
        analysis_name: definition.name,
        family: definition.family,
        output: definition.output,
        purpose: definition.purpose,
        feature_id: feature?.featureId ?? null,
        capability_id: feature?.capabilityId ?? null,
        state: "suppressed" as const,
        evidence_coverage: 0,
        blockers: ["feature_runtime_unmapped"],
        missing_evidence: definition.missing_inputs,
      } satisfies IrisIntelligenceOutput;
    }

    if (state.readiness === "ready") {
      return {
        analysis_id: definition.id,
        analysis_name: definition.name,
        family: definition.family,
        output: definition.output,
        purpose: definition.purpose,
        feature_id: feature.featureId,
        capability_id: feature.capabilityId,
        state: "ready" as const,
        evidence_coverage: state.evidenceCoverage,
        blockers: [],
        missing_evidence: definition.missing_inputs,
      } satisfies IrisIntelligenceOutput;
    }

    if (state.readiness === "limited") {
      return {
        analysis_id: definition.id,
        analysis_name: definition.name,
        family: definition.family,
        output: definition.output,
        purpose: definition.purpose,
        feature_id: feature.featureId,
        capability_id: feature.capabilityId,
        state: "limited" as const,
        evidence_coverage: state.evidenceCoverage,
        blockers: state.blockers,
        missing_evidence: definition.missing_inputs,
      } satisfies IrisIntelligenceOutput;
    }

    return {
      analysis_id: definition.id,
      analysis_name: definition.name,
      family: definition.family,
      output: definition.output,
      purpose: definition.purpose,
      feature_id: feature.featureId,
      capability_id: feature.capabilityId,
      state: "suppressed" as const,
      evidence_coverage: state.evidenceCoverage,
      blockers: state.blockers,
      missing_evidence: definition.missing_inputs,
    } satisfies IrisIntelligenceOutput;
  });

  const ready = definitions.filter((item) => item.state === "ready");
  const limited = definitions.filter((item) => item.state === "limited");
  const suppressed = definitions.filter((item) => item.state === "suppressed");

  return {
    engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V1",
    outputs: definitions,
    publishable: [...ready, ...limited],
    ready_outputs: ready,
    limited_outputs: limited,
    suppressed_outputs: suppressed,
    counts: {
      defined: definitions.length,
      publishable: ready.length + limited.length,
      ready: ready.length,
      limited: limited.length,
      suppressed: suppressed.length,
    },
    publication_policy: {
      ready: "Publish normally with evidence/provenance metadata.",
      limited: "Publish only with explicit evidence limitation/qualification.",
      suppressed: "Do not publish as normal intelligence; expose the evidence gap or blocker instead.",
      catalog_metadata_alone_is_not_evidence: true,
    },
    integrity: {
      financial_values_created: false,
      provider_observations_created: false,
      fake_mock_or_seeded_data: false,
      suppressed_claims_published: false,
      money_movement_executed: false,
    },
  };
}
