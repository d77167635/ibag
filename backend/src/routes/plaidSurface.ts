import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG_V2 } from "../config/plaidProductCatalogV2.js";

export const plaidSurfaceRouter = Router();

plaidSurfaceRouter.get("/dashboard/plaid/surface", requireAuth, async (req: AuthedRequest, res) => {
  const [{ data: items, error }, { data: observations, error: observationError }] = await Promise.all([
    supabaseAdmin.from("plaid_items")
      .select("id, user_id, institution_name, status, last_synced_at, plaid_access_token")
      .eq("user_id", req.userId!),
    supabaseAdmin.from("plaid_product_observations")
      .select("item_id, product, lifecycle_state, evidence_state, observed_at, is_current")
      .eq("user_id", req.userId!)
      .eq("provider", "plaid")
      .eq("is_current", true),
  ]);
  if (error) return res.status(500).json({ error: error.message });
  if (observationError) return res.status(500).json({ error: observationError.message });

  const stateByProduct = new Map<string, { active: number; consented: number; available: number; unavailable: number; observed: number; itemCount: number }>();
  for (const definition of PLAID_PRODUCT_CATALOG_V2) stateByProduct.set(definition.key, { active: 0, consented: 0, available: 0, unavailable: 0, observed: 0, itemCount: 0 });
  const observedByItem = new Map<string, Set<string>>();
  for (const observation of observations ?? []) {
    if (observation.lifecycle_state !== "observed" || observation.evidence_state !== "observed") continue;
    const products = observedByItem.get(observation.item_id) ?? new Set<string>();
    products.add(observation.product);
    observedByItem.set(observation.item_id, products);
  }
  const summaries: any[] = [];

  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const active = new Set<string>([...(raw.products ?? []), ...(raw.billed_products ?? [])]);
      const consented = new Set<string>(raw.consented_products ?? []);
      const available = new Set<string>(raw.available_products ?? []);
      const observed = observedByItem.get(item.id) ?? new Set<string>();
      for (const definition of PLAID_PRODUCT_CATALOG_V2) {
        const state = stateByProduct.get(definition.key)!;
        state.itemCount += 1;
        if (definition.plaidProductStates.some((p) => observed.has(p))) state.observed += 1;
        if (definition.plaidProductStates.some((p) => active.has(p))) state.active += 1;
        else if (definition.plaidProductStates.some((p) => consented.has(p))) state.consented += 1;
        else if (definition.plaidProductStates.some((p) => available.has(p))) state.available += 1;
        else state.unavailable += 1;
      }
      summaries.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, billed_products: [...active], available_products: [...available], consented_products: [...consented], observed_products: [...observed] });
    } catch (err) {
      console.error(`Plaid surface itemGet failed for ${item.id}:`, err);
      summaries.push({ institution_name: item.institution_name, status: "provider_state_unavailable", last_synced_at: item.last_synced_at, billed_products: [], available_products: [], consented_products: [], observed_products: [...(observedByItem.get(item.id) ?? [])] });
    }
  }

  const products = PLAID_PRODUCT_CATALOG_V2.map((definition) => {
    const state = stateByProduct.get(definition.key)!;
    return {
      ...definition,
      status: state.observed ? "observed" : items?.length ? (state.active ? "active" : state.consented ? "consented" : state.available ? "available" : "not_available") : "not_connected",
      item_count: state.itemCount,
      observed_item_count: state.observed,
      active_item_count: state.active,
      consented_item_count: state.consented,
      available_item_count: state.available,
      unavailable_item_count: state.unavailable,
    };
  });

  res.json({
    catalog_version: "2026-09-04-v2",
    source: "plaid_runtime_item_state_and_domain_observations",
    items: summaries,
    products,
    product_state_legend: {
      observed: "iBag has actually received a live Plaid domain observation for this product on at least one connected Item.",
      active: "Product is active on at least one connected Item, but iBag has not yet recorded a domain observation for it.",
      consented: "Product is consented but not observed as active on an Item.",
      available: "Plaid reports the product as available but it has not been accessed.",
      not_available: "No connected Item currently reports this catalog product as active, consented, or available.",
      not_connected: "No Plaid Item is connected yet.",
    },
    note: "The Plaid dashboard describes Plaid capabilities and provider data only. Iris interpretations and Iris Features are intentionally separate. Catalog availability, consent, active state, and actual domain observation are distinct states.",
  });
});
