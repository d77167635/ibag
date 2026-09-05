import { supabaseAdmin } from "../config/supabase.js";

export type FidelitySeverity = "pass" | "warn" | "fail";
export type FidelityCheck = { id: string; severity: FidelitySeverity; title: string; detail: string; observed: number | string | boolean | null; expected: number | string | boolean | null };

/** Hard evidence gate between provider ingestion and Iris reasoning. */
export async function assessSourceFidelity(userId: string) {
  const [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, status, last_synced_at", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id, account_id, plaid_transaction_id, raw_transaction_id, is_active, classification_evidence", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("sync_runs").select("id, item_id, state, cursor, pages_processed, added_count, modified_count, removed_count, completed_at, error_message").eq("user_id", userId).order("requested_at", { ascending: false }).limit(100),
    supabaseAdmin.from("plaid_product_observations").select("item_id, product, lifecycle_state, is_current").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true),
  ]);
  const queryErrors = [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products].filter(q => q.error).map(q => q.error!.message);
  if (queryErrors.length) return { gate_version: "IRIS_SOURCE_FIDELITY_V1", status: "fail" as FidelitySeverity, ready_for_higher_order_intelligence: false, checks: [{ id: "query_integrity", severity: "fail" as FidelitySeverity, title: "Evidence store readable", detail: queryErrors.join("; "), observed: null, expected: true }], limitations: ["The evidence store could not be completely inspected."], counts: {}, generated_at: new Date().toISOString() };

  const itemRows = items.data ?? [], accountRows = accounts.data ?? [], txRows = tx.data ?? [], rawTxRows = rawTx.data ?? [], rawBalanceRows = rawBalances.data ?? [], rawLiabilityRows = rawLiabilities.data ?? [], runRows = runs.data ?? [], productRows = products.data ?? [];
  const checks: FidelityCheck[] = [];
  const fail = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "fail", title, detail, observed, expected });
  const pass = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "pass", title, detail, observed, expected });
  const warn = (id: string, title: string, detail: string, observed: number | string | boolean | null, expected: number | string | boolean | null) => checks.push({ id, severity: "warn", title, detail, observed, expected });

  const itemIds = new Set(itemRows.map((r: any) => r.id));
  const accountIds = new Set(accountRows.map((r: any) => r.id));
  const providerAccountKeys = new Set<string>(), duplicateProviderKeys = new Set<string>();
  for (const row of accountRows as any[]) { const key = `${row.item_id}:${row.plaid_account_id}`; if (providerAccountKeys.has(key)) duplicateProviderKeys.add(key); providerAccountKeys.add(key); }
  const orphanAccounts = accountRows.filter((r: any) => !itemIds.has(r.item_id));
  orphanAccounts.length ? fail("account_item_lineage", "Account → Item lineage", `${orphanAccounts.length} account(s) reference an item outside this user's observed Item set.`, orphanAccounts.length, 0) : pass("account_item_lineage", "Account → Item lineage", "Every account belongs to a user-owned Plaid Item.", 0, 0);
  duplicateProviderKeys.size ? fail("account_provider_identity", "Provider account identity", `${duplicateProviderKeys.size} duplicate provider account identity value(s) exist within an Item.`, duplicateProviderKeys.size, 0) : pass("account_provider_identity", "Provider account identity", "Provider account identities are unique within each Item.", 0, 0);

  const rawByProvider = new Set(rawTxRows.map((r: any) => r.plaid_transaction_id));
  const canonicalProviderIds = new Set(txRows.map((r: any) => r.plaid_transaction_id));
  const orphanCanonical = txRows.filter((r: any) => r.is_active && !rawByProvider.has(r.plaid_transaction_id));
  const orphanRaw = rawTxRows.filter((r: any) => r.is_current && !canonicalProviderIds.has(r.plaid_transaction_id));
  orphanCanonical.length ? fail("transaction_raw_lineage", "Transaction → raw observation lineage", `${orphanCanonical.length} active canonical transaction(s) have no matching Plaid raw observation.`, orphanCanonical.length, 0) : pass("transaction_raw_lineage", "Transaction → raw observation lineage", "Active canonical transactions resolve to raw provider observations.", 0, 0);
  orphanRaw.length ? warn("raw_canonical_reconciliation", "Raw → canonical reconciliation", `${orphanRaw.length} current raw transaction observation(s) have no active canonical transaction.`, orphanRaw.length, 0) : pass("raw_canonical_reconciliation", "Raw → canonical reconciliation", "Current raw transaction identities reconcile to canonical transactions.", 0, 0);

  const orphanTransactions = txRows.filter((r: any) => r.is_active && !accountIds.has(r.account_id));
  orphanTransactions.length ? fail("transaction_account_lineage", "Transaction → Account lineage", `${orphanTransactions.length} active canonical transaction(s) reference an account outside this user's account set.`, orphanTransactions.length, 0) : pass("transaction_account_lineage", "Transaction → Account lineage", "Canonical transactions resolve to user-owned accounts.", 0, 0);

  const currentRuns = runRows.filter((r: any) => itemIds.has(r.item_id));
  const incompleteRuns = currentRuns.filter((r: any) => !["completed", "validated"].includes(r.state));
  if (!itemRows.length) warn("provider_presence", "Provider source presence", "No Plaid Item is connected for this user, so Iris cannot certify financial evidence readiness.", 0, ">=1");
  else if (incompleteRuns.length) warn("sync_completion", "Sync completion", `${incompleteRuns.length} recent sync run(s) are not completed/validated.`, incompleteRuns.length, 0);
  else pass("sync_completion", "Sync completion", "Observed sync runs are completed or validated.", 0, 0);

  const latestRunByItem = new Map<string, any>();
  for (const run of currentRuns as any[]) if (!latestRunByItem.has(run.item_id)) latestRunByItem.set(run.item_id, run);
  const neverCompleted = itemRows.filter((item: any) => { const run = latestRunByItem.get(item.id); return !run || !["completed", "validated"].includes(run.state); });
  neverCompleted.length ? fail("item_sync_certification", "Item synchronization certification", `${neverCompleted.length} connected Item(s) have no completed/validated latest sync run.`, neverCompleted.length, 0) : pass("item_sync_certification", "Item synchronization certification", "Every connected Item has a completed/validated latest sync run.", 0, 0);

  // Certification is per Item, never an aggregate count. One Item cannot borrow
  // another Item's observed product state.
  const observedByItemProduct = new Set(productRows.filter((r: any) => ["observed", "validated", "fresh"].includes(r.lifecycle_state)).map((r: any) => `${r.item_id}:${r.product}`));
  const missingTransactions = itemRows.filter((i: any) => !observedByItemProduct.has(`${i.id}:transactions`));
  const missingBalances = itemRows.filter((i: any) => !observedByItemProduct.has(`${i.id}:balance`));
  missingTransactions.length ? fail("transactions_product_observation", "Transactions provider observation", `${missingTransactions.length} connected Item(s) lack a current observed Transactions state.`, missingTransactions.length, 0) : pass("transactions_product_observation", "Transactions provider observation", "Every connected Item has a current observed Transactions state.", itemRows.length, itemRows.length);
  missingBalances.length ? fail("balance_product_observation", "Balance provider observation", `${missingBalances.length} connected Item(s) lack a current observed Balance state.`, missingBalances.length, 0) : pass("balance_product_observation", "Balance provider observation", "Every connected Item has a current observed Balance state.", itemRows.length, itemRows.length);

  const txWithBadEvidence = txRows.filter((r: any) => r.is_active && !["observed", "calculated"].includes(r.classification_evidence ?? ""));
  txWithBadEvidence.length ? warn("transaction_semantics_evidence", "Transaction semantic evidence", `${txWithBadEvidence.length} active transactions do not have observed/calculated classification evidence.`, txWithBadEvidence.length, 0) : pass("transaction_semantics_evidence", "Transaction semantic evidence", "Active transactions have evidence-backed classification states.", 0, 0);

  const completedRuns = currentRuns.filter((r: any) => ["completed", "validated"].includes(r.state));
  if (completedRuns.length) pass("pagination_checkpoint", "Provider pagination checkpoint", "Completed sync runs retain checkpoint state.", completedRuns.length, completedRuns.length);

  const status: FidelitySeverity = checks.some(c => c.severity === "fail") ? "fail" : checks.some(c => c.severity === "warn") ? "warn" : "pass";
  const ready = status !== "fail" && itemRows.length > 0 && txRows.some((r: any) => r.is_active) && missingTransactions.length === 0 && missingBalances.length === 0;
  return {
    gate_version: "IRIS_SOURCE_FIDELITY_V1", status, ready_for_higher_order_intelligence: ready, checks,
    limitations: checks.filter(c => c.severity !== "pass").map(c => c.detail),
    counts: { items: itemRows.length, accounts: accountRows.length, canonical_transactions: txRows.length, raw_transaction_observations: rawTxRows.length, raw_balance_observations: rawBalanceRows.length, raw_liability_observations: rawLiabilityRows.length, sync_runs_inspected: runRows.length, current_product_observations: productRows.length },
    reconciliation: { canonical_active_transactions: txRows.filter((r: any) => r.is_active).length, raw_current_transactions: rawTxRows.filter((r: any) => r.is_current).length, added: currentRuns.reduce((n: number, r: any) => n + Number(r.added_count ?? 0), 0), modified: currentRuns.reduce((n: number, r: any) => n + Number(r.modified_count ?? 0), 0), removed: currentRuns.reduce((n: number, r: any) => n + Number(r.removed_count ?? 0), 0) },
    generated_at: new Date().toISOString(),
    principle: "Plaid observations remain source-of-truth provider evidence; Iris may interpret them only within the certified evidence boundary.",
  };
}
