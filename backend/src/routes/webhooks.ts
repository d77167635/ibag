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
    if (Math.abs(Date.now() / 1000 - issuedAt) > 300) return false;
    const actualHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    return payload.request_body_sha256 === actualHash;
  } catch {
    return false;
  }
}

webhooksRouter.post("/webhooks/plaid", async (req, res) => {
  const payload = req.body;
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
  if (!(await verifyPlaidWebhook(req.header("Plaid-Verification"), rawBody))) {
    console.warn("Rejected unverified webhook", { webhook_type: payload?.webhook_type, webhook_code: payload?.webhook_code });
    return res.status(200).json({ received: true });
  }

  const { data: eventRow, error } = await supabaseAdmin.from("plaid_webhook_events").insert({
    plaid_item_id: payload.item_id ?? null,
    webhook_type: payload.webhook_type ?? null,
    webhook_code: payload.webhook_code ?? null,
    raw_payload: payload,
  }).select().single();

  if (error) {
    if (error.code === "23505") return res.status(200).json({ received: true, duplicate: true });
    console.error("Failed to persist webhook event", error);
    return res.status(500).json({ error: "Webhook persistence failed" });
  }

  try {
    await processWebhookEvent(eventRow.id);
    return res.status(200).json({ received: true, processed: true });
  } catch (err) {
    console.error("Webhook processing failed", { eventId: eventRow.id, error: err });
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export async function processWebhookEvent(eventId: string) {
  const { data: event, error } = await supabaseAdmin.from("plaid_webhook_events").select("*").eq("id", eventId).single();
  if (error || !event) throw error ?? new Error("Webhook event not found");
  if (event.processed) return;

  if (event.webhook_type === "TRANSACTIONS" && event.webhook_code === "SYNC_UPDATES_AVAILABLE") {
    const { data: item, error: itemError } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_access_token, last_synced_at").eq("plaid_item_id", event.plaid_item_id).single();
    if (itemError) throw itemError;
    if (item) {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const syncKey = `plaid-webhook:${event.id}`;
      await fullSyncForItem(item.id, item.user_id, accessToken, syncKey);
    }
  }

  if (event.webhook_type === "ITEM" && event.webhook_code === "ERROR") {
    const { error: itemUpdateError } = await supabaseAdmin.from("plaid_items").update({ status: "pending_reauth", last_webhook_code: event.webhook_code }).eq("plaid_item_id", event.plaid_item_id);
    if (itemUpdateError) throw itemUpdateError;
  }

  const { error: processedError } = await supabaseAdmin.from("plaid_webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", eventId).eq("processed", false);
  if (processedError) throw processedError;
}

export async function recoverPendingWebhookEvents() {
  const { data: events, error } = await supabaseAdmin.from("plaid_webhook_events").select("id").eq("processed", false).order("received_at", { ascending: true }).limit(25);
  if (error) throw error;
  for (const event of events ?? []) {
    try { await processWebhookEvent(event.id); }
    catch (err) { console.error("Pending webhook recovery failed", { eventId: event.id, error: err }); }
  }
}
