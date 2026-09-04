import { Router } from "express";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fullSyncForItem } from "../services/sync.js";
import { encryptToken } from "../config/crypto.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";

export const linkRouter = Router();

linkRouter.post("/link/token", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.userId! },
      client_name: "Iris",
      products: env.plaidProducts as Products[],
      country_codes: env.plaidCountryCodes as CountryCode[],
      language: "en",
      webhook: env.plaidWebhookUrl || undefined,
    });

    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("link/token error", err);
    res.status(502).json({ error: "Failed to create Plaid Link token" });
  }
});

linkRouter.post("/link/exchange", requireAuth, async (req: AuthedRequest, res) => {
  const { public_token } = req.body as { public_token?: string };
  if (!public_token) {
    return res.status(400).json({ error: "public_token is required" });
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const itemResp = await plaidClient.itemGet({ access_token: accessToken });
    const institutionId = itemResp.data.item.institution_id ?? null;

    let institutionName: string | null = null;
    if (institutionId) {
      const inst = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: env.plaidCountryCodes as CountryCode[],
      });
      institutionName = inst.data.institution.name;
    }

    const { data: itemRow, error } = await supabaseAdmin
      .from("plaid_items")
      .insert({
        user_id: req.userId,
        plaid_item_id: itemId,
        plaid_access_token: encryptToken(accessToken),
        institution_id: institutionId,
        institution_name: institutionName,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;
    await fullSyncForItem(itemRow.id, req.userId!, accessToken);

    res.json({ item_id: itemRow.id, institution_name: institutionName });
  } catch (err) {
    console.error("link/exchange error", err);
    res.status(502).json({ error: "Failed to exchange public token" });
  }
});

// Manual refresh. Legacy plaintext Sandbox tokens are encrypted in-place
// before the first Plaid call; new tokens remain encrypted at creation.
linkRouter.post("/link/resync", requireAuth, async (req: AuthedRequest, res) => {
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, plaid_access_token")
    .eq("user_id", req.userId)
    .eq("status", "active");

  if (error) return res.status(500).json({ error: error.message });

  try {
    for (const item of items ?? []) {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      await fullSyncForItem(item.id, item.user_id, accessToken);
    }
    res.json({ synced_items: items?.length ?? 0 });
  } catch (err) {
    console.error("link/resync error", err);
    res.status(502).json({ error: "Resync failed" });
  }
});
