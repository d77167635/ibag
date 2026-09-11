import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureActivation } from "../contracts/irisFeatureRegistry.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { IRIS_DEFAULT_ACTIVE_REPORT_IDS, IRIS_REPORT_CATALOG, IRIS_REPORT_CATALOG_VERSION } from "./irisReportCatalog.js";
import { buildIrisReportDependencyGraph } from "./irisReportDependencyGraph.js";
import { resolveIrisReportRuntimeLineage, type IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";
import { evaluateIrisReportSemanticConsumption, type IrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";
import { evaluateIrisReportCertificationGate, type IrisReportCertificationGate } from "./irisReportCertificationGate.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";
import type { ReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";

type AtlasDefinitionInput = { id: string; evidence_ready?: boolean; missing_inputs?: string[]; family?: string; name?: string; purpose?: string; output?: string };
type PublicationExecutionContext = { userId?: string; runId?: string | null; executionId?: string | null; executionStatus?: string | null };

type ReportCertificationRuntime = {
  report_id: string;
  semantic_consumption: IrisReportSemanticConsumption;
  evidence_boundary: ReportEvidenceBoundary;
  certification_gate: IrisReportCertificationGate;
};

/**
 * The report evidence-key boundary is intentionally conservative until an
 * authoritative runtime mapping exists from iris_run_evidence records to the
 * analysis input keys. Catalog/atlas input names are requirements, not evidence.
 */
function buildUnmappedEvidenceBoundary(requiredKeys: string[]): ReportEvidenceBoundary {
  const normalized = [...new Set(requiredKeys)].sort();
  if (normalized.length === 0) return { required_keys: [], observed_evidence_ids: [], missing_keys: [], unknown_keys: [], state: "satisfied" };
  return { required_keys: normalized, observed_evidence_ids: [], missing_keys: normalized, unknown_keys: [], state: "insufficient" };
}

export function buildIrisPublicationRuntime(atlasDefinitions: AtlasDefinitionInput[], activeReportIds: string[], runtimeLineage: Record<string, IrisReportRuntimeLineage> = {}, reportCertificationRuntime: Record<string, ReportCertificationRuntime> = {}) {
  const activations: Record<string, IrisFeatureActivation> = Object.fromEntries(IRIS_FEATURE_REGISTRY.map((feature) => [feature.featureId, "enabled"])) as Record<string, IrisFeatureActivation>;
  const readyAtlasIds = new Set(atlasDefinitions.filter((definition) => definition.evidence_ready === true).map((definition) => definition.id));
  const evidenceCoverage: Record<string, number> = Object.fromEntries(IRIS_FEATURE_REGISTRY.map((feature) => { const requiredAnalyses = feature.requiredAnalysisIds; if (requiredAnalyses.length === 0) return [feature.featureId, 0]; const satisfied = requiredAnalyses.filter((id) => readyAtlasIds.has(id)).length; return [feature.featureId, satisfied / requiredAnalyses.length]; }));
  const featureRuntime = buildIrisFeatureRuntime({ activations, evidenceCoverage });
  const intelligenceOutputRuntime = buildIrisIntelligenceOutputRuntime({ definitions: atlasDefinitions.map((definition) => ({ id: definition.id, family: definition.family ?? "unknown", name: definition.name ?? definition.id, purpose: definition.purpose ?? "", output: definition.output ?? "", evidence_ready: definition.evidence_ready === true, missing_inputs: definition.missing_inputs ?? [] })) }, featureRuntime, activeReportIds, runtimeLineage);
  return { catalog_version: IRIS_REPORT_CATALOG_VERSION, selected_report_ids: activeReportIds, report_catalog: IRIS_REPORT_CATALOG, feature_runtime: featureRuntime, intelligence_output_runtime: intelligenceOutputRuntime, report_certification_runtime: reportCertificationRuntime, publication_boundary: { intelligence_hierarchy_is_not_a_user_product_catalog: true, report_products_are_user_controllable: true, report_activation_does_not_activate_provider_products: true, report_activation_does_not_create_evidence: true, catalog_metadata_is_not_evidence: true, limited_outputs_require_explicit_qualification: true, suppressed_outputs_are_not_normal_intelligence_claims: true, certified_report_publication_requires_exact_runtime_lineage: true, certified_report_publication_requires_verified_semantic_dependency_reads: true, certified_report_publication_requires_authoritative_evidence_key_mapping: true } };
}

export async function buildIrisPublicationContext(userId: string, atlasDefinitions: AtlasDefinitionInput[], executionContext: PublicationExecutionContext = {}) {
  const { supabaseAdmin } = await import("../config/supabase.js");
  const { data: preference, error } = await supabaseAdmin.from("iris_user_report_preferences").select("selected_report_ids, activation_mode").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const activeReportIds = preference ? [...new Set((Array.isArray(preference.selected_report_ids) ? preference.selected_report_ids : []).filter((id: unknown): id is string => typeof id === "string" && IRIS_REPORT_CATALOG.some((report) => report.reportId === id)))] : [...IRIS_DEFAULT_ACTIVE_REPORT_IDS];
  let runtimeLineage: Record<string, IrisReportRuntimeLineage> = {};
  let reportCertificationRuntime: Record<string, ReportCertificationRuntime> = {};
  if (executionContext.runId && executionContext.executionId) {
    const dependencies = buildIrisReportDependencyGraph(atlasDefinitions.map((definition) => ({ id: definition.id })));
    runtimeLineage = await resolveIrisReportRuntimeLineage({ userId, runId: executionContext.runId, executionId: executionContext.executionId, dependencies });

    const { data: proofRows, error: proofError } = await supabaseAdmin
      .from("iris_semantic_dependency_proofs")
      .select("capability_id,consumed_dependency_ids,consumed_dependency_hashes,consumed_dependency_paths,output_hash,proof_version")
      .eq("user_id", userId)
      .eq("run_id", executionContext.runId)
      .eq("execution_id", executionContext.executionId);
    if (proofError) throw new Error(`IRIS_REPORT_SEMANTIC_PROOF_LOOKUP_FAILED: ${proofError.message}`);
    const proofs = (proofRows ?? []) as SemanticDependencyProof[];

    for (const dependency of dependencies) {
      const lineage = runtimeLineage[dependency.report_id] ?? null;
      const capabilityIds = lineage?.capability_ids ?? [];
      const semanticConsumption = evaluateIrisReportSemanticConsumption({ dependency, capabilityIds, proofs });
      const evidenceBoundary = buildUnmappedEvidenceBoundary(dependency.required_evidence_keys);
      const certificationGate = evaluateIrisReportCertificationGate({ executionStatus: executionContext.executionStatus ?? "UNKNOWN", runtimeLineage: lineage, semanticConsumption, evidenceBoundary });
      reportCertificationRuntime[dependency.report_id] = { report_id: dependency.report_id, semantic_consumption: semanticConsumption, evidence_boundary: evidenceBoundary, certification_gate: certificationGate };
    }
  }
  return buildIrisPublicationRuntime(atlasDefinitions, activeReportIds, runtimeLineage, reportCertificationRuntime);
}
