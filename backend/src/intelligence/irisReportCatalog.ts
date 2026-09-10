import { IRIS_ANALYSIS_ATLAS, type IrisAnalysisDefinition } from "./analysisAtlas.js";

/**
 * Iris report products are the user-facing products produced by the intelligence
 * hierarchy. Capability families/operators remain internal composition machinery.
 * A report definition is catalog metadata only; it is never financial evidence.
 */
export const IRIS_REPORT_CATALOG_VERSION = "IRIS_REPORT_CATALOG_V1";

export type IrisReportProduct = {
  reportId: string;
  version: string;
  analysisId: string;
  name: string;
  description: string;
  family: string;
  outputType: string;
  requiredEvidenceInputs: string[];
};

export const IRIS_REPORT_CATALOG: IrisReportProduct[] = IRIS_ANALYSIS_ATLAS.map(
  (analysis: IrisAnalysisDefinition) => ({
    reportId: `report.${analysis.id}`,
    version: "1.0.0",
    analysisId: analysis.id,
    name: analysis.name,
    description: analysis.purpose,
    family: analysis.family,
    outputType: analysis.output,
    requiredEvidenceInputs: [...analysis.inputs],
  }),
);

export const IRIS_DEFAULT_ACTIVE_REPORT_IDS = IRIS_REPORT_CATALOG.map((report) => report.reportId);

export function getIrisReportProduct(reportId: string): IrisReportProduct | null {
  return IRIS_REPORT_CATALOG.find((report) => report.reportId === reportId) ?? null;
}

export function reportIdForAnalysis(analysisId: string): string {
  return `report.${analysisId}`;
}

/**
 * Report titles may be contextualized only with values actually supplied by the
 * runtime. No synthetic entity, amount, date, or period is invented here.
 */
export function buildIrisReportTitle(
  report: IrisReportProduct,
  context: { periodLabel?: string; entityLabel?: string; domainLabel?: string } = {},
): string {
  const qualifiers = [context.periodLabel, context.entityLabel, context.domainLabel]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  return qualifiers.length ? `${report.name} — ${qualifiers.join(" · ")}` : report.name;
}
