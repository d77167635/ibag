import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG } from "../config/plaidProductCatalog.js";

export const plaidSurfaceRouter = Router();

plaidSurfaceRouter.get("/dashboard/plaid/surface", requireAuth, async (req: AuthedRequest, res) => {
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, institution_name, status, last_synced_at, plaid_access_token")
    .eq("user_id", req.userId!);
  if (error) return res.status(500).json({ error: error.message });

  const stateByProduct = new Map<string, { active: number; consented: number; available: number; unavailable: number; itemCount: number }>();
  for (const definition of PLAID_PRODUCT_CATALOG) stateByProduct.set(definition.key, { active: 0, consented: 0, available: 0, unavailable: 0, itemCount: 0 });
  const summaries: any[] = [];

  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const active = new Set<string>([...(raw.products ?? []), ...(raw.billed_products ?? [])]);
      const consented = new Set<string>(raw.consented_products ?? []);
      const available = new Set<string>(raw.available_products ?? []);

      for (const definition of PLAID_PRODUCT_CATALOG) {
        const state = stateByProduct.get(definition.key)!;
        state.itemCount += 1;
        if (definition.plaidProductStates.some((p) => active.has(p))) state.active += 1;
        else if (definition.plaidProductStates.some((p) => consented.has(p))) state.consented += 1;
        else if (definition.plaidProductStates.some((p) => available.has(p))) state.available += 1;
        else state.unavailable += 1;
      }

      summaries.push({
        institution_name: item.institution_name,
        status: item.status,
        last_synced_at: item.last_synced_at,
        billed_products: [...new Set<string>(raw.billed_products ?? [])],
        available_products: [...available],
        consented_products: [...consented],
      });
    } catch (err) {
      console.error(`Plaid surface itemGet failed for ${item.id}:`, err);
      summaries.push({ institution_name: item.institution_name, status: "provider_state_unavailable", last_synced_at: item.last_synced_at, billed_products: [], available_products: [], consented_products: [] });
    }
  }

  const products = PLAID_PRODUCT_CATALOG.map((definition) => {
    const state = stateByProduct.get(definition.key)!;
    return {
      ...definition,
      status: items?.length ? (state.active ? "active" : state.consented ? "consented" : state.available ? "available" : "not_available") : "not_connected",
      item_count: state.itemCount,
      active_item_count: state.active,
      consented_item_count: state.consented,
      available_item_count: state.available,
      unavailable_item_count: state.unavailable,
    };
  });

  res.json({
    catalog_version: "2026-09-04",
    source: "plaid_runtime_item_state",
    items: summaries,
    products,
    product_state_legend: {
      active: "Product is active on at least one connected Item.",
      consented: "Product is consented but not observed as active on an Item.",
      available: "Plaid reports the product as available but it has not been accessed.",
      not_available: "No connected Item currently reports this catalog product as active, consented, or available.",
      not_connected: "No Plaid Item is connected yet.",
    },
    note: "The Plaid dashboard describes Plaid capabilities and provider data only. Iris interpretations and Iris Features are intentionally separate.",
  });
});
