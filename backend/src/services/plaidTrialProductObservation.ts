import { supabaseAdmin } from "../config/supabase.js";
import { plaidClient } from "../plaid/client.js";

function endpointFor(product: string, accessToken: string) {
  const args = { access_token: accessToken };
  switch (product) {
    case "auth": return () => (plaidClient as any).authGet(args);
    case "identity": return () => (plaidClient as any).identityGet(args);
    case "assets": return () => (plaidClient as any).assetsGet(args);
    case "investments": return () => (plaidClient as any).investmentsHoldingsGet(args);
    case "statements": return () => (plaidClient as any).statementsGet(args);
    default: return null;
  }
}

async function markObserved(userId: string, itemId: string, product: string) {
  const { data, error } = await supabaseAdmin.from("plaid_product_observations")
    .select("billed,available,authorized,requested,provider_added")
    .eq("user_id", userId).eq("item_id", itemId).eq("provider", "plaid")
    .eq("product", product).eq("is_current", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Cannot mark Plaid product ${product} observed without provider evidence`);
  const { error: observationError } = await supabaseAdmin.rpc("record_plaid_product_observation", {
    p_user_id: userId, p_item_id: itemId, p_product: product, p_lifecycle_state: "observed",
    p_billed: !!data.billed, p_available: !!data.available, p_authorized: !!data.authorized,
    p_requested: !!data.requested, p_provider_added: !!data.provider_added,
    p_provenance: { source: `plaid.${product}`, observation: "live", provider: "plaid" },
  });
  if (observationError) throw observationError;
}

export async function observeActivatedTrialProducts(userId: string, itemId: string, accessToken: string, activated: Set<string>) {
  const results: Array<{ product: string; observed: boolean; error?: string }> = [];
  for (const product of ["auth", "identity", "assets", "investments", "statements"]) {
    if (!activated.has(product)) {
      results.push({ product, observed: false });
      continue;
    }
    try {
      const endpoint = endpointFor(product, accessToken);
      if (!endpoint) throw new Error(`No provider endpoint configured for ${product}`);
      const response = await endpoint();
      const payload = response?.data;
      if (!payload || typeof payload !== "object") throw new Error(`Plaid returned no ${product} response payload`);
      const { error } = await supabaseAdmin.from("plaid_raw_product_observations").insert({
        user_id: userId, item_id: itemId, product, raw_response: payload,
        provider_object_id: itemId, acquired_at: new Date().toISOString(),
        evidence_state: "observed", provenance: { source: `plaid.${product}`, observation: "live", provider: "plaid", item_id: itemId },
        is_current: true,
      });
      if (error) throw error;
      await markObserved(userId, itemId, product);
      results.push({ product, observed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider observation failure";
      console.error(`Iris Plaid ${product} observation failed for ${itemId}:`, message);
      results.push({ product, observed: false, error: message });
    }
  }
  return results;
}
