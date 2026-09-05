import { Router } from "express";
import type { CountryCode, Products } from "plaid";
import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fullSyncForItem } from "../services/sync.js";
import { encryptToken } from "../config/crypto.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";

export const linkRouter = Router();

function safePlaidError(err: unknown) {
  const e = err as any;
  return {
    message: e?.response?.data?.error_message ?? e?.message ?? "Unknown error",
    error_code: e?.response?.data?.error_code,
    error_type: e?.response?.data?.error_type,
    request_id: e?.response?.data?.request_id,
  };
}

linkRouter.post("/link/token", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({ user: { client_user_id: req.userId! }, client_name: "Iris", products: env.plaidProducts as unknown as Products[], country_codes: env.plaidCountryCodes as CountryCode[], language: "en", webhook: env.plaidWebhookUrl || undefined });
    res.json({ link_token: response.data.link_token });
  } catch (err) { console.error("link/token error", safePlaidError(err)); res.status(502).json({ error: "Failed to create Plaid Link token" }); }
});

linkRouter.post("/link/upgrade-token", requireAuth, async (req: AuthedRequest, res) => {
  const { item_id, stage } = req.body as { item_id?: string; stage?: "consent" | "assets" | "statements" };
  if (!item_id) return res.status(400).json({ error: "item_id is required" });
  if (!["consent", "assets", "statements"].includes(stage ?? "")) return res.status(400).json({ error: "stage must be consent, assets, or statements" });
  try {
    const { data: item, error } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_access_token").eq("id", item_id).eq("user_id", req.userId!).maybeSingle();
    if (error) throw error;
    if (!item) return res.status(404).json({ error: "Plaid Item not found" });
    const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
    const base = {
      user: { client_user_id: req.userId! },
      client_name: "Iris",
      country_codes: env.plaidCountryCodes as CountryCode[],
      language: "en",
      access_token: accessToken,
      update: { account_selection_enabled: true },
    } as any;
    if (stage === "assets") {
      base.products = ["assets"];
    } else if (stage === "statements") {
      const end = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 2);
      base.products = ["statements"];
      base.statements = { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
    } else {
      const itemState = await plaidClient.itemGet({ access_token: accessToken });
      const available = new Set(itemState.data.item.available_products ?? []);
      const alreadyAdded = new Set(itemState.data.item.products ?? []);
      const consented = new Set(itemState.data.item.consented_products ?? []);
      // Liabilities is not a Plaid Link `Products` enum value; it is observed by
      // calling the Liabilities endpoints after the Item's supported/consented
      // data access is available. Only request actual additional-consent products.
      const candidates = ["auth", "identity", "investments"] as const;
      const missingSupported = candidates.filter((product) =>
        !alreadyAdded.has(product) && !consented.has(product) && (available.has(product) || product === "auth" || product === "identity")
      );
      if (missingSupported.length === 0) {
        return res.status(409).json({ error: "This Item has no additional consentable canonical products available from Plaid." });
      }
      base.additional_consented_products = missingSupported;
    }
    const response = await plaidClient.linkTokenCreate(base);
    res.json({ link_token: response.data.link_token, item_id: item.id, stage });
  } catch (err) {
    console.error("link/upgrade-token error", safePlaidError(err));
    res.status(502).json({ error: "Failed to create Plaid evidence upgrade Link token" });
  }
});

linkRouter.post("/link/exchange", requireAuth, async (req: AuthedRequest, res) => {
  const { public_token } = req.body as { public_token?: string };
  if (!public_token) return res.status(400).json({ error: "public_token is required" });
  let itemDbId: string | null = null;
  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token, itemId = exchange.data.item_id;
    const itemResp = await plaidClient.itemGet({ access_token: accessToken });
    const institutionId = itemResp.data.item.institution_id ?? null;
    let institutionName: string | null = null;
    if (institutionId) {
      const inst = await plaidClient.institutionsGetById({ institution_id: institutionId, country_codes: env.plaidCountryCodes as CountryCode[] });
      institutionName = inst.data.institution.name;
    }
    const { data: existingItem, error: lookupError } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_access_token, institution_name, status").eq("plaid_item_id", itemId).eq("user_id", req.userId!).maybeSingle();
    if (lookupError) throw lookupError;
    if (existingItem) {
      itemDbId = existingItem.id;
      const { error } = await supabaseAdmin.from("plaid_items").update({ plaid_access_token: encryptToken(accessToken), institution_id: institutionId, institution_name: institutionName ?? existingItem.institution_name, status: "syncing" }).eq("id", existingItem.id).eq("user_id", req.userId!);
      if (error) throw error;
    } else {
      const { data: itemRow, error } = await supabaseAdmin.from("plaid_items").insert({ user_id: req.userId, plaid_item_id: itemId, plaid_access_token: encryptToken(accessToken), institution_id: institutionId, institution_name: institutionName, status: "syncing" }).select().single();
      if (error) throw error;
      itemDbId = itemRow.id;
    }
    if (!itemDbId) throw new Error("Plaid Item persistence did not return an Item id");
    await fullSyncForItem(itemDbId, req.userId!, accessToken, `plaid-link-exchange:${itemDbId}`);
    res.json({ item_id: itemDbId, institution_name: institutionName, status: "ready" });
  } catch (err) {
    console.error("link/exchange error", safePlaidError(err));
    if (itemDbId) await supabaseAdmin.from("plaid_items").update({ status: "retryable" }).eq("id", itemDbId).eq("user_id", req.userId!);
    res.status(502).json({ error: "Institution connected, but its evidence sync did not complete. The connection is retained for retry; Iris will not certify incomplete evidence." });
  }
});

linkRouter.post("/link/resync", requireAuth, async (req: AuthedRequest, res) => {
  const { data: items, error } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_access_token, last_synced_at, status").eq("user_id", req.userId!).in("status", ["active", "syncing", "retryable", "partial"]);
  if (error) return res.status(500).json({ error: "Unable to load connected institutions" });
  const outcomes: Array<{ item_id: string; status: "completed" | "failed" }> = [];
  for (const item of items ?? []) {
    try {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const syncKey = `plaid-resync:${item.id}:${item.last_synced_at ?? "never"}`;
      const { error: statusError } = await supabaseAdmin.from("plaid_items").update({ status: "syncing" }).eq("id", item.id).eq("user_id", req.userId!);
      if (statusError) throw statusError;
      await fullSyncForItem(item.id, item.user_id, accessToken, syncKey);
      outcomes.push({ item_id: item.id, status: "completed" });
    } catch (err) {
      console.error(`link/resync failed for item ${item.id}:`, safePlaidError(err));
      await supabaseAdmin.from("plaid_items").update({ status: "retryable" }).eq("id", item.id).eq("user_id", req.userId!);
      outcomes.push({ item_id: item.id, status: "failed" });
    }
  }
  const failed = outcomes.filter(x => x.status === "failed").length;
  res.status(failed ? 207 : 200).json({ synced_items: outcomes.filter(x => x.status === "completed").length, failed_items: failed, outcomes });
});
