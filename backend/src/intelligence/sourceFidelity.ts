import { supabaseAdmin } from "../config/supabase.js";

export type FidelitySeverity = "pass" | "warn" | "fail";
export type FidelityCheck = {
  id: string;
  severity: FidelitySeverity;
  title: string;
  detail: string;
  observed: number | string | boolean | null;
  expected: number | string | boolean | null;
};

/**
 * Hard evidence gate between provider ingestion and Iris reasoning.
 * This never manufactures financial facts. It certifies only the integrity
 * of observations already persisted from Plaid and their canonical lineage.
 */
export async function assessSourceFidelity(userId: string) {
  const [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, status, last_synced_at", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id, account_id, plaid_transaction_id, raw_transaction_id, is_active", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, is_current, evidence_state", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact", head: false }).eq("user_id", userId),
    supabaseAdmin.from("sync_runs").select("id, item_id, state, cursor, pages_processed, added_count, modified_count, removed_count, completed_at, error_message", { count: "exact", head: false }).eq("user_id", userId).order("requested_at", { ascending: false }).limit(100),
    supabaseAdmin.from("plaid_product_observations").select("item_id, product, lifecycle_state, is_current", { count: "exact", head: false }).eq("user_id", userId).eq("provider", "plaid").eq("is_current", true),
  ]);

  const queryErrors = [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products].filter(q => q.error).map(q => q.error!.message);
  if (queryErrors.length) {
    return {
      gate_version: "IRIS_SOURCE_FIDELITY_V1",
      status: "fail" as FidelitySeverity,
      ready_for_higher_order_intelligence: false,
      checks: [{ id: "query_integrity", severity: "fail" as FidelitySeverity, title: "Evidence store readable", detail: queryErrors.join("; "), observed: null, expected: true }],
      limitations: ["The evidence store could not be completely inspected."],
      counts: {},
      generated_at: new Date().toISOString(),
    };
  }

  const itemRows = items.data ?? [];
  const accountRows = accounts.data ?? [];
  const txRows = tx.data ?? [];
  const rawTxRows = rawTx.data ?? [];
  const rawBalanceRows = rawBalances.data ?? [];
  const rawLiabilityRows = rawLiabilities.data ?? [];
  const runRows = runs.data ?? [];
  const productRows = products.data ?? [];
  const checks: FidelityCheck[] = [];
  const fail = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "fail", title, detail, observed, expected });
  const pass = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "pass", title, detail, observed, expected });
  const warn = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "warn", title, detail, observed, expected });

  const itemIds = new Set(itemRows.map((r: any) => r.id));
  const accountIds = new Set(accountRows.map((r: any) => r.id));
  const accountProviderIds = new Set<string>();
  const duplicateAccountProviderIds = new Set<string>();
  for (const row of accountRows as any[]) {
    if (accountProviderIds.has(row.plaid_account_id)) duplicateAccountProviderIds.add(row.plaid_account_id);
    accountProviderIds.add(row.plaid_account_id);
  }
  const orphanAccounts = accountRows.filter((r: any) => !itemIds.has(r.item_id));
  orphanAccounts.length ? fail("account_item_lineage", "Account → Item lineage", `${orphanAccounts.length} account(s) reference an item outside this user's observed Item set.`, orphanAccounts.length, 0) : pass("account_item_lineage", "Account → Item lineage", "Every account belongs to a user-owned Plaid Item.", 0, 0);
  duplicateAccountProviderIds.size ? fail("account_provider_identity", "Provider account identity", `${duplicateAccountProviderIds.size} duplicate provider account identity value(s) exist for this user.`, duplicateAccountProviderIds.size, 0) : pass("account_provider_identity", "Provider account identity", "Provider account identities are unique for this user.", 0, 0);

  const rawByProvider = new Set(rawTxRows.map((r: any) => r.plaid_transaction_id));
  const canonicalProviderIds = new Set(txRows.map((r: any) => r.plaid_transaction_id));
  const orphanCanonical = txRows.filter((r: any) => !rawByProvider.has(r.plaid_transaction_id));
  const orphanRaw = rawTxRows.filter((r: any) => !canonicalProviderIds.has(r.plaid_transaction_id) && r.is_current);
  orphanCanonical.length ? fail("transaction_raw_lineage", "Transaction → raw observation lineage", `${orphanCanonical.length} active canonical transaction(s) have no matching Plaid raw observation.`, orphanCanonical.length, 0) : pass("transaction_raw_lineage", "Transaction → raw observation lineage", "Active canonical transactions resolve to raw provider observations.", 0, 0);
  orphanRaw.length ? warn("raw_canonical_reconciliation", "Raw → canonical reconciliation", `${orphanRaw.length} current raw transaction observation(s) have no active canonical transaction. These may require retirement/removal reconciliation.`, orphanRaw.length, 0) : pass("raw_canonical_reconciliation", "Raw → canonical reconciliation", "Current raw transaction identities reconcile to canonical transactions.", 0, 0);

  const orphanTransactions = txRows.filter((r: any) => !accountIds.has(r.account_id));
  orphanTransactions.length ? fail("transaction_account_lineage", "Transaction → Account lineage", `${orphanTransactions.length} canonical transaction(s) reference an account outside this user's account set.`, orphanTransactions.length, 0) : pass("transaction_account_lineage", "Transaction → Account lineage", "Canonical transactions resolve to user-owned accounts.", 0, 0);

  const currentRuns = runRows.filter((r: any) => itemIds.has(r.item_id));
  const incompleteRuns = currentRuns.filter((r: any) => !["completed", "validated"].includes(r.state));
  if (!itemRows.length) warn("provider_presence", "Provider source presence", "No Plaid Item is connected for this user, so Iris cannot certify financial evidence readiness.", 0, ">=1");
  else if (incompleteRuns.length) warn("sync_completion", "Sync completion", `${incompleteRuns.length} recent sync run(s) are not completed/validated.`, incompleteRuns.length, 0);
  else pass("sync_completion", "Sync completion", "Observed sync runs are completed or validated.", 0, 0);

  const latestRunByItem = new Map<string, any>();
  for (const run of currentRuns as any[]) if (!latestRunByItem.has(run.item_id)) latestRunByItem.set(run.item_id, run);
  const neverCompleted = itemRows.filter((item: any) => ![...latestRunByItem.values()].some((run: any) => run.item_id === item.id && ["completed", "validated"].includes(run.state)));
  neverCompleted.length ? fail("item_sync_certification", "Item synchronization certification", `${neverCompleted.length} connected Item(s) have no completed/validated sync run.`, neverCompleted.length, 0) : pass("item_sync_certification", "Item synchronization certification", "Every connected Item has a completed/validated sync run.", 0, 0);

  const observedTransactions = productRows.filter((r: any) => r.product === "transactions" && ["observed", "validated", "fresh"].includes(r.lifecycle_state)).length;
  const observedBalances = productRows.filter((r: any) => r.product === "balance" && ["observed", "validated", "fresh"].includes(r.lifecycle_state)).length;
  if (itemRows.length && observedTransactions < itemRows.length) fail("transactions_product_observation", "Transactions provider observation", "Not every connected Item has a current observed Transactions product state.", observedTransactions, itemRows.length);
  else if (itemRows.length) pass("transactions_product_observation", "Transactions provider observation", "Every connected Item has a current observed Transactions state.", observedTransactions, itemRows.length);
  if (itemRows.length && observedBalances < itemRows.length) fail("balance_product_observation", "Balance provider observation", "Not every connected Item has a current observed Balance state.", observedBalances, itemRows.length);
  else if (itemRows.length) pass("balance_product_observation", "Balance provider observation", "Every connected Item has a current observed Balance state.", observedBalances, itemRows.length);

  const txWithBadEvidence = txRows.filter((r: any) => r.is_active && !["observed", "calculated"].includes(r.classification_evidence ?? ""));
  txWithBadEvidence.length ? warn("transaction_semantics_evidence", "Transaction semantic evidence", `${txWithBadEvidence.length} active transactions do not have observed/calculated classification evidence.`, txWithBadEvidence.length, 0) : pass("transaction_semantics_evidence", "Transaction semantic evidence", "Active transactions have evidence-backed classification states.", 0, 0);

  const hasProviderCursorEvidence = currentRuns.filter((r: any) => ["completed", "validated"].includes(r.state)).every((r: any) => r.cursor !== null || Number(r.pages_processed ?? 0) === 0);
  if (currentRuns.length && hasProviderCursorEvidence) pass("pagination_checkpoint", "Provider pagination checkpoint", "Completed sync runs retain their final cursor/checkpoint state.", true, true);
  else if (currentRuns.length) warn("pagination_checkpoint", "Provider pagination checkpoint", "At least one completed run does not expose a final cursor checkpoint; completeness is therefore bounded to the recorded sync state.", false, true);

  const status: FidelitySeverity = checks.some(c => c.severity === "fail") ? "fail" : checks.some(c => c.severity === "warn") ? "warn" : "pass";
  const ready = status !== "fail" && itemRows.length > 0 && txRows.length > 0 && observedTransactions >= itemRows.length && observedBalances >= itemRows.length;
  const limitations = checks.filter(c => c.severity !== "pass").map(c => c.detail);
  return {
    gate_version: "IRIS_SOURCE_FIDELITY_V1",
    status,
    ready_for_higher_order_intelligence: ready,
    checks,
    limitations,
    counts: {
      items: itemRows.length,
      accounts: accountRows.length,
      canonical_transactions: txRows.length,
      raw_transaction_observations: rawTxRows.length,
      raw_balance_observations: rawBalanceRows.length,
      raw_liability_observations: rawLiabilityRows.length,
      sync_runs_inspected: runRows.length,
      current_product_observations: productRows.length,
    },
    reconciliation: {
      canonical_active_transactions: txRows.filter((r: any) => r.is_active).length,
      raw_current_transactions: rawTxRows.filter((r: any) => r.is_current).length,
      added: currentRuns.reduce((n: number, r: any) => n + Number(r.added_count ?? 0), 0),
      modified: currentRuns.reduce((n: number, r: any) => n + Number(r.modified_count ?? 0), 0),
      removed: currentRuns.reduce((n: number, r: any) => n + Number(r.removed_count ?? 0), 0),
    },
    generated_at: new Date().toISOString(),
    principle: "Plaid observations remain source-of-truth provider evidence; Iris may interpret them only within the certified evidence boundary.",
  };
}
