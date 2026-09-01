import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { recomputeRoundupsForAccount } from "./roundup.js";
import { resolveMerchant, resolveSubdomain } from "./classify.js";

/**
 * Pulls real Plaid data for an Item and writes it through two layers:
 *  1. plaid_raw_* — the untouched API response (audit source of truth)
 *  2. transactions / plaid_accounts — normalized, app-facing rows derived
 *     only from what was just fetched.
 *
 * This function is the ONLY place transaction/account/balance rows get
 * written. No other code path may insert into these tables, which is what
 * keeps the "no fake data" rule structurally true rather than just a policy.
 */
export async function fullSyncForItem(itemDbId: string, userId: string, accessToken: string) {
  // --- Accounts ---
  const accountsResp = await plaidClient.accountsGet({ access_token: accessToken });

  const accountIdMap = new Map<string, string>(); // plaid_account_id -> our uuid

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
        },
        { onConflict: "plaid_account_id" }
      )
      .select()
      .single();

    if (error) throw error;
    accountIdMap.set(acct.account_id, row.id);

    // Raw balance mirror — the exact object Plaid returned for this account
    await supabaseAdmin.from("plaid_raw_balances").insert({
      user_id: userId,
      account_id: row.id,
      raw_response: acct,
    });
  }

  // --- Transactions (Plaid's /transactions/sync, real API, cursor-based) ---
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const txResp = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
    });

    for (const tx of txResp.data.added) {
      const localAccountId = accountIdMap.get(tx.account_id);
      if (!localAccountId) continue; // account not yet mapped this pass; will catch on next sync

      const { data: rawRow, error: rawErr } = await supabaseAdmin
        .from("plaid_raw_transactions")
        .upsert(
          {
            user_id: userId,
            account_id: localAccountId,
            plaid_transaction_id: tx.transaction_id,
            raw_response: tx,
          },
          { onConflict: "plaid_transaction_id" }
        )
        .select()
        .single();

      if (rawErr) throw rawErr;

      const rawMerchantString = tx.merchant_name ?? tx.name ?? "";
      const [merchantId, subdomainId] = await Promise.all([
        rawMerchantString ? resolveMerchant(rawMerchantString) : Promise.resolve(null),
        resolveSubdomain(tx.personal_finance_category?.detailed ?? null),
      ]);

      await supabaseAdmin.from("transactions").upsert(
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
        { onConflict: "plaid_transaction_id" }
      );
    }

    cursor = txResp.data.next_cursor;
    hasMore = txResp.data.has_more;
  }

  // --- Recompute round-up simulation for every account touched this sync ---
  for (const localAccountId of accountIdMap.values()) {
    await recomputeRoundupsForAccount(userId, localAccountId, accessToken);
  }

  await supabaseAdmin
    .from("plaid_items")
    .update({ last_synced_at: new Date().toISOString(), status: "active" })
    .eq("id", itemDbId);
}
