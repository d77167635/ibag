import { Router } from "express";
import crypto from "node:crypto";
import * as jose from "jose";
import { supabaseAdmin } from "../config/supabase.js";
import { fullSyncForItem } from "../services/sync.js";
import { decryptToken } from "../config/crypto.js";
import { plaidClient } from "../plaid/client.js";

export const webhooksRouter = Router();

// Plaid signs webhooks with an ES256 JWT in the Plaid-Verification header.
// Verification is optional per Plaid's docs, but without it this endpoint
// accepts and acts on any POST from anyone who finds the URL — it can
// trigger real syncs and mark items as needing reauth. The verification
// keys rotate rarely, so caching by kid is safe and avoids a Plaid API
// call on every webhook.
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

    // Reject stale webhooks — Plaid recommends rejecting if the JWT is
    // more than a few minutes old, which also protects against replay.
    const issuedAt = (payload.iat as number | undefined) ?? 0;
    if (Date.now() / 1000 - issuedAt > 300) return false;

    const actualHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    return payload.request_body_sha256 === actualHash;
  } catch {
    return false;
  }
}

// Plaid requires a fast (<10s) ack. We log the raw payload immediately and
// process it asynchronously — never do the sync work inline in the handler.
webhooksRouter.post("/webhooks/plaid", async (req, res) => {
  const payload = req.body;
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;

  const verified = await verifyPlaidWebhook(req.header("Plaid-Verification"), rawBody);
  if (!verified) {
    console.warn("Rejected unverified webhook", { webhook_type: payload?.webhook_type, webhook_code: payload?.webhook_code });
    // Still 200 — Plaid doesn't need a distinguishable error, and giving
    // one just tells an attacker their forged payload was noticed.
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

  // Ack immediately regardless of downstream processing outcome.
  res.status(200).json({ received: true });

  if (error) {
    console.error("Failed to log webhook event", error);
    return;
  }

  // Fire-and-forget async processing. In production, replace this with a
  // real queue (e.g. a Postgres-backed job table polled by a Render worker,
  // or a proper queue service) rather than in-process async work.
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
      await fullSyncForItem(item.id, item.user_id, decryptToken(item.plaid_access_token));
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
