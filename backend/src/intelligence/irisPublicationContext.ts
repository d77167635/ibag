import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureActivation } from "../contracts/irisFeatureRegistry.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { IRIS_DEFAULT_ACTIVE_REPORT_IDS, IRIS_REPORT_CATALOG, IRIS_REPORT_CATALOG_VERSION } from "./irisReportCatalog.js";
import { buildIrisReportDependencyGraph } from "./irisReportDependencyGraph.js";
import { resolveIrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";

type AtlasDefinitionInput = { id: string; evidence_ready?: boolean; missing_inputs?: string[]; family?: string; name?: string; purpose?: string; output?: string };

type PublicationExecutionContext = { userId?: string; runId?: string | null; executionId?: string | null };

export function buildIrisPublicationRuntime(atlasDefinitions: AtlasDefinitionInput[], activeReportIds: string[], runtimeLineage: Parameters<typeof buildIrisIntelligenceOutputRuntime>[3] = {}) {
  const activations: Record<string, IrisFeatureActivation> = Object.fromEntries(IRIS_FEATURE_REGISTRY.map((feature) => [feature.featureId, "enabled"])) as Record<string, IrisFeatureActivation>;
  const readyAtlasIds = new Set(atlasDefinitions.filter((definition) => definition.evidence_ready === true).map((definition) => definition.id));
  const evidenceCoverage: Record<string, number> = Object.fromEntries(IRIS_FEATURE_REGISTRY.map((feature) => { const requiredAnalyses = feature.requiredAnalysisIds; if (requiredAnalyses.length === 0) return [feature.featureId, 0]; const satisfied = requiredAnalyses.filter((id) => readyAtlasIds.has(id)).length; return [feature.featureId, satisfied / requiredAnalyses.length]; }));
  const featureRuntime = buildIrisFeatureRuntime({ activations, evidenceCoverage });
  const intelligenceOutputRuntime = buildIrisIntelligenceOutputRuntime({ definitions: atlasDefinitions.map((definition) => ({ id: definition.id, family: definition.family ?? "unknown", name: definition.name ?? definition.id, purpose: definition.purpose ?? "", output: definition.output ?? "", evidence_ready: definition.evidence_ready === true, missing_inputs: definition.missing_inputs ?? [] })) }, featureRuntime, activeReportIds, runtimeLineage);
  return { catalog_version: IRIS_REPORT_CATALOG_VERSION, selected_report_ids: activeReportIds, report_catalog: IRIS_REPORT_CATALOG, feature_runtime: featureRuntime, intelligence_output_runtime: intelligenceOutputRuntime, publication_boundary: { intelligence_hierarchy_is_not_a_user_product_catalog: true, report_products_are_user_controllable: true, report_activation_does_not_activate_provider_products: true, report_activation_does_not_create_evidence: true, catalog_metadata_is_not_evidence: true, limited_outputs_require_explicit_qualification: true, suppressed_outputs_are_not_normal_intelligence_claims: true, certified_report_publication_requires_exact_runtime_lineage: true } };
}

export async function buildIrisPublicationContext(userId: string, atlasDefinitions: AtlasDefinitionInput[], executionContext: PublicationExecutionContext = {}) {
  const { supabaseAdmin } = await import("../config/supabase.js");
  const { data: preference, error } = await supabaseAdmin.from("iris_user_report_preferences").select("selected_report_ids, activation_mode").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const activeReportIds = preference ? [...new Set((Array.isArray(preference.selected_report_ids) ? preference.selected_report_ids : []).filter((id: unknown): id is string => typeof id === "string" && IRIS_REPORT_CATALOG.some((report) => report.reportId === id)))] : [...IRIS_DEFAULT_ACTIVE_REPORT_IDS];
  let runtimeLineage: Parameters<typeof buildIrisIntelligenceOutputRuntime>[3] = {};
  if (executionContext.runId && executionContext.executionId) {
    const dependencies = buildIrisReportDependencyGraph(atlasDefinitions.map((definition) => ({ id: definition.id })));
    runtimeLineage = await resolveIrisReportRuntimeLineage({ userId, runId: executionContext.runId, executionId: executionContext.executionId, dependencies });
  }
  return buildIrisPublicationRuntime(atlasDefinitions, activeReportIds, runtimeLineage);
}
