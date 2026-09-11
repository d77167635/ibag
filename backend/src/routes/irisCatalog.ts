import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_DEFAULT_ACTIVE_REPORT_IDS, IRIS_REPORT_CATALOG, IRIS_REPORT_CATALOG_VERSION } from "../intelligence/irisReportCatalog.js";
import { buildIrisReportDependencyGraph } from "../intelligence/irisReportDependencyGraph.js";
import { persistIrisReportCatalog } from "../intelligence/irisReportCatalogPersistence.js";
import { resolveIrisEvidenceToReports } from "../intelligence/irisEvidenceToReportTraversal.js";
import { auditIrisAuthoritativeDomainCoverage } from "../intelligence/irisAuthoritativeDomainCoverage.js";
import { auditIrisAuthoritativeDomainGates } from "../intelligence/irisAuthoritativeDomainGates.js";

export const irisCatalogRouter = Router();
const REPORT_IDS = new Set(IRIS_REPORT_CATALOG.map((report) => report.reportId));
const REPORT_DEPENDENCY_GRAPH = buildIrisReportDependencyGraph();

function cleanReportIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && REPORT_IDS.has(id)))];
}

irisCatalogRouter.get("/iris/catalog", requireAuth, async (req: AuthedRequest, res) => {
  try {
    await persistIrisReportCatalog();
    const { data, error } = await supabaseAdmin.from("iris_user_report_preferences").select("catalog_version, selected_report_ids, activation_mode, updated_at").eq("user_id", req.userId!).maybeSingle();
    if (error) throw error;
    const hasStoredPreference = !!data;
    const selected = hasStoredPreference ? cleanReportIds(data?.selected_report_ids) : [...IRIS_DEFAULT_ACTIVE_REPORT_IDS];
    res.json({ catalog_version: IRIS_REPORT_CATALOG_VERSION, product_boundary: "Iris report products are user-facing outputs of the intelligence hierarchy. Intelligence capabilities/operators are internal composition machinery, not user products.", provider_boundary: "Plaid supplies provider observations. Catalog metadata, consent, availability, entitlement, and report activation are never provider evidence.", activation: { mode: hasStoredPreference ? data?.activation_mode ?? "explicit" : "all_available", count: selected.length, report_ids: selected }, catalog: IRIS_REPORT_CATALOG, dependency_graph: REPORT_DEPENDENCY_GRAPH, catalog_counts: { total: IRIS_REPORT_CATALOG.length, active: selected.length, families: new Set(IRIS_REPORT_CATALOG.map((report) => report.family)).size } });
  } catch (error) { console.error("iris/catalog error:", error); res.status(500).json({ error: "Unable to load Iris report catalog" }); }
});

irisCatalogRouter.get("/iris/catalog/evidence-to-reports", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const runId = typeof req.query.run_id === "string" ? req.query.run_id : "";
    const executionId = typeof req.query.execution_id === "string" ? req.query.execution_id : "";
    const rawEvidenceIds = typeof req.query.evidence_ids === "string" ? req.query.evidence_ids.split(",") : [];
    const evidenceIds = [...new Set(rawEvidenceIds.map((id) => id.trim()).filter(Boolean))];
    if (!runId || !executionId) return res.status(400).json({ error: "run_id and execution_id are required for exact runtime traversal." });
    const traversal = await resolveIrisEvidenceToReports({ userId: req.userId!, runId, executionId, evidenceIds });
    res.json({ traversal_boundary: "Exact user + run + execution boundary. SOURCE_EVIDENCE lineage is the only starting point.", certification_boundary: "Traversal does not certify evidence, semantic sufficiency, lineage completeness, or report publication readiness.", ...traversal });
  } catch (error) { console.error("iris/catalog/evidence-to-reports error:", error); res.status(500).json({ error: "Unable to resolve evidence to Iris reports" }); }
});

irisCatalogRouter.get("/iris/catalog/domain-coverage", requireAuth, async (_req: AuthedRequest, res) => {
  try { const coverage = await auditIrisAuthoritativeDomainCoverage(); res.json({ boundary: "Architecture and persisted-evidence coverage only. This endpoint never creates nodes, observations, evidence, or user-specific intelligence.", ...coverage }); }
  catch (error) { console.error("iris/catalog/domain-coverage error:", error); res.status(500).json({ error: "Unable to audit Iris authoritative domain coverage" }); }
});

irisCatalogRouter.get("/iris/catalog/domain-gates", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const runId = typeof req.query.run_id === "string" ? req.query.run_id : "";
    const executionId = typeof req.query.execution_id === "string" ? req.query.execution_id : "";
    if (!runId || !executionId) return res.status(400).json({ error: "run_id and execution_id are required for executable domain gates." });
    const gates = await auditIrisAuthoritativeDomainGates({ userId: req.userId!, runId, executionId, reportDependencyGraph: REPORT_DEPENDENCY_GRAPH });
    res.json(gates);
  } catch (error) { console.error("iris/catalog/domain-gates error:", error); res.status(500).json({ error: "Unable to evaluate Iris authoritative domain gates" }); }
});

irisCatalogRouter.put("/iris/catalog/selection", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const rawReportIds: unknown = req.body?.report_ids;
    const supplied: string[] = Array.isArray(rawReportIds) ? rawReportIds.filter((value: unknown): value is string => typeof value === "string") : [];
    const uniqueSupplied = [...new Set(supplied)];
    const invalid = uniqueSupplied.filter((id: string) => !REPORT_IDS.has(id));
    if (invalid.length) return res.status(400).json({ error: "Selection contains unknown Iris report products.", invalid_report_ids: invalid });
    const { error } = await supabaseAdmin.from("iris_user_report_preferences").upsert({ user_id: req.userId!, catalog_version: IRIS_REPORT_CATALOG_VERSION, selected_report_ids: uniqueSupplied, activation_mode: "explicit", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    res.json({ saved: true, activation: { mode: "explicit", count: uniqueSupplied.length, report_ids: uniqueSupplied }, product_boundary: "Report activation controls publication only; it does not create evidence, activate provider products, or limit Iris's underlying intelligence hierarchy." });
  } catch (error) { console.error("iris/catalog/selection error:", error); res.status(500).json({ error: "Unable to save Iris report activation" }); }
});

irisCatalogRouter.post("/iris/catalog/reset", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { error } = await supabaseAdmin.from("iris_user_report_preferences").upsert({ user_id: req.userId!, catalog_version: IRIS_REPORT_CATALOG_VERSION, selected_report_ids: IRIS_DEFAULT_ACTIVE_REPORT_IDS, activation_mode: "all_available", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    res.json({ saved: true, activation: { mode: "all_available", count: IRIS_DEFAULT_ACTIVE_REPORT_IDS.length, report_ids: IRIS_DEFAULT_ACTIVE_REPORT_IDS } });
  } catch (error) { console.error("iris/catalog/reset error:", error); res.status(500).json({ error: "Unable to reset Iris report catalog" }); }
});