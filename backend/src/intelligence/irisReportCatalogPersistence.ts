import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_REPORT_CATALOG, IRIS_REPORT_CATALOG_VERSION } from "./irisReportCatalog.js";
import { buildIrisReportDependencyGraph } from "./irisReportDependencyGraph.js";

/**
 * The TypeScript catalog remains the governed definition source. This function
 * materializes that definition into the persisted product catalog projection.
 * It writes catalog metadata only; it never writes provider observations,
 * financial values, intelligence results, or user-specific evidence.
 */
export async function persistIrisReportCatalog(): Promise<void> {
  const products = IRIS_REPORT_CATALOG.map((report) => ({
    report_product_id: report.reportId,
    catalog_version: IRIS_REPORT_CATALOG_VERSION,
    version: report.version,
    report_product_type: report.outputType,
    report_product_name: report.name,
    report_product_description: report.description,
    family: report.family,
    output_type: report.outputType,
    subscription_requirement: null,
    beta_access_state: "available",
    active: true,
    metadata: {},
    updated_at: new Date().toISOString(),
  }));

  const { error: productError } = await supabaseAdmin
    .from("iris_report_products")
    .upsert(products, { onConflict: "report_product_id" });
  if (productError) throw new Error(`IRIS_REPORT_CATALOG_PERSIST_FAILED: ${productError.message}`);

  const dependencies = buildIrisReportDependencyGraph().flatMap((dependency) => [
    ...dependency.feature_ids.map((dependencyKey) => ({
      report_product_id: dependency.report_id,
      catalog_version: IRIS_REPORT_CATALOG_VERSION,
      dependency_type: "feature",
      dependency_key: dependencyKey,
      required: true,
      rationale: "Feature required by the governed report dependency definition.",
      metadata: {},
    })),
    {
      report_product_id: dependency.report_id,
      catalog_version: IRIS_REPORT_CATALOG_VERSION,
      dependency_type: "analysis_definition",
      dependency_key: dependency.analysis_definition_id,
      required: true,
      rationale: "Authoritative analysis definition for the report product.",
      metadata: {},
    },
    ...dependency.required_evidence_keys.map((dependencyKey) => ({
      report_product_id: dependency.report_id,
      catalog_version: IRIS_REPORT_CATALOG_VERSION,
      dependency_type: "evidence_key",
      dependency_key: dependencyKey,
      required: true,
      rationale: "Evidence key declared by the authoritative analysis definition.",
      metadata: {},
    })),
  ]);

  const { error: dependencyError } = await supabaseAdmin
    .from("iris_report_product_dependencies")
    .upsert(dependencies, { onConflict: "report_product_id,dependency_type,dependency_key" });
  if (dependencyError) throw new Error(`IRIS_REPORT_DEPENDENCY_PERSIST_FAILED: ${dependencyError.message}`);
}
