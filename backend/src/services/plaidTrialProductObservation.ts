import { supabaseAdmin } from "../config/supabase.js";
import { plaidClient } from "../plaid/client.js";
import { recordPlaidProviderReceipt } from "./plaidProviderReceipt.js";

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fetchAssets(accessToken: string, userId: string, itemId: string) {
  const createRequest = { access_tokens: [accessToken], days_requested: 90 };
  const created = await (plaidClient as any).assetReportCreate(createRequest);
  await recordPlaidProviderReceipt({ userId, itemId, product: "assets", endpoint: "/asset_report/create", request: { endpoint: "/asset_report/create", days_requested: 90 }, response: created });
  const token = created?.data?.asset_report_token;
  if (!token) throw new Error("Plaid asset report creation returned no asset_report_token");

  let lastError: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const getResponse = await (plaidClient as any).assetReportGet({ asset_report_token: token });
      await recordPlaidProviderReceipt({ userId, itemId, product: "assets", endpoint: "/asset_report/get", request: { endpoint: "/asset_report/get" }, response: getResponse });
      return getResponse;
    } catch (err: any) {
      lastError = err;
      const code = err?.response?.data?.error_code ?? err?.code;
      if (code !== "PRODUCT_NOT_READY") throw err;
      await sleep(1000);
    }
  }
  throw lastError ?? new Error("Plaid asset report was not ready");
}

async function endpointFor(product: string, accessToken: string, userId: string, itemId: string) {
  const args = { access_token: accessToken };
  switch (product) {
    case "auth": return { endpoint: "/auth/get", request: { endpoint: "/auth/get" }, call: () => (plaidClient as any).authGet(args) };
    case "identity": return { endpoint: "/identity/get", request: { endpoint: "/identity/get" }, call: () => (plaidClient as any).identityGet(args) };
    case "assets": return { endpoint: "/asset_report/get", request: { endpoint: "/asset_report/get" }, call: () => fetchAssets(accessToken, userId, itemId) };
    case "investments": return { endpoint: "/investments/holdings/get", request: { endpoint: "/investments/holdings/get" }, call: () => (plaidClient as any).investmentsHoldingsGet(args) };
    case "statements": return { endpoint: "/statements/list", request: { endpoint: "/statements/list" }, call: () => (plaidClient as any).statementsList(args) };
    default: return null;
  }
}

async function persistRawObservation(userId: string, itemId: string, product: string, payload: unknown, source: string) {
  const { error: retireError } = await supabaseAdmin
    .from("plaid_raw_product_observations")
    .update({ is_current: false })
    .eq("user_id", userId).eq("item_id", itemId).eq("product", product).eq("is_current", true);
  if (retireError) throw retireError;

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from("plaid_raw_product_observations").insert({
    user_id: userId, item_id: itemId, product, raw_response: payload, provider_object_id: itemId,
    acquired_at: now, effective_at: now, evidence_state: "observed",
    provenance: { source, observation: "live", provider: "plaid", item_id: itemId, response_received: true }, is_current: true,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
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
    p_provenance: { source: `plaid.${product}`, observation: "live", provider: "plaid", response_received: true }, p_evidence_state: "observed",
  });
  if (observationError) throw observationError;
}

export async function observeActivatedTrialProducts(userId: string, itemId: string, accessToken: string, activated: ReadonlySet<string>) {
  const results: Array<{ product: string; observed: boolean; error?: string }> = [];
  for (const product of ["auth", "identity", "assets", "investments", "statements"]) {
    if (!activated.has(product)) { results.push({ product, observed: false }); continue; }
    try {
      const endpoint = await endpointFor(product, accessToken, userId, itemId);
      if (!endpoint) throw new Error(`No provider endpoint configured for ${product}`);
      const response = await endpoint.call();
      const payload = response?.data;
      if (!payload || typeof payload !== "object") throw new Error(`Plaid returned no ${product} response payload`);
      if (product !== "assets") {
        await recordPlaidProviderReceipt({ userId, itemId, product, endpoint: endpoint.endpoint, request: endpoint.request, response });
      }
      await persistRawObservation(userId, itemId, product, payload, `plaid.${product}`);
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
