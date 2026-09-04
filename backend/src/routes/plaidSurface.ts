import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { plaidClient } from "../plaid/client.js";

export const plaidSurfaceRouter = Router();

plaidSurfaceRouter.get("/dashboard/plaid/surface", requireAuth, async (req: AuthedRequest, res) => {
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, institution_name, status, last_synced_at, plaid_access_token")
    .eq("user_id", req.userId!);
  if (error) return res.status(500).json({ error: error.message });

  const products = new Map<string, { product: string; status: string; itemCount: number }>();
  const summaries: any[] = [];
  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const active = new Set<string>(raw.products ?? []);
      const billed = new Set<string>(raw.billed_products ?? []);
      const consented = new Set<string>(raw.consented_products ?? []);
      const available = new Set<string>(raw.available_products ?? []);
      const all = new Set<string>([...active, ...billed, ...consented, ...available]);
      for (const product of all) {
        const status = billed.has(product) || active.has(product) ? "active" : consented.has(product) ? "consented" : "available";
        const old = products.get(product);
        products.set(product, { product, status, itemCount: (old?.itemCount ?? 0) + 1 });
      }
      summaries.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, billed_products: [...billed], available_products: [...available], consented_products: [...consented] });
    } catch (err) {
      console.error(`Plaid surface itemGet failed for ${item.id}:`, err);
      summaries.push({ institution_name: item.institution_name, status: "provider_state_unavailable", last_synced_at: item.last_synced_at, billed_products: [], available_products: [], consented_products: [] });
    }
  }
  res.json({ items: summaries, products: [...products.values()].sort((a, b) => a.product.localeCompare(b.product)) });
});
