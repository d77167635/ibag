import { supabaseAdmin } from "../config/supabase.js";
import { decryptTokenForMigration } from "../config/crypto.js";

/**
 * Reads one Plaid access token and migrates a legacy plaintext-at-rest value
 * before returning the credential. Plaintext is never logged or returned by
 * an HTTP endpoint.
 */
export async function getPlaidAccessToken(
  itemId: string,
  userId: string,
  storedValue: string,
): Promise<string> {
  const migrated = decryptTokenForMigration(storedValue);

  if (migrated.migrated) {
    const { error } = await supabaseAdmin
      .from("plaid_items")
      .update({ plaid_access_token: migrated.encrypted })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Plaid access-token migration failed: ${error.message}`);
    }
  }

  return migrated.plaintext;
}

/**
 * Startup migration for legacy Items. Idempotent: already encrypted values
 * are not rewritten.
 */
export async function migrateLegacyPlaidAccessTokens(): Promise<number> {
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, plaid_access_token");

  if (error) throw new Error(`Unable to inspect Plaid token storage: ${error.message}`);

  let migratedCount = 0;
  for (const item of items ?? []) {
    const migrated = decryptTokenForMigration(item.plaid_access_token);
    if (!migrated.migrated) continue;

    const { error: updateError } = await supabaseAdmin
      .from("plaid_items")
      .update({ plaid_access_token: migrated.encrypted })
      .eq("id", item.id)
      .eq("user_id", item.user_id);

    if (updateError) {
      throw new Error(`Plaid access-token migration failed: ${updateError.message}`);
    }
    migratedCount += 1;
  }

  return migratedCount;
}
