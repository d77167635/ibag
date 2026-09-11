import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import { IRIS_ANALYSIS_ATLAS } from "./analysisAtlas.js";
import { IRIS_REPORT_CATALOG } from "./irisReportCatalog.js";

export type IrisReportDependencyResolutionState = "definition_only";

export type IrisReportDependency = {
  report_id: string;
  analysis_definition_id: string;
  feature_ids: string[];
  required_evidence_keys: string[];
  resolution_state: IrisReportDependencyResolutionState;
  upstream_intelligence_node_ids: string[];
};

/**
 * Defines the report product's authoritative dependency boundary without
 * pretending that catalog/analysis identifiers are persisted intelligence
 * graph nodes. Actual upstream node IDs are resolved only from an executed,
 * lineage-bearing intelligence graph.
 */
export function buildIrisReportDependencyGraph(): IrisReportDependency[] {
  const featuresByAnalysis = new Map<string, string[]>();
  for (const feature of IRIS_FEATURE_REGISTRY) {
    for (const analysisId of feature.requiredAnalysisIds) {
      const existing = featuresByAnalysis.get(analysisId) ?? [];
      existing.push(feature.featureId);
      featuresByAnalysis.set(analysisId, existing);
    }
  }

  const analysisById = new Map(IRIS_ANALYSIS_ATLAS.map((definition) => [definition.id, definition]));

  return IRIS_REPORT_CATALOG.map((report) => {
    const analysis = analysisById.get(report.analysisId);
    const featureIds = [...new Set(featuresByAnalysis.get(report.analysisId) ?? [])].sort();
    return {
      report_id: report.reportId,
      analysis_definition_id: report.analysisId,
      feature_ids: featureIds,
      required_evidence_keys: [...(analysis?.inputs ?? report.requiredEvidenceInputs)],
      resolution_state: "definition_only",
      upstream_intelligence_node_ids: [],
    };
  });
}

export function getIrisReportDependency(
  reportId: string,
  graph: IrisReportDependency[] = buildIrisReportDependencyGraph(),
): IrisReportDependency | null {
  return graph.find((dependency) => dependency.report_id === reportId) ?? null;
}
