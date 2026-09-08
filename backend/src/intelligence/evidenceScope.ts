import { supabaseAdmin } from "../config/supabase.js";

export const IRIS_CANONICAL_PROVIDER_DOMAINS = [
  "auth",
  "transactions",
  "balance",
  "identity",
  "assets",
  "liabilities",
  "investments",
  "statements",
] as const;

/**
 * Resolves the single Plaid Item that can legitimately anchor the canonical
 * eight-domain provider evidence surface for an Iris run.
 *
 * This is deliberately provider-evidence scoped. User-level financial
 * intelligence may still aggregate multiple institutions where that is
 * semantically valid, but it must never masquerade as one Item's complete
 * eight-domain evidence set.
 */
export async function resolveCanonicalProviderItem(userId: string): Promise<string | null> {
  const [{ data: authorities, error: authorityError }, { data: accounts, error: accountError }] = await Promise.all([
    supabaseAdmin
      .from("plaid_product_observations")
      .select("item_id,product")
      .eq("user_id", userId)
      .eq("provider", "plaid")
      .eq("is_current", true)
      .eq("lifecycle_state", "observed")
      .eq("evidence_state", "observed"),
    supabaseAdmin
      .from("plaid_accounts")
      .select("id,item_id")
      .eq("user_id", userId),
  ]);

  if (authorityError) throw authorityError;
  if (accountError) throw accountError;

  const accountItemIds = new Map<string, string>();
  for (const row of accounts ?? []) {
    if (row.id && row.item_id) accountItemIds.set(String(row.id), String(row.item_id));
  }

  const byItem = new Map<string, Set<string>>();
  const add = (itemId: string, product: string) => {
    const set = byItem.get(itemId) ?? new Set<string>();
    set.add(product);
    byItem.set(itemId, set);
  };

  for (const row of authorities ?? []) {
    if (row.item_id && row.product) add(String(row.item_id), String(row.product));
  }

  // Specialized domains are authoritative at account scope. Their presence
  // must also belong to the candidate Item rather than another user's Item.
  const specialized = ["transactions", "balance", "liabilities"] as const;
  for (const table of ["plaid_raw_transactions", "plaid_raw_balances", "plaid_raw_liabilities"] as const) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("account_id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .eq("evidence_state", "observed");
    if (error) throw error;
    const product = table === "plaid_raw_transactions" ? specialized[0] : table === "plaid_raw_balances" ? specialized[1] : specialized[2];
    for (const row of data ?? []) {
      const itemId = row.account_id ? accountItemIds.get(String(row.account_id)) : null;
      if (itemId) add(itemId, product);
    }
  }

  return [...byItem.entries()]
    .filter(([, products]) => IRIS_CANONICAL_PROVIDER_DOMAINS.every(product => products.has(product)))
    .map(([itemId]) => itemId)
    .sort()[0] ?? null;
}

export type IrisEvidenceScope = {
  kind: "provider_item" | "user_aggregate";
  selectedItemId: string | null;
  canonicalProviderDomains: readonly string[];
};
