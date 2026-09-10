import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import {
  IRIS_DEFAULT_ACTIVE_REPORT_IDS,
  IRIS_REPORT_CATALOG,
  IRIS_REPORT_CATALOG_VERSION,
} from "../intelligence/irisReportCatalog.js";

export const irisCatalogRouter = Router();
const REPORT_IDS = new Set(IRIS_REPORT_CATALOG.map((report) => report.reportId));

function cleanReportIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && REPORT_IDS.has(id)))];
}

irisCatalogRouter.get("/iris/catalog", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("iris_user_report_preferences")
      .select("catalog_version, selected_report_ids, activation_mode, updated_at")
      .eq("user_id", req.userId!)
      .maybeSingle();
    if (error) throw error;

    const hasStoredPreference = !!data;
    const selected = hasStoredPreference ? cleanReportIds(data?.selected_report_ids) : [...IRIS_DEFAULT_ACTIVE_REPORT_IDS];

    res.json({
      catalog_version: IRIS_REPORT_CATALOG_VERSION,
      product_boundary: "Iris report products are user-facing outputs of the intelligence hierarchy. Intelligence capabilities/operators are internal composition machinery, not user products.",
      provider_boundary: "Plaid supplies provider observations. Catalog metadata, consent, availability, entitlement, and report activation are never provider evidence.",
      activation: { mode: hasStoredPreference ? data?.activation_mode ?? "explicit" : "all_available", count: selected.length, report_ids: selected },
      catalog: IRIS_REPORT_CATALOG,
      catalog_counts: { total: IRIS_REPORT_CATALOG.length, active: selected.length, families: new Set(IRIS_REPORT_CATALOG.map((report) => report.family)).size },
    });
  } catch (error) {
    console.error("iris/catalog error:", error);
    res.status(500).json({ error: "Unable to load Iris report catalog" });
  }
});

irisCatalogRouter.put("/iris/catalog/selection", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const supplied = Array.isArray(req.body?.report_ids) ? [...new Set(req.body.report_ids.filter((v: unknown): v is string => typeof v === "string"))] : [];
    const invalid = supplied.filter((id) => !REPORT_IDS.has(id));
    if (invalid.length) return res.status(400).json({ error: "Selection contains unknown Iris report products.", invalid_report_ids: invalid });

    const { error } = await supabaseAdmin.from("iris_user_report_preferences").upsert({
      user_id: req.userId!, catalog_version: IRIS_REPORT_CATALOG_VERSION, selected_report_ids: supplied,
      activation_mode: "explicit", updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;

    res.json({ saved: true, activation: { mode: "explicit", count: supplied.length, report_ids: supplied }, product_boundary: "Report activation controls publication only; it does not create evidence, activate provider products, or limit Iris's underlying intelligence hierarchy." });
  } catch (error) {
    console.error("iris/catalog/selection error:", error);
    res.status(500).json({ error: "Unable to save Iris report activation" });
  }
});

irisCatalogRouter.post("/iris/catalog/reset", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { error } = await supabaseAdmin.from("iris_user_report_preferences").upsert({
      user_id: req.userId!, catalog_version: IRIS_REPORT_CATALOG_VERSION,
      selected_report_ids: IRIS_DEFAULT_ACTIVE_REPORT_IDS, activation_mode: "all_available", updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
    res.json({ saved: true, activation: { mode: "all_available", count: IRIS_DEFAULT_ACTIVE_REPORT_IDS.length, report_ids: IRIS_DEFAULT_ACTIVE_REPORT_IDS } });
  } catch (error) {
    console.error("iris/catalog/reset error:", error);
    res.status(500).json({ error: "Unable to reset Iris report activation" });
  }
});
