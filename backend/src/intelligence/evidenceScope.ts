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
 * Statements is an authoritative Level-2 domain, but it is intentionally
 * deferred until real banking. It therefore remains part of the architecture
 * without being a required observed product for the current Sandbox evidence
 * boundary. The current canonical Item must still be complete across every
 * domain that is actually available in this environment.
 */
const CURRENTLY_REQUIRED_PROVIDER_DOMAINS = IRIS_CANONICAL_PROVIDER_DOMAINS.filter((domain) => domain !== "statements");

/**
 * Resolves one Plaid Item that can legitimately anchor the current canonical
 * provider evidence surface for an Iris run.
 *
 * This is deliberately provider-evidence scoped. User-level financial
 * intelligence may aggregate multiple institutions only where that aggregation
 * is semantically governed; it must never silently combine unrelated Items to
 * manufacture a single Item's complete evidence boundary.
 */
export async function resolveCanonicalProviderItem(userId: string): Promise<string | null> {
  const [{ data: authorities, error: authorityError }, { data: accounts, error: accountError }, { data: items, error: itemError }] = await Promise.all([
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
    supabaseAdmin
      .from("plaid_items")
      .select("id,created_at,status")
      .eq("user_id", userId),
  ]);

  if (authorityError) throw authorityError;
  if (accountError) throw accountError;
  if (itemError) throw itemError;

  const accountItemIds = new Map<string, string>();
  for (const row of accounts ?? []) if (row.id && row.item_id) accountItemIds.set(String(row.id), String(row.item_id));

  const byItem = new Map<string, Set<string>>();
  const add = (itemId: string, product: string) => {
    const set = byItem.get(itemId) ?? new Set<string>();
    set.add(product);
    byItem.set(itemId, set);
  };

  for (const row of authorities ?? []) if (row.item_id && row.product) add(String(row.item_id), String(row.product));

  for (const table of ["plaid_raw_transactions", "plaid_raw_balances", "plaid_raw_liabilities"] as const) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("account_id")
      .eq("user_id", userId)
      .eq("is_current", true)
      .eq("evidence_state", "observed");
    if (error) throw error;
    const product = table === "plaid_raw_transactions" ? "transactions" : table === "plaid_raw_balances" ? "balance" : "liabilities";
    for (const row of data ?? []) {
      const itemId = row.account_id ? accountItemIds.get(String(row.account_id)) : null;
      if (itemId) add(itemId, product);
    }
  }

  const itemCreatedAt = new Map((items ?? []).map((item) => [String(item.id), String(item.created_at ?? "")]));
  return [...byItem.entries()]
    .filter(([, products]) => CURRENTLY_REQUIRED_PROVIDER_DOMAINS.every((product) => products.has(product)))
    .sort(([a, aProducts], [b, bProducts]) => {
      const countDelta = bProducts.size - aProducts.size;
      if (countDelta !== 0) return countDelta;
      return (itemCreatedAt.get(b) ?? "").localeCompare(itemCreatedAt.get(a) ?? "");
    })
    .map(([itemId]) => itemId)[0] ?? null;
}

export type IrisEvidenceScope = {
  kind: "provider_item" | "user_aggregate";
  selectedItemId: string | null;
  canonicalProviderDomains: readonly string[];
  deferredProviderDomains?: readonly string[];
};
