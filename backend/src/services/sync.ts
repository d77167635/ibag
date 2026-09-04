import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { recomputeRoundupsForAccount } from "./roundup.js";
import { resolveMerchant, resolveSubdomain } from "./classify.js";
import { classifyTransactionWithEvidence } from "../intelligence/classification.js";
import { detectRecurringSeries } from "./intelligence.js";
import { syncLiabilitiesForItem } from "../intelligence/liabilities.js";

async function updateSyncRun(id: string, patch: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("sync_runs").update(patch).eq("id", id);
  if (error) throw error;
}

async function observeProducts(userId: string, itemDbId: string, accessToken: string) {
  const { data } = await plaidClient.itemGet({ access_token: accessToken });
  const billed = new Set(data.item.billed_products ?? []);
  const available = new Set(data.item.available_products ?? []);
  const products = new Set([...billed, ...available]);

  for (const product of products) {
    const isBilled = billed.has(product);
    const isAvailable = available.has(product);
    await supabaseAdmin.from("plaid_product_observations").insert({
      user_id: userId,
      item_id: itemDbId,
      provider: "plaid",
      product,
      lifecycle_state: isBilled ? "authorized" : isAvailable ? "available" : "observed",
      billed: isBilled,
      available: isAvailable,
      authorized: isBilled,
      observed_at: new Date().toISOString(),
      provenance: { source: "plaid.itemGet", observation: "live" },
    });
  }
}

/**
 * Durable Plaid synchronization. A sync run records its lifecycle and
 * transaction-sync cursor so retries and interrupted runs remain auditable.
 * Financial writes remain real-provider-only; no synthetic observations are
 * created.
 */
export async function fullSyncForItem(itemDbId: string, userId: string, accessToken: string) {
  const idempotencyKey = `plaid-sync:${itemDbId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const { data: run, error: runError } = await supabaseAdmin
    .from("sync_runs")
    .insert({ user_id: userId, item_id: itemDbId, idempotency_key: idempotencyKey, state: "requested" })
    .select("id")
    .single();
  if (runError || !run) throw runError ?? new Error("Unable to create sync run");

  const runId = run.id;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  try {
    await updateSyncRun(runId, { state: "authorized", started_at: new Date().toISOString() });
    await observeProducts(userId, itemDbId, accessToken);
    await updateSyncRun(runId, { state: "started" });

    const accountsResp = await plaidClient.accountsGet({ access_token: accessToken });
    const accountIdMap = new Map<string, string>();

    await updateSyncRun(runId, { state: "receiving" });
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
        provider_object_id: acct.account_id,
        effective_at: new Date().toISOString(),
        acquired_at: new Date().toISOString(),
        evidence_state: "observed",
        provenance: { source: "plaid.accountsGet", item_id: itemDbId },
      });
      if (balanceError) throw balanceError;
    }

    let cursor: string | undefined;
    let hasMore = true;
    let pagesProcessed = 0;

    while (hasMore) {
      await updateSyncRun(runId, { state: "provider_fetching", cursor });
      const txResp = await plaidClient.transactionsSync({ access_token: accessToken, cursor });
      await updateSyncRun(runId, { state: "validating" });

      for (const tx of txResp.data.added ?? []) {
        const localAccountId = accountIdMap.get(tx.account_id);
        if (!localAccountId) continue;

        const { data: rawRow, error: rawErr } = await supabaseAdmin.rpc("record_plaid_transaction_observation", {
          p_user_id: userId,
          p_account_id: localAccountId,
          p_plaid_transaction_id: tx.transaction_id,
          p_raw_response: tx,
        });
        if (rawErr || !rawRow) throw rawErr ?? new Error("Failed to record Plaid observation");

        const rawMerchantString = tx.merchant_name ?? tx.name ?? "";
        const [merchantId, subdomainId] = await Promise.all([
          rawMerchantString ? resolveMerchant(rawMerchantString) : Promise.resolve(null),
          resolveSubdomain(tx.personal_finance_category?.detailed ?? null),
        ]);
        const classification = classifyTransactionWithEvidence({
          amount: tx.amount,
          plaid_category_primary: tx.personal_finance_category?.primary ?? null,
          plaid_category_detailed: tx.personal_finance_category?.detailed ?? null,
        });

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
            transaction_class: classification.class,
            classification_evidence: classification.evidence,
            classification_version: "TRANSACTION_CLASS_V1",
            classified_at: new Date().toISOString(),
          },
          { onConflict: "plaid_transaction_id" },
        );
        if (normalizedError) throw normalizedError;
        addedCount += 1;
      }

      for (const tx of txResp.data.modified ?? []) {
        const localAccountId = accountIdMap.get(tx.account_id);
        if (!localAccountId) continue;
        const { data: rawRow, error: rawErr } = await supabaseAdmin.rpc("record_plaid_transaction_observation", {
          p_user_id: userId,
          p_account_id: localAccountId,
          p_plaid_transaction_id: tx.transaction_id,
          p_raw_response: tx,
        });
        if (rawErr || !rawRow) throw rawErr ?? new Error("Failed to record Plaid observation");
        const rawMerchantString = tx.merchant_name ?? tx.name ?? "";
        const [merchantId, subdomainId] = await Promise.all([
          rawMerchantString ? resolveMerchant(rawMerchantString) : Promise.resolve(null),
          resolveSubdomain(tx.personal_finance_category?.detailed ?? null),
        ]);
        const classification = classifyTransactionWithEvidence({
          amount: tx.amount,
          plaid_category_primary: tx.personal_finance_category?.primary ?? null,
          plaid_category_detailed: tx.personal_finance_category?.detailed ?? null,
        });
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
            transaction_class: classification.class,
            classification_evidence: classification.evidence,
            classification_version: "TRANSACTION_CLASS_V1",
            classified_at: new Date().toISOString(),
          },
          { onConflict: "plaid_transaction_id" },
        );
        if (normalizedError) throw normalizedError;
        modifiedCount += 1;
      }

      for (const removedTx of txResp.data.removed ?? []) {
        if (!removedTx.transaction_id) continue;
        const { error: retireError } = await supabaseAdmin.rpc("retire_plaid_transaction_observation", {
          p_user_id: userId,
          p_plaid_transaction_id: removedTx.transaction_id,
        });
        if (retireError) throw retireError;
        const { error: normalizedDeleteError } = await supabaseAdmin
          .from("transactions")
          .delete()
          .eq("plaid_transaction_id", removedTx.transaction_id)
          .eq("user_id", userId);
        if (normalizedDeleteError) throw normalizedDeleteError;
        removedCount += 1;
      }

      cursor = txResp.data.next_cursor;
      hasMore = txResp.data.has_more;
      pagesProcessed += 1;
      await updateSyncRun(runId, {
        state: "committing",
        cursor,
        pages_processed: pagesProcessed,
        added_count: addedCount,
        modified_count: modifiedCount,
        removed_count: removedCount,
        last_checkpoint_at: new Date().toISOString(),
      });
    }

    await updateSyncRun(runId, { state: "reconciling" });
    await syncLiabilitiesForItem(userId, accessToken);
    for (const localAccountId of accountIdMap.values()) {
      await recomputeRoundupsForAccount(userId, localAccountId, accessToken);
    }
    await detectRecurringSeries(userId);

    await updateSyncRun(runId, { state: "intelligence_refresh" });
    const { error: itemError } = await supabaseAdmin
      .from("plaid_items")
      .update({ last_synced_at: new Date().toISOString(), status: "active" })
      .eq("id", itemDbId)
      .eq("user_id", userId);
    if (itemError) throw itemError;

    await updateSyncRun(runId, {
      state: "validated",
      completed_at: new Date().toISOString(),
      last_checkpoint_at: new Date().toISOString(),
      added_count: addedCount,
      modified_count: modifiedCount,
      removed_count: removedCount,
    });
    await updateSyncRun(runId, { state: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure";
    try {
      await updateSyncRun(runId, { state: "failed", error_message: message, completed_at: new Date().toISOString() });
    } catch (checkpointError) {
      console.error("Unable to checkpoint failed sync:", checkpointError);
    }
    throw error;
  }
}
