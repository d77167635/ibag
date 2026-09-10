import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureRuntimeSnapshot } from "./irisFeatureRuntime.js";
import { reportIdForAnalysis } from "./irisReportCatalog.js";

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
  report_id: string;
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
  engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V3";
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
    report_activation_is_user_control: true;
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
 * Final publication boundary. The intelligence hierarchy may execute governed
 * internal capabilities independently of user product selection. User report
 * activation controls which evidence-qualified report products are published.
 */
export function buildIrisIntelligenceOutputRuntime(
  atlas: { definitions: AtlasDefinition[] },
  featureRuntime: IrisFeatureRuntimeSnapshot,
  activeReportIds: string[] = [],
): IrisIntelligenceOutputRuntime {
  const active = new Set(activeReportIds);
  const states = new Map(featureRuntime.features.map((state) => [state.featureId, state]));
  const definitions: IrisIntelligenceOutput[] = atlas.definitions.flatMap((definition): IrisIntelligenceOutput[] => {
    const reportId = reportIdForAnalysis(definition.id);
    const features = IRIS_FEATURE_REGISTRY.filter((candidate) => candidate.requiredAnalysisIds.includes(definition.id));

    if (!active.has(reportId)) {
      return [{
        report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
        output: definition.output, purpose: definition.purpose, feature_id: features[0]?.featureId ?? null,
        capability_id: features[0]?.capabilityId ?? null, state: "suppressed", evidence_publication_state: "insufficient_evidence",
        evidence_coverage: 0, evidence_basis: "none", blockers: ["report_deactivated"], missing_evidence: definition.missing_inputs,
        provenance: provenance(definition.id), qualification: "This report product is deactivated by the user. Deactivation does not remove or limit the underlying Iris intelligence hierarchy.",
      }];
    }

    if (features.length === 0) {
      return [{
        report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
        output: definition.output, purpose: definition.purpose, feature_id: null, capability_id: null, state: "suppressed",
        evidence_publication_state: "insufficient_evidence", evidence_coverage: 0, evidence_basis: "none",
        blockers: ["report_feature_unmapped"], missing_evidence: definition.missing_inputs, provenance: provenance(definition.id),
        qualification: "Iris cannot publish this report because its analytical definition has no authoritative feature mapping.",
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
          report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
          output: definition.output, purpose: definition.purpose, feature_id: feature.featureId, capability_id: feature.capabilityId,
          state: "suppressed", evidence_publication_state: "insufficient_evidence", evidence_coverage: 0, evidence_basis: "none",
          blockers: ["feature_runtime_state_missing"], missing_evidence: definition.missing_inputs, provenance: provenance(definition.id),
          qualification: "Iris cannot publish this report until its evidence-qualified runtime state is available.",
        };
      }

      if (featureReady && atlasReady) {
        return {
          report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
          output: definition.output, purpose: definition.purpose, feature_id: feature.featureId, capability_id: feature.capabilityId,
          state: "ready", evidence_publication_state: "calculated", evidence_coverage: coverage, evidence_basis: "atlas_readiness",
          blockers: [], missing_evidence: [], provenance: provenance(definition.id), qualification: null,
        };
      }

      if (featureLimited || (featureReady && !atlasReady)) {
        return {
          report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
          output: definition.output, purpose: definition.purpose, feature_id: feature.featureId, capability_id: feature.capabilityId,
          state: "limited", evidence_publication_state: "limited", evidence_coverage: coverage, evidence_basis: "feature_runtime",
          blockers: blockers.length ? blockers : ["analytical_evidence_limited"], missing_evidence: definition.missing_inputs,
          provenance: provenance(definition.id), qualification: "Limited intelligence: the available evidence does not fully support this report. Iris must show the limitation and missing evidence rather than present a complete conclusion.",
        };
      }

      return {
        report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family,
        output: definition.output, purpose: definition.purpose, feature_id: feature.featureId, capability_id: feature.capabilityId,
        state: "suppressed", evidence_publication_state: "insufficient_evidence", evidence_coverage: coverage,
        evidence_basis: "feature_runtime", blockers: blockers.length ? blockers : ["evidence_required"],
        missing_evidence: definition.missing_inputs, provenance: provenance(definition.id),
        qualification: "This report is withheld because the current evidence is insufficient or the report is blocked.",
      };
    });
  });

  const ready = definitions.filter((item) => item.state === "ready");
  const limited = definitions.filter((item) => item.state === "limited");
  const suppressed = definitions.filter((item) => item.state === "suppressed");

  return {
    engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V3",
    outputs: definitions, publishable: [...ready, ...limited], ready_outputs: ready, limited_outputs: limited, suppressed_outputs: suppressed,
    counts: { defined: definitions.length, publishable: ready.length + limited.length, ready: ready.length, limited: limited.length, suppressed: suppressed.length },
    publication_policy: {
      ready: "Publish a report product only when the report is active and its analytical definition is fully evidence-ready.",
      limited: "Publish an active report only with explicit evidence limitation, provenance, and missing-evidence qualification.",
      suppressed: "Do not publish a deactivated or evidence-insufficient report as normal intelligence; expose the user control or evidence gap instead.",
      report_activation_is_user_control: true,
      catalog_metadata_alone_is_not_evidence: true,
      feature_to_analysis_mapping_is_one_to_many: true,
    },
    integrity: {
      financial_values_created: false, provider_observations_created: false, fake_mock_or_seeded_data: false,
      suppressed_claims_published: false, money_movement_executed: false,
    },
  };
}
