import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureRuntimeSnapshot } from "./irisFeatureRuntime.js";
import { reportIdForAnalysis } from "./irisReportCatalog.js";
import { selectHeadlineIntelligence } from "./irisHeadlineIntelligence.js";
import type { IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";
import type { IrisReportCertificationGate } from "./irisReportCertificationGate.js";

type AtlasDefinition = { id: string; family: string; name: string; purpose: string; output: string; evidence_ready: boolean; missing_inputs: string[] };
type ReportCertificationRuntime = { certification_gate: IrisReportCertificationGate; };
export type IrisIntelligenceOutputState = "ready" | "limited" | "suppressed";
export type IrisEvidencePublicationState = "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence" | "unknown";

export interface IrisIntelligenceOutput {
  report_id: string; analysis_id: string; analysis_name: string; family: string; output: string; purpose: string;
  feature_id: string | null; capability_id: string | null; state: IrisIntelligenceOutputState;
  evidence_publication_state: IrisEvidencePublicationState; evidence_coverage: number;
  evidence_basis: "atlas_readiness" | "feature_runtime" | "none"; blockers: string[]; missing_evidence: string[];
  headline_intelligence_node_id: string | null; headline_reason: string | null;
  runtime_lineage: IrisReportRuntimeLineage | null;
  provenance: { source: "Iris analysis atlas"; analytical_definition_id: string; provider_observations_created: false; financial_values_created: false; money_movement_executed: false };
  qualification: string | null;
}

export interface IrisIntelligenceOutputRuntime {
  engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V5"; outputs: IrisIntelligenceOutput[]; publishable: IrisIntelligenceOutput[];
  ready_outputs: IrisIntelligenceOutput[]; limited_outputs: IrisIntelligenceOutput[]; suppressed_outputs: IrisIntelligenceOutput[];
  counts: { defined: number; publishable: number; ready: number; limited: number; suppressed: number };
  publication_policy: { ready: string; limited: string; suppressed: string; report_activation_is_user_control: true; catalog_metadata_alone_is_not_evidence: true; feature_to_analysis_mapping_is_one_to_many: true; headline_binding_is_conservative: true; runtime_lineage_required_for_certified_publication: true; certification_gate_required_for_ready_publication: true };
  integrity: { financial_values_created: false; provider_observations_created: false; fake_mock_or_seeded_data: false; suppressed_claims_published: false; money_movement_executed: false };
}
function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }
function provenance(analysisId: string): IrisIntelligenceOutput["provenance"] { return { source: "Iris analysis atlas", analytical_definition_id: analysisId, provider_observations_created: false, financial_values_created: false, money_movement_executed: false }; }

