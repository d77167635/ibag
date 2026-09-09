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

export type IrisIntelligenceOutputState = "ready" | "limited" | "suppressed";
export type IrisEvidencePublicationState = "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence" | "unknown";

export interface IrisIntelligenceOutput {
  analysis_id: string;
  analysis_name: string;
  family: string;
  output: string;
  purpose: string;
  feature_id: string | null;
  capability_id: string | null;
  state: IrisIntelligenceOutputState;
  evidence_publication_state: IrisEvidencePublicationState;
  evidence_coverage: number;
  evidence_basis: "atlas_readiness" | "feature_runtime" | "none";
  blockers: string[];
  missing_evidence: string[];
  provenance: {
    source: "Iris analysis atlas";
    analytical_definition_id: string;
    provider_observations_created: false;
    financial_values_created: false;
    money_movement_executed: false;
  };
  qualification: string | null;
}

export interface IrisIntelligenceOutputRuntime {
  engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V2";
  outputs: IrisIntelligenceOutput[];
  publishable: IrisIntelligenceOutput[];
  ready_outputs: IrisIntelligenceOutput[];
  limited_outputs: IrisIntelligenceOutput[];
  suppressed_outputs: IrisIntelligenceOutput[];
  counts: { defined: number; publishable: number; ready: number; limited: number; suppressed: number };
  publication_policy: {
    ready: string;
    limited: string;
    suppressed: string;
    atlas_readiness_is_not_raw_provider_observation: true;
    catalog_metadata_alone_is_not_evidence: true;
    feature_to_analysis_mapping_is_one_to_many: true;
  };
  integrity: {
    financial_values_created: false;
    provider_observations_created: false;
    fake_mock_or_seeded_data: false;
    suppressed_claims_published: false;
    money_movement_executed: false;
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function provenance(analysisId: string): IrisIntelligenceOutput["provenance"] {
  return {
    source: "Iris analysis atlas",
    analytical_definition_id: analysisId,
    provider_observations_created: false,
    financial_values_created: false,
    money_movement_executed: false,
  };
}

/**
 * Final publication boundary between analytical definitions and user-facing
 * Iris intelligence. This function never computes financial facts. It carries
 * evidence qualification and provenance through the publication decision.
 *
 * The atlas is an analytical readiness boundary, not a raw provider-observation
 * ledger. Provider observation lineage remains owned by the governed run and
 * evidence layers; this runtime must never relabel atlas readiness as raw
 * provider observation.
 */
export function buildIrisIntelligenceOutputRuntime(
  atlas: { definitions: AtlasDefinition[] },
  featureRuntime: IrisFeatureRuntimeSnapshot,
): IrisIntelligenceOutputRuntime {
  const states = new Map(featureRuntime.features.map((state) => [state.featureId, state]));
  const definitions: IrisIntelligenceOutput[] = atlas.definitions.flatMap((definition): IrisIntelligenceOutput[] => {
    const features = IRIS_FEATURE_REGISTRY.filter((candidate) => candidate.requiredEvidence.includes(definition.id));

    if (features.length === 0) {
      return [{
        analysis_id: definition.id,
        analysis_name: definition.name,
        family: definition.family,
        output: definition.output,
        purpose: definition.purpose,
        feature_id: null,
        capability_id: null,
        state: "suppressed",
        evidence_publication_state: "insufficient_evidence",
        evidence_coverage: 0,
        evidence_basis: "none",
        blockers: ["feature_runtime_unmapped"],
        missing_evidence: definition.missing_inputs,
        provenance: provenance(definition.id),
        qualification: "Iris cannot publish this analysis because no authoritative feature is mapped to it.",
      }];
    }

    return features.map((feature): IrisIntelligenceOutput => {
      const state = states.get(feature.featureId);
      const coverage = state?.evidenceCoverage ?? 0;
      const blockers = unique(state?.blockers ?? []);
      const featureReady = state?.readiness === "ready";
      const featureLimited = state?.readiness === "limited";
      const atlasReady = definition.evidence_ready;

      if (!state) {
        return {
          analysis_id: definition.id,
          analysis_name: definition.name,
          family: definition.family,
          output: definition.output,
          purpose: definition.purpose,
          feature_id: feature.featureId,
          capability_id: feature.capabilityId,
          state: "suppressed",
          evidence_publication_state: "insufficient_evidence",
          evidence_coverage: 0,
          evidence_basis: "none",
          blockers: ["feature_runtime_state_missing"],
          missing_evidence: definition.missing_inputs,
          provenance: provenance(definition.id),
          qualification: "Iris cannot publish this analysis until its feature runtime state is available.",
        };
      }

      if (featureReady && atlasReady) {
        return {
          analysis_id: definition.id,
          analysis_name: definition.name,
          family: definition.family,
          output: definition.output,
          purpose: definition.purpose,
          feature_id: feature.featureId,
          capability_id: feature.capabilityId,
          state: "ready",
          evidence_publication_state: "calculated",
          evidence_coverage: coverage,
          evidence_basis: "atlas_readiness",
          blockers: [],
          missing_evidence: [],
          provenance: provenance(definition.id),
          qualification: null,
        };
      }

      if (featureLimited || (featureReady && !atlasReady)) {
        const missing = unique([
          ...definition.missing_inputs,
          ...(atlasReady ? [] : feature.requiredEvidence.filter((id) => id !== definition.id)),
        ]);
        return {
          analysis_id: definition.id,
          analysis_name: definition.name,
          family: definition.family,
          output: definition.output,
          purpose: definition.purpose,
          feature_id: feature.featureId,
          capability_id: feature.capabilityId,
          state: "limited",
          evidence_publication_state: "limited",
          evidence_coverage: coverage,
          evidence_basis: "feature_runtime",
          blockers: blockers.length ? blockers : ["analytical_evidence_limited"],
          missing_evidence: missing,
          provenance: provenance(definition.id),
          qualification: "Limited intelligence: the available evidence does not fully support this analysis. Iris should show the limitation and missing evidence rather than present a complete conclusion.",
        };
      }

      return {
        analysis_id: definition.id,
        analysis_name: definition.name,
        family: definition.family,
        output: definition.output,
        purpose: definition.purpose,
        feature_id: feature.featureId,
        capability_id: feature.capabilityId,
        state: "suppressed",
        evidence_publication_state: "insufficient_evidence",
        evidence_coverage: coverage,
        evidence_basis: "feature_runtime",
        blockers: blockers.length ? blockers : ["evidence_required"],
        missing_evidence: definition.missing_inputs,
        provenance: provenance(definition.id),
        qualification: "This analysis is withheld because the current evidence is insufficient or the feature is blocked/disabled.",
      };
    });
  });

  const ready = definitions.filter((item): boolean => item.state === "ready");
  const limited = definitions.filter((item): boolean => item.state === "limited");
  const suppressed = definitions.filter((item): boolean => item.state === "suppressed");

  return {
    engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V2",
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
      ready: "Publish calculated intelligence only when the analytical definition and enabled feature are fully evidence-ready.",
      limited: "Publish only with explicit evidence limitation, provenance, and missing-evidence qualification.",
      suppressed: "Do not publish as normal intelligence; expose the evidence gap or blocker instead.",
      atlas_readiness_is_not_raw_provider_observation: true,
      catalog_metadata_alone_is_not_evidence: true,
      feature_to_analysis_mapping_is_one_to_many: true,
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
