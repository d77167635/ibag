import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { fullSyncForItem } from "../services/sync.js";

export const webhooksRouter = Router();

// Plaid requires a fast (<10s) ack. We log the raw payload immediately and
// process it asynchronously — never do the sync work inline in the handler.
webhooksRouter.post("/webhooks/plaid", async (req, res) => {
  const payload = req.body;

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
      await fullSyncForItem(item.id, item.user_id, item.plaid_access_token);
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
