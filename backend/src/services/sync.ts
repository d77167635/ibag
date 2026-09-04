import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { recomputeRoundupsForAccount } from "./roundup.js";
import { resolveMerchant, resolveSubdomain } from "./classify.js";
import { detectRecurringSeries } from "./intelligence.js";
import { syncLiabilitiesForItem } from "../intelligence/liabilities.js";

/**
 * Pulls real Plaid data for an Item and writes it through two layers:
 *  1. plaid_raw_* — immutable provider observations (audit source of truth)
 *  2. transactions / plaid_accounts — normalized, app-facing rows derived
 *     only from what was just fetched.
 */
export async function fullSyncForItem(itemDbId: string, userId: string, accessToken: string) {
  const accountsResp = await plaidClient.accountsGet({ access_token: accessToken });
  const accountIdMap = new Map<string, string>();

  for (const acct of accountsResp.data.accounts) {
    const { data: row, error } = await supabaseAdmin
      .from("plaid_accounts")
      .upsert(
        {
          user_id: userId,
          item_id: itemDbId,
          plaid_account_id: acct.account_id,
          name: acct.name,
          official_name: acct.official_name,
          mask: acct.mask,
          type: acct.type,
          subtype: acct.subtype,
          current_balance: acct.balances.current,
          available_balance: acct.balances.available,
          credit_limit: acct.balances.limit,
          balance_updated_at: new Date().toISOString(),
        },
        { onConflict: "plaid_account_id" },
      )
      .select()
      .single();

    if (error) throw error;
    accountIdMap.set(acct.account_id, row.id);

    const { error: balanceError } = await supabaseAdmin.from("plaid_raw_balances").insert({
      user_id: userId,
      account_id: row.id,
      raw_response: acct,
      observation_hash: undefined,
    });
    if (balanceError) throw balanceError;
  }

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const txResp = await plaidClient.transactionsSync({ access_token: accessToken, cursor });

    for (const tx of [...txResp.data.added, ...txResp.data.modified]) {
      const localAccountId = accountIdMap.get(tx.account_id);
      if (!localAccountId) continue;

      const { data: rawRow, error: rawErr } = await supabaseAdmin.rpc(
        "record_plaid_transaction_observation",
        {
          p_user_id: userId,
          p_account_id: localAccountId,
          p_plaid_transaction_id: tx.transaction_id,
          p_raw_response: tx,
        },
      );
      if (rawErr || !rawRow) throw rawErr ?? new Error("Failed to record Plaid observation");

      const rawMerchantString = tx.merchant_name ?? tx.name ?? "";
      const [merchantId, subdomainId] = await Promise.all([
        rawMerchantString ? resolveMerchant(rawMerchantString) : Promise.resolve(null),
        resolveSubdomain(tx.personal_finance_category?.detailed ?? null),
      ]);

      const { error: normalizedError } = await supabaseAdmin.from("transactions").upsert(
        {
          user_id: userId,
          account_id: localAccountId,
          raw_transaction_id: rawRow.id,
          plaid_transaction_id: tx.transaction_id,
          amount: tx.amount,
          iso_currency_code: tx.iso_currency_code ?? "USD",
          merchant_name: tx.merchant_name ?? tx.name ?? null,
          merchant_id: merchantId,
          plaid_category_primary: tx.personal_finance_category?.primary ?? null,
          plaid_category_detailed: tx.personal_finance_category?.detailed ?? null,
          subdomain_id: subdomainId,
          posted_date: tx.date,
          pending: tx.pending,
        },
        { onConflict: "plaid_transaction_id" },
      );
      if (normalizedError) throw normalizedError;
    }

    for (const removedTx of txResp.data.removed) {
      if (!removedTx.transaction_id) continue;
      const { error: retireError } = await supabaseAdmin.rpc(
        "retire_plaid_transaction_observation",
        { p_user_id: userId, p_plaid_transaction_id: removedTx.transaction_id },
      );
      if (retireError) throw retireError;

      const { error: normalizedDeleteError } = await supabaseAdmin
        .from("transactions")
        .delete()
        .eq("plaid_transaction_id", removedTx.transaction_id)
        .eq("user_id", userId);
      if (normalizedDeleteError) throw normalizedDeleteError;
    }

    cursor = txResp.data.next_cursor;
    hasMore = txResp.data.has_more;
  }

  await syncLiabilitiesForItem(userId, accessToken);

  for (const localAccountId of accountIdMap.values()) {
    await recomputeRoundupsForAccount(userId, localAccountId, accessToken);
  }

  await detectRecurringSeries(userId);

  const { error: itemError } = await supabaseAdmin
    .from("plaid_items")
    .update({ last_synced_at: new Date().toISOString(), status: "active" })
    .eq("id", itemDbId)
    .eq("user_id", userId);
  if (itemError) throw itemError;
}
