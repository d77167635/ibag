import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { recomputeRoundupsForAccount } from "./roundup.js";
import { resolveMerchant, resolveSubdomain } from "./classify.js";
import { classifyTransactionWithEvidence } from "../intelligence/classification.js";
import { detectRecurringSeriesEvidenceBounded } from "./recurringEvidence.js";
import { syncLiabilitiesForItem } from "../intelligence/liabilities.js";
import { observeActivatedTrialProducts } from "./plaidTrialProductObservation.js";

const updateSyncRun = async (id: string, patch: Record<string, unknown>) => {
  const { error } = await supabaseAdmin.from("sync_runs").update(patch).eq("id", id);
  if (error) throw error;
};

async function productObservation(userId: string, itemId: string, product: string, state: string, flags: { billed: boolean; available: boolean; authorized: boolean; requested: boolean; providerAdded: boolean }, source: string, evidenceState: "observed" | "limited" | "insufficient_evidence" = state === "observed" ? "observed" : "insufficient_evidence") {
  const { error } = await supabaseAdmin.rpc("record_plaid_product_observation", {
    p_user_id: userId, p_item_id: itemId, p_product: product, p_lifecycle_state: state,
    p_billed: flags.billed, p_available: flags.available, p_authorized: flags.authorized,
    p_requested: flags.requested, p_provider_added: flags.providerAdded,
    p_provenance: { source, observation: evidenceState === "observed" ? "live" : "provider_metadata_only", provider: "plaid" },
    p_evidence_state: evidenceState,
  });
  if (error) throw error;
}

async function observeProducts(userId: string, itemId: string, accessToken: string) {
  const { data } = await plaidClient.itemGet({ access_token: accessToken });
  const billed = new Set(data.item.billed_products ?? []);
  const available = new Set(data.item.available_products ?? []);
  const added = new Set(data.item.products ?? []);
  const requested = new Set(env.plaidProducts.filter(Boolean));
  const products = new Set([...billed, ...available, ...added, ...requested]);
  for (const product of products) {
    const flags = { billed: billed.has(product), available: available.has(product), authorized: added.has(product) || billed.has(product), requested: requested.has(product), providerAdded: added.has(product) };
    const state = flags.authorized ? "authorized" : flags.available ? "available" : flags.requested ? "not_observed" : "not_requested";
    await productObservation(userId, itemId, product, state, flags, "plaid.itemGet");
  }
  return { billed, available, added, requested };
}

