import { supabaseAdmin } from "../config/supabase.js";
import { decryptTokenForMigration } from "../config/crypto.js";

/**
 * Reads a Plaid access token and migrates legacy plaintext-at-rest values
 * before returning the credential to the caller. The plaintext is never
 * returned to logs or API responses.
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
