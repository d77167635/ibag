import { Router } from "express";
import crypto from "node:crypto";
import * as jose from "jose";
import { supabaseAdmin } from "../config/supabase.js";
import { fullSyncForItem } from "../services/sync.js";
import { plaidClient } from "../plaid/client.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";

export const webhooksRouter = Router();

const verificationKeyCache = new Map<string, jose.CryptoKey | Uint8Array>();

async function getVerificationKey(kid: string) {
  const cached = verificationKeyCache.get(kid);
  if (cached) return cached;

  const resp = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  const key = await jose.importJWK(resp.data.key as jose.JWK, "ES256");
  verificationKeyCache.set(kid, key);
  return key;
}

async function verifyPlaidWebhook(verificationHeader: string | undefined, rawBody: Buffer | undefined): Promise<boolean> {
  if (!verificationHeader || !rawBody) return false;

  try {
    const { kid, alg } = jose.decodeProtectedHeader(verificationHeader);
    if (alg !== "ES256" || !kid) return false;

    const key = await getVerificationKey(kid);
    const { payload } = await jose.jwtVerify(verificationHeader, key);
    const issuedAt = (payload.iat as number | undefined) ?? 0;
    if (Date.now() / 1000 - issuedAt > 300) return false;

    const actualHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    return payload.request_body_sha256 === actualHash;
  } catch {
    return false;
  }
}

webhooksRouter.post("/webhooks/plaid", async (req, res) => {
  const payload = req.body;
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;

  const verified = await verifyPlaidWebhook(req.header("Plaid-Verification"), rawBody);
  if (!verified) {
    console.warn("Rejected unverified webhook", { webhook_type: payload?.webhook_type, webhook_code: payload?.webhook_code });
    return res.status(200).json({ received: true });
  }

  const { data: eventRow, error } = await supabaseAdmin
    .from("plaid_webhook_events")
    .insert({
      plaid_item_id: payload.item_id ?? null,
      webhook_type: payload.webhook_type ?? null,
      webhook_code: payload.webhook_code ?? null,
      raw_payload: payload,
    })
    .select()
    .single();

  res.status(200).json({ received: true });

  if (error) {
    console.error("Failed to log webhook event", error);
    return;
  }

  processWebhookEvent(eventRow.id).catch((err) => {
    console.error("Webhook processing failed", err);
  });
});

async function processWebhookEvent(eventId: string) {
  const { data: event, error } = await supabaseAdmin
    .from("plaid_webhook_events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (error || !event) return;

  if (event.webhook_type === "TRANSACTIONS" && event.webhook_code === "SYNC_UPDATES_AVAILABLE") {
    const { data: item } = await supabaseAdmin
      .from("plaid_items")
      .select("id, user_id, plaid_access_token")
      .eq("plaid_item_id", event.plaid_item_id)
      .single();

    if (item) {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      await fullSyncForItem(item.id, item.user_id, accessToken);
    }
  }

  if (event.webhook_type === "ITEM" && event.webhook_code === "ERROR") {
    await supabaseAdmin
      .from("plaid_items")
      .update({ status: "pending_reauth", last_webhook_code: event.webhook_code })
      .eq("plaid_item_id", event.plaid_item_id);
  }

  await supabaseAdmin
    .from("plaid_webhook_events")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("id", eventId);
}