async function markProductObserved(userId: string, itemId: string, product: string, source: string) {
  const { data, error } = await supabaseAdmin.from("plaid_product_observations")
    .select("billed,available,authorized,requested,provider_added")
    .eq("user_id", userId).eq("item_id", itemId).eq("provider", "plaid").eq("product", product).eq("is_current", true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Cannot mark Plaid product ${product} observed without prior provider evidence`);
  await productObservation(userId, itemId, product, "observed", {
    billed: data.billed, available: data.available, authorized: data.authorized,
    requested: data.requested, providerAdded: data.provider_added,
  }, source, "observed");
}

async function normalizeTransaction(userId: string, accountId: string, tx: any) {
  const { data: rawRow, error: rawError } = await supabaseAdmin.rpc("record_plaid_transaction_observation", {
    p_user_id: userId, p_account_id: accountId, p_plaid_transaction_id: tx.transaction_id, p_raw_response: tx,
  });
  if (rawError || !rawRow) throw rawError ?? new Error("Failed to record Plaid observation");
  const rawMerchant = tx.merchant_name ?? tx.name ?? "";
  const [merchantId, subdomainId] = await Promise.all([
    rawMerchant ? resolveMerchant(rawMerchant) : Promise.resolve(null),
    resolveSubdomain(tx.personal_finance_category?.detailed ?? null),
  ]);
  const classification = classifyTransactionWithEvidence({ amount: tx.amount, plaid_category_primary: tx.personal_finance_category?.primary ?? null, plaid_category_detailed: tx.personal_finance_category?.detailed ?? null });
  const { error } = await supabaseAdmin.from("transactions").upsert({
    user_id: userId, account_id: accountId, raw_transaction_id: rawRow.id, plaid_transaction_id: tx.transaction_id,
    amount: tx.amount, iso_currency_code: tx.iso_currency_code ?? "USD", merchant_name: tx.merchant_name ?? tx.name ?? null,
    merchant_id: merchantId, plaid_category_primary: tx.personal_finance_category?.primary ?? null,
    plaid_category_detailed: tx.personal_finance_category?.detailed ?? null, subdomain_id: subdomainId, posted_date: tx.date,
    pending: tx.pending, transaction_class: classification.class, classification_evidence: classification.evidence,
    classification_version: "TRANSACTION_CLASS_V1", classified_at: new Date().toISOString(), is_active: true,
    retired_at: null, retirement_reason: null,
  }, { onConflict: "plaid_transaction_id" });
  if (error) throw error;
}

export async function fullSyncForItem(itemDbId: string, userId: string, accessToken: string, idempotencyKey?: string) {
  const key = idempotencyKey ?? `plaid-sync:${itemDbId}`;
  const { data: run, error } = await supabaseAdmin.rpc("begin_sync_run", { p_user_id: userId, p_item_id: itemDbId, p_idempotency_key: key });
  if (error || !run?.[0]) throw error ?? new Error("Unable to create sync run");
  const runId = run[0].id as string;
  const priorState = run[0].state as string;
  if (["completed", "validated"].includes(priorState)) return;
  let added = 0, modified = 0, removed = 0;
  try {
    await updateSyncRun(runId, { state: "authorized", started_at: new Date().toISOString() });
    const providerProducts = await observeProducts(userId, itemDbId, accessToken);
    await updateSyncRun(runId, { state: "started" });
    const accountsResp = await plaidClient.accountsGet({ access_token: accessToken });
    const accountMap = new Map<string, string>();
    await updateSyncRun(runId, { state: "receiving" });
    for (const acct of accountsResp.data.accounts) {
      const { data: row, error: accountError } = await supabaseAdmin.from("plaid_accounts").upsert({ user_id: userId, item_id: itemDbId, plaid_account_id: acct.account_id, name: acct.name, official_name: acct.official_name, mask: acct.mask, type: acct.type, subtype: acct.subtype, current_balance: acct.balances.current, available_balance: acct.balances.available, credit_limit: acct.balances.limit, balance_updated_at: new Date().toISOString() }, { onConflict: "plaid_account_id" }).select().single();
      if (accountError) throw accountError;
      accountMap.set(acct.account_id, row.id);
      const now = new Date().toISOString();
      const { error: retireBalanceError } = await supabaseAdmin.from("plaid_raw_balances").update({ is_current: false }).eq("user_id", userId).eq("account_id", row.id).eq("is_current", true);
      if (retireBalanceError) throw retireBalanceError;
      const { error: balanceError } = await supabaseAdmin.from("plaid_raw_balances").insert({ user_id: userId, account_id: row.id, raw_response: acct, provider_object_id: acct.account_id, effective_at: now, acquired_at: now, evidence_state: "observed", provenance: { source: "plaid.accountsGet", item_id: itemDbId }, is_current: true });
      if (balanceError) throw balanceError;
    }
    await markProductObserved(userId, itemDbId, "balance", "plaid.accountsGet");
    let cursor: string | undefined = priorState === "retryable" ? (run[0].cursor as string | undefined) : undefined;
    let hasMore = true, pages = Number(run[0].pages_processed ?? 0);
    while (hasMore) {
      await updateSyncRun(runId, { state: "provider_fetching", cursor });
      const response = await plaidClient.transactionsSync({ access_token: accessToken, cursor });
      await updateSyncRun(runId, { state: "validating" });
      for (const tx of response.data.added ?? []) { const accountId = accountMap.get(tx.account_id); if (!accountId) throw new Error(`Plaid transaction ${tx.transaction_id} references account ${tx.account_id} not returned by accountsGet`); await normalizeTransaction(userId, accountId, tx); added++; }
      for (const tx of response.data.modified ?? []) { const accountId = accountMap.get(tx.account_id); if (!accountId) throw new Error(`Plaid modified transaction ${tx.transaction_id} references account ${tx.account_id} not returned by accountsGet`); await normalizeTransaction(userId, accountId, tx); modified++; }
      for (const tx of response.data.removed ?? []) { if (!tx.transaction_id) continue; const { error: rawError } = await supabaseAdmin.rpc("retire_plaid_transaction_observation", { p_user_id: userId, p_plaid_transaction_id: tx.transaction_id }); if (rawError) throw rawError; const { error: normalizedError } = await supabaseAdmin.rpc("retire_normalized_transaction", { p_user_id: userId, p_plaid_transaction_id: tx.transaction_id, p_reason: "provider_removed" }); if (normalizedError) throw normalizedError; removed++; }
      cursor = response.data.next_cursor; hasMore = response.data.has_more; pages++;
      await updateSyncRun(runId, { state: "committing", cursor, pages_processed: pages, added_count: added, modified_count: modified, removed_count: removed, last_checkpoint_at: new Date().toISOString() });
    }
    await markProductObserved(userId, itemDbId, "transactions", "plaid.transactionsSync");
    await observeActivatedTrialProducts(userId, itemDbId, accessToken, providerProducts.added);
    await updateSyncRun(runId, { state: "reconciling" });
    const liabilityResult = await syncLiabilitiesForItem(userId, itemDbId, accessToken);
    if (liabilityResult.observed) await markProductObserved(userId, itemDbId, "liabilities", "plaid.liabilities");
    for (const accountId of accountMap.values()) await recomputeRoundupsForAccount(userId, accountId, accessToken);
    await detectRecurringSeriesEvidenceBounded(userId);
    await updateSyncRun(runId, { state: "intelligence_refresh" });
    const now = new Date().toISOString();
    const { error: itemError } = await supabaseAdmin.from("plaid_items").update({ last_synced_at: now, status: "active" }).eq("id", itemDbId).eq("user_id", userId);
    if (itemError) throw itemError;
    await updateSyncRun(runId, { state: "validated", completed_at: now, last_checkpoint_at: now, added_count: added, modified_count: modified, removed_count: removed });
    await updateSyncRun(runId, { state: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync failure";
    try { await updateSyncRun(runId, { state: "retryable", error_message: message, completed_at: new Date().toISOString() }); } catch (checkpointError) { console.error("Unable to checkpoint failed sync:", checkpointError); }
    throw error;
  }
}
