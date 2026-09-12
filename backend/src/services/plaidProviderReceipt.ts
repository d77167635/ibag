import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * Persist the parsed provider response returned by Plaid's SDK exactly as received
 * by the application. This is a provider-response receipt, not a synthetic test
 * record. The access token is never included in the request fingerprint.
 */
export async function recordPlaidProviderReceipt(params: {
  userId: string;
  itemId: string;
  product: string;
  endpoint: string;
  request: unknown;
  response: unknown;
  pageCursor?: string | null;
  pageNumber?: number | null;
  httpStatus?: number | null;
}) {
  const requestFingerprint = createHash("sha256")
    .update(JSON.stringify(params.request ?? null))
    .digest("hex");
  const responseBody = (params.response as any)?.data ?? params.response;
  const responseHash = createHash("sha256")
    .update(JSON.stringify(responseBody ?? null))
    .digest("hex");

  const { data, error } = await supabaseAdmin
    .from("plaid_provider_response_receipts")
    .insert({
      user_id: params.userId,
      item_id: params.itemId,
      product: params.product,
      endpoint: params.endpoint,
      request_fingerprint: requestFingerprint,
      page_cursor: params.pageCursor ?? null,
      page_number: params.pageNumber ?? null,
      http_status: params.httpStatus ?? (params.response as any)?.status ?? null,
      response_hash: responseHash,
      response_body: responseBody,
      acquired_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string, responseHash, requestFingerprint };
}
