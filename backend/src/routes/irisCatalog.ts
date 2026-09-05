import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_CATALOG, IRIS_CATALOG_VERSION, getIrisCatalogCapability } from "../intelligence/irisCatalog.js";
import { IRIS_CATALOG_EXPANSION } from "../intelligence/irisCatalogExpansion.js";

export const irisCatalogRouter = Router();
const CATALOG = [...IRIS_CATALOG, ...IRIS_CATALOG_EXPANSION];
const STANDARD_LIMIT = 10;
const STANDARD_IDS = [
  "roundups",
  "financial-state",
  "cash-flow",
  "spending-intelligence",
  "liquidity",
  "debt",
  "forecast",
  "behavior-recurrence",
  "causality",
  "decision-lab",
];

const isKnown = (id: string) => !!getIrisCatalogCapability(id) || IRIS_CATALOG_EXPANSION.some(c => c.id === id);

irisCatalogRouter.get("/iris/catalog", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("iris_user_intelligence_preferences").select("catalog_version, selected_capability_ids, standard_name, updated_at").eq("user_id", req.userId!).maybeSingle();
    if (error) throw error;
    const hasStoredPreference = !!data;
    const stored = hasStoredPreference && Array.isArray(data?.selected_capability_ids)
      ? data.selected_capability_ids.filter((id: unknown): id is string => typeof id === "string" && isKnown(id))
      : [];
    // Absent means never customized. Present empty means explicitly disabled.
    const selected = hasStoredPreference ? stored.slice(0, STANDARD_LIMIT) : [...STANDARD_IDS];
    res.json({
      catalog_version: IRIS_CATALOG_VERSION,
      hierarchy: "Iris > synthesis > intelligence catalog > analytical families > evidence-valid compositions > canonical evidence > Plaid source observations",
      provider_boundary: "Plaid connects institutions and supplies read-only source data. Iris owns interpretation, synthesis, education, investigation, scenarios, decisions, and optimization.",
      selection: { max: STANDARD_LIMIT, count: selected.length, capability_ids: selected, selection_is_preference_not_ceiling: true },
      standard: { name: "Iris Standard", count: STANDARD_IDS.length, capability_ids: STANDARD_IDS },
      catalog: CATALOG,
      catalog_counts: { total: CATALOG.length, selected: selected.length, families: new Set(CATALOG.map(c => c.family)).size, frontier_capabilities: CATALOG.filter(c => c.depth === "frontier").length }
    });
  } catch (error) {
    console.error("iris/catalog error:", error);
    res.status(500).json({ error: "Unable to load Iris intelligence catalog" });
  }
});

irisCatalogRouter.put("/iris/catalog/selection", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ids: string[] = Array.isArray(req.body?.capability_ids)
      ? [...new Set(req.body.capability_ids.filter((v: unknown): v is string => typeof v === "string"))] as string[]
      : [];
    if (ids.length > STANDARD_LIMIT) return res.status(400).json({ error: `Select no more than ${STANDARD_LIMIT} Iris intelligence areas.` });
    const invalid = ids.filter(id => !isKnown(id));
    if (invalid.length) return res.status(400).json({ error: "Selection contains unknown Iris catalog capabilities.", invalid_capability_ids: invalid });
    const { error } = await supabaseAdmin.from("iris_user_intelligence_preferences").upsert({ user_id: req.userId!, catalog_version: IRIS_CATALOG_VERSION, selected_capability_ids: ids, standard_name: "Custom Iris Standard", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
    res.json({ saved: true, selection: { max: STANDARD_LIMIT, count: ids.length, capability_ids: ids, selection_is_preference_not_ceiling: true } });
  } catch (error) {
    console.error("iris/catalog/selection error:", error);
    res.status(500).json({ error: "Unable to save Iris intelligence selection" });
  }
});
