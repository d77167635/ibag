import type { SupabaseClient } from "@supabase/supabase-js";

export type IrisProviderEvidence = {
  accounts: unknown[];
  institutions: unknown[];
  transactions: unknown[];
  product_observations: unknown[];
  limitations: string[];
};

/** Retrieves read-only provider evidence for Iris without mutating or synthesizing provider facts. */
export async function retrieveProviderEvidence(
  supabase: SupabaseClient,
  userId: string,
  options?: { accountId?: string; transactionId?: string; product?: string; limit?: number },
): Promise<IrisProviderEvidence> {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  const [accountsResult, itemsResult, transactionsResult, productsResult] = await Promise.all([
    supabase
      .from("plaid_accounts")
      .select("id, item_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, roundup_enabled")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("plaid_items")
      .select("id, institution_id, institution_name, status, last_webhook_code, last_synced_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    (() => {
      let query = supabase
        .from("transactions")
        .select("id, account_id, plaid_transaction_id, amount, iso_currency_code, merchant_name, plaid_category_primary, plaid_category_detailed, posted_date, pending, transaction_class, classification_evidence, classification_version, classified_at, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("posted_date", { ascending: false })
        .limit(limit);
      if (options?.transactionId) query = query.eq("id", options.transactionId);
      if (options?.accountId) query = query.eq("account_id", options.accountId);
      return query;
    })(),
    (() => {
      let query = supabase
        .from("plaid_product_observations")
        .select("item_id, product, lifecycle_state, billed, available, authorized, observed_at, effective_at, acquired_at, evidence_state, observation_version, is_current, requested, provider_added")
        .eq("user_id", userId)
        .eq("provider", "plaid")
        .eq("is_current", true)
        .eq("lifecycle_state", "observed")
        .order("observed_at", { ascending: false })
        .limit(limit);
      if (options?.product) query = query.eq("product", options.product);
      return query;
    })(),
  ]);

  const errors = [
    accountsResult.error ? `Accounts: ${accountsResult.error.message}` : null,
    itemsResult.error ? `Institutions: ${itemsResult.error.message}` : null,
    transactionsResult.error ? `Transactions: ${transactionsResult.error.message}` : null,
    productsResult.error ? `Product observations: ${productsResult.error.message}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    accounts: accountsResult.data ?? [],
    institutions: itemsResult.data ?? [],
    transactions: transactionsResult.data ?? [],
    product_observations: productsResult.data ?? [],
    limitations: errors,
  };
}