import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getSupabaseAdmin } from "../services/db.js";
import { IRIS_ANALYSIS_ATLAS } from "../intelligence/analysisAtlas.js";

export const irisCatalogRouter = Router();

const STANDARD_LIMIT = 20;

irisCatalogRouter.get("/iris/catalog", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getSupabaseAdmin();
    const { data: selectedRows, error } = await db
      .from("iris_intelligence_preferences")
      .select("analysis_id, position")
      .eq("user_id", req.userId!)
      .order("position", { ascending: true });
    if (error) throw error;
    const selected = (selectedRows ?? []).map((row) => row.analysis_id as string);
    const catalog = IRIS_ANALYSIS_ATLAS.map((d, index) => ({
      analysis_id: d.id,
      family: d.family,
      name: d.name,
      description: d.purpose,
      inputs: d.inputs,
      output: d.output,
      catalog_order: index + 1,
      selected: selected.includes(d.id),
    }));
    res.json({
      catalog_version: "IRIS_CATALOG_V1",
      hierarchy: "Iris > intelligence catalog > analytical families > compositions > canonical evidence > Plaid source observations",
      provider_boundary: "Plaid connects institutions and supplies read-only source data. Iris owns interpretation and synthesis.",
      selection: { max: STANDARD_LIMIT, count: selected.length, analysis_ids: selected },
      catalog,
      catalog_counts: { total: catalog.length, selected: selected.length, families: new Set(catalog.map((d) => d.family)).size },
    });
  } catch (error) {
    console.error("iris/catalog error:", error);
    res.status(500).json({ error: "Unable to load Iris intelligence catalog" });
  }
});

irisCatalogRouter.put("/iris/catalog/selection", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ids = Array.isArray(req.body?.analysis_ids) ? [...new Set(req.body.analysis_ids.filter((v: unknown): v is string => typeof v === "string"))] : [];
    if (ids.length > STANDARD_LIMIT) return res.status(400).json({ error: `Select no more than ${STANDARD_LIMIT} Iris intelligence areas.` });
    const valid = new Set(IRIS_ANALYSIS_ATLAS.map((d) => d.id));
    const invalid = ids.filter((id) => !valid.has(id));
    if (invalid.length) return res.status(400).json({ error: "Selection contains unknown Iris intelligence areas.", invalid_analysis_ids: invalid });
    const db = getSupabaseAdmin();
    const { error: deleteError } = await db.from("iris_intelligence_preferences").delete().eq("user_id", req.userId!);
    if (deleteError) throw deleteError;
    if (ids.length) {
      const { error: insertError } = await db.from("iris_intelligence_preferences").insert(ids.map((analysis_id, position) => ({ user_id: req.userId!, analysis_id, position })));
      if (insertError) throw insertError;
    }
    res.json({ saved: true, selection: { max: STANDARD_LIMIT, count: ids.length, analysis_ids: ids } });
  } catch (error) {
    console.error("iris/catalog/selection error:", error);
    res.status(500).json({ error: "Unable to save Iris intelligence selection" });
  }
});