export function buildIrisIntelligenceOutputRuntime(atlas: { definitions: AtlasDefinition[] }, featureRuntime: IrisFeatureRuntimeSnapshot, activeReportIds: string[] = [], runtimeLineage: Record<string, IrisReportRuntimeLineage> = {}, reportCertificationRuntime: Record<string, ReportCertificationRuntime> = {}): IrisIntelligenceOutputRuntime {
  const active = new Set(activeReportIds);
  const states = new Map(featureRuntime.features.map((state) => [state.featureId, state]));
  const definitions: IrisIntelligenceOutput[] = atlas.definitions.flatMap((definition): IrisIntelligenceOutput[] => {
    const reportId = reportIdForAnalysis(definition.id);
    const features = IRIS_FEATURE_REGISTRY.filter((candidate) => candidate.requiredAnalysisIds.includes(definition.id));
    const lineage = runtimeLineage[reportId] ?? null;
    const certification = reportCertificationRuntime[reportId]?.certification_gate ?? null;
    const makeHeadline = (state: IrisIntelligenceOutputState, evidencePublicationState: IrisEvidencePublicationState, coverage: number) => selectHeadlineIntelligence({ analysis_id: definition.id, analysis_name: definition.name, state, evidence_coverage: coverage, evidence_publication_state: evidencePublicationState }, lineage);
    const base = (state: IrisIntelligenceOutputState, evidencePublicationState: IrisEvidencePublicationState, evidenceCoverage: number, evidenceBasis: IrisIntelligenceOutput["evidence_basis"], blockers: string[], missingEvidence: string[], qualification: string | null): IrisIntelligenceOutput => ({ report_id: reportId, analysis_id: definition.id, analysis_name: definition.name, family: definition.family, output: definition.output, purpose: definition.purpose, feature_id: features[0]?.featureId ?? null, capability_id: features[0]?.capabilityId ?? null, state, evidence_publication_state: evidencePublicationState, evidence_coverage: evidenceCoverage, evidence_basis: evidenceBasis, blockers, missing_evidence: missingEvidence, ...makeHeadline(state, evidencePublicationState, evidenceCoverage), runtime_lineage: lineage, provenance: provenance(definition.id), qualification });
    if (!active.has(reportId)) return [base("suppressed", "insufficient_evidence", 0, "none", ["report_deactivated"], definition.missing_inputs, "This report product is deactivated by the user. Deactivation does not remove or limit the underlying Iris intelligence hierarchy.")];
    if (features.length === 0) return [base("suppressed", "insufficient_evidence", 0, "none", ["report_feature_unmapped"], definition.missing_inputs, "Iris cannot publish this report because its analytical definition has no authoritative feature mapping.")];
    const state = states.get(features[0].featureId);
    const coverage = state?.evidenceCoverage ?? 0;
    const blockers = unique(state?.blockers ?? []);
    if (!state) return [base("suppressed", "insufficient_evidence", 0, "none", ["feature_runtime_state_missing"], definition.missing_inputs, "Iris cannot publish this report until its evidence-qualified runtime state is available.")];
    if (state.readiness === "ready" && definition.evidence_ready === true) {
      if (lineage?.resolution_state !== "resolved") return features.map((feature) => ({ ...base("suppressed", "insufficient_evidence", coverage, "feature_runtime", unique([...blockers, "runtime_intelligence_lineage_unresolved"]), definition.missing_inputs, lineage?.limitation ?? "This report is withheld because exact runtime intelligence lineage is not resolved."), feature_id: feature.featureId, capability_id: feature.capabilityId }));
      if (!certification) return features.map((feature) => ({ ...base("suppressed", "insufficient_evidence", coverage, "feature_runtime", unique([...blockers, "report_certification_runtime_missing"]), definition.missing_inputs, "This report is withheld because its execution-scoped certification gate is unavailable."), feature_id: feature.featureId, capability_id: feature.capabilityId }));
      if (!certification.certified) return features.map((feature) => ({ ...base("suppressed", "insufficient_evidence", coverage, "feature_runtime", unique([...blockers, "report_certification_gate_failed", ...certification.reasons.map((reason) => `certification:${reason}`)]), definition.missing_inputs, "This report is withheld because its conjunctive certification gate is not satisfied."), feature_id: feature.featureId, capability_id: feature.capabilityId }));
      return features.map((feature) => ({ ...base("ready", "calculated", coverage, "atlas_readiness", [], [], null), feature_id: feature.featureId, capability_id: feature.capabilityId }));
    }
    if (state.readiness === "limited" || (state.readiness === "ready" && definition.evidence_ready !== true)) return features.map((feature) => ({ ...base("limited", "limited", coverage, "feature_runtime", blockers.length ? blockers : ["analytical_evidence_limited"], definition.missing_inputs, lineage?.limitation ?? "Limited intelligence: the available evidence does not fully support this report. Iris must show the limitation and missing evidence rather than present a complete conclusion."), feature_id: feature.featureId, capability_id: feature.capabilityId }));
    const runtimeBlocker = lineage?.resolution_state === "unresolved" ? "runtime_intelligence_lineage_unresolved" : "evidence_required";
    return features.map((feature) => ({ ...base("suppressed", "insufficient_evidence", coverage, "feature_runtime", unique([...blockers, runtimeBlocker]), definition.missing_inputs, lineage?.limitation ?? "This report is withheld because the current evidence or runtime intelligence lineage is insufficient."), feature_id: feature.featureId, capability_id: feature.capabilityId }));
  });
  const ready = definitions.filter((item) => item.state === "ready"); const limited = definitions.filter((item) => item.state === "limited"); const suppressed = definitions.filter((item) => item.state === "suppressed");
  return { engine_version: "IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V5", outputs: definitions, publishable: [...ready, ...limited], ready_outputs: ready, limited_outputs: limited, suppressed_outputs: suppressed, counts: { defined: definitions.length, publishable: ready.length + limited.length, ready: ready.length, limited: limited.length, suppressed: suppressed.length }, publication_policy: { ready: "Publish a ready report only when active, evidence-ready, exact runtime intelligence lineage is resolved, and the execution-scoped certification gate is certified.", limited: "Publish an active report only with explicit evidence limitation, provenance, and missing-evidence qualification.", suppressed: "Do not publish a deactivated, evidence-insufficient, or uncertified report as normal intelligence.", report_activation_is_user_control: true, catalog_metadata_alone_is_not_evidence: true, feature_to_analysis_mapping_is_one_to_many: true, headline_binding_is_conservative: true, runtime_lineage_required_for_certified_publication: true, certification_gate_required_for_ready_publication: true }, integrity: { financial_values_created: false, provider_observations_created: false, fake_mock_or_seeded_data: false, suppressed_claims_published: false, money_movement_executed: false } };
}
