import { supabaseAdmin } from "../config/supabase.js";

export type FidelitySeverity = "pass" | "warn" | "fail";
export type FidelityCheck = { id: string; severity: FidelitySeverity; title: string; detail: string; observed: number | string | boolean | null; expected: number | string | boolean | null };

const CANONICAL_PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
const OBSERVED_LIFECYCLES = new Set(["observed", "validated", "fresh"]);
const OBSERVED_EVIDENCE = new Set(["observed", "calculated"]);

/** Hard evidence gate between provider ingestion and Iris reasoning. Readiness is scoped to one complete same-Item evidence set. */
export async function assessSourceFidelity(userId: string) {
  const [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products, rawProducts] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, status, last_synced_at", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id, account_id, plaid_transaction_id, raw_transaction_id, is_active, classification_evidence", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, provider_object_id, is_current, evidence_state", { count: "exact" }).eq("user_id", userId),
    supabaseAdmin.from("sync_runs").select("id, item_id, state, cursor, pages_processed, added_count, modified_count, removed_count, completed_at, error_message").eq("user_id", userId).order("requested_at", { ascending: false }).limit(100),
    supabaseAdmin.from("plaid_product_observations").select("item_id, product, lifecycle_state, evidence_state, is_current, provider", { count: "exact" }).eq("user_id", userId).eq("provider", "plaid").eq("is_current", true),
    supabaseAdmin.from("plaid_raw_product_observations").select("id, item_id, product, is_current, evidence_state", { count: "exact" }).eq("user_id", userId).eq("is_current", true),
  ]);

  const queryErrors = [items, accounts, tx, rawTx, rawBalances, rawLiabilities, runs, products, rawProducts].filter(q => q.error).map(q => q.error!.message);
  if (queryErrors.length) return {
    gate_version: "IRIS_SOURCE_FIDELITY_V3", status: "fail" as FidelitySeverity, ready_for_higher_order_intelligence: false,
    checks: [{ id: "query_integrity", severity: "fail" as FidelitySeverity, title: "Evidence store readable", detail: queryErrors.join("; "), observed: null, expected: true }],
    limitations: ["The evidence store could not be completely inspected."], counts: {}, generated_at: new Date().toISOString()
  };

  const itemRows: any[] = items.data ?? [], accountRows: any[] = accounts.data ?? [], txRows: any[] = tx.data ?? [], rawTxRows: any[] = rawTx.data ?? [], rawBalanceRows: any[] = rawBalances.data ?? [], rawLiabilityRows: any[] = rawLiabilities.data ?? [], runRows: any[] = runs.data ?? [], productRows: any[] = products.data ?? [], rawProductRows: any[] = rawProducts.data ?? [];
  const checks: FidelityCheck[] = [];
  const pass = (id: string, title: string, detail: string, observed: any, expected: any) => checks.push({ id, severity: "pass", title, detail, observed, expected });
  const warn = (id: string, title: string, detail: string, observed: any, expected: any) => checks.push({ id, severity: "warn", title, detail, observed, expected });
  const fail = (id: string, title: string, detail: string, observed: any, expected: any) => checks.push({ id, severity: "fail", title, detail, observed, expected });

  const itemIds = new Set(itemRows.map(r => r.id));
  const accountIds = new Set(accountRows.map(r => r.id));
  const accountById = new Map(accountRows.map(r => [r.id, r]));
  const accountsForItem = (itemId: string) => accountRows.filter(a => a.item_id === itemId);
  const itemHasCurrentTx = (itemId: string) => rawTxRows.some(r => r.is_current && OBSERVED_EVIDENCE.has(r.evidence_state ?? "") && accountById.get(r.account_id)?.item_id === itemId);
  const itemHasCurrentBalance = (itemId: string) => rawBalanceRows.some(r => r.is_current && OBSERVED_EVIDENCE.has(r.evidence_state ?? "") && accountById.get(r.account_id)?.item_id === itemId);
  const itemHasCurrentLiability = (itemId: string) => rawLiabilityRows.some(r => r.is_current && OBSERVED_EVIDENCE.has(r.evidence_state ?? "") && accountById.get(r.account_id)?.item_id === itemId);

  const providerKeys = new Set<string>(), duplicateProviderKeys = new Set<string>();
  for (const a of accountRows) { const key = `${a.item_id}:${a.plaid_account_id}`; if (providerKeys.has(key)) duplicateProviderKeys.add(key); providerKeys.add(key); }
  const orphanAccounts = accountRows.filter(a => !itemIds.has(a.item_id));
  orphanAccounts.length ? fail("account_item_lineage", "Account → Item lineage", `${orphanAccounts.length} account(s) reference an unknown Item.`, orphanAccounts.length, 0) : pass("account_item_lineage", "Account → Item lineage", "Every account belongs to a user-owned Plaid Item.", 0, 0);
  duplicateProviderKeys.size ? fail("account_provider_identity", "Provider account identity", `${duplicateProviderKeys.size} duplicate provider account identity value(s) exist within an Item.`, duplicateProviderKeys.size, 0) : pass("account_provider_identity", "Provider account identity", "Provider account identities are unique within each Item.", 0, 0);

  const rawProviderIds = new Set(rawTxRows.map(r => r.plaid_transaction_id));
  const canonicalProviderIds = new Set(txRows.map(r => r.plaid_transaction_id));
  const orphanCanonical = txRows.filter(r => r.is_active && !rawProviderIds.has(r.plaid_transaction_id));
  const orphanRaw = rawTxRows.filter(r => r.is_current && !canonicalProviderIds.has(r.plaid_transaction_id));
  orphanCanonical.length ? fail("transaction_raw_lineage", "Transaction → raw observation lineage", `${orphanCanonical.length} active canonical transaction(s) have no matching raw observation.`, orphanCanonical.length, 0) : pass("transaction_raw_lineage", "Transaction → raw observation lineage", "Active canonical transactions resolve to raw provider observations.", 0, 0);
  orphanRaw.length ? warn("raw_canonical_reconciliation", "Raw → canonical reconciliation", `${orphanRaw.length} current raw transaction observation(s) have no active canonical transaction.`, orphanRaw.length, 0) : pass("raw_canonical_reconciliation", "Raw → canonical reconciliation", "Current raw transaction identities reconcile to canonical transactions.", 0, 0);
  const orphanTransactions = txRows.filter(r => r.is_active && !accountIds.has(r.account_id));
  orphanTransactions.length ? fail("transaction_account_lineage", "Transaction → Account lineage", `${orphanTransactions.length} active canonical transaction(s) reference an unknown account.`, orphanTransactions.length, 0) : pass("transaction_account_lineage", "Transaction → Account lineage", "Canonical transactions resolve to user-owned accounts.", 0, 0);

  const latestRunByItem = new Map<string, any>();
  for (const run of runRows) if (!latestRunByItem.has(run.item_id)) latestRunByItem.set(run.item_id, run);
  const completeItems = itemRows.filter(item => {
    const observed = new Set(productRows.filter(r => r.item_id === item.id && OBSERVED_LIFECYCLES.has(r.lifecycle_state) && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")).map(r => r.product));
    const raw = new Set(rawProductRows.filter(r => r.item_id === item.id && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")).map(r => r.product));
    const rawFor = (p: string) => p === "transactions" ? itemHasCurrentTx(item.id) : p === "balance" ? itemHasCurrentBalance(item.id) : p === "liabilities" ? itemHasCurrentLiability(item.id) : raw.has(p);
    const run = latestRunByItem.get(item.id);
    return item.status === "active" && !!run && ["completed", "validated"].includes(run.state) && CANONICAL_PRODUCTS.every(p => observed.has(p) && rawFor(p));
  });

  const eightDomainReady = completeItems.length > 0;
  eightDomainReady
    ? pass("canonical_eight_domain_certification", "Eight-domain provider certification", `${completeItems.length} active Item(s) contain all eight canonical Plaid domains with current observed state, raw evidence, and a completed/validated sync on the same Item.`, completeItems.length, ">=1")
    : fail("canonical_eight_domain_certification", "Eight-domain provider certification", "No active Item currently has all eight canonical Plaid domains with current observed state, raw evidence, and a completed/validated sync on that same Item.", 0, ">=1");

  const missingTransactions = itemRows.filter(i => !productRows.some(r => r.item_id === i.id && r.product === "transactions" && OBSERVED_LIFECYCLES.has(r.lifecycle_state) && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")));
  const missingBalances = itemRows.filter(i => !productRows.some(r => r.item_id === i.id && r.product === "balance" && OBSERVED_LIFECYCLES.has(r.lifecycle_state) && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")));
  missingTransactions.length ? warn("transactions_product_observation", "Transactions provider observation", `${missingTransactions.length} connected Item(s) lack a current observed Transactions state; unrelated Items do not block another certified Item.`, missingTransactions.length, 0) : pass("transactions_product_observation", "Transactions provider observation", "Every connected Item has a current observed Transactions state.", itemRows.length, itemRows.length);
  missingBalances.length ? warn("balance_product_observation", "Balance provider observation", `${missingBalances.length} connected Item(s) lack a current observed Balance state; unrelated Items do not block another certified Item.`, missingBalances.length, 0) : pass("balance_product_observation", "Balance provider observation", "Every connected Item has a current observed Balance state.", itemRows.length, itemRows.length);

  const txWithBadEvidence = txRows.filter(r => r.is_active && !OBSERVED_EVIDENCE.has(r.classification_evidence ?? ""));
  txWithBadEvidence.length ? warn("transaction_semantics_evidence", "Transaction semantic evidence", `${txWithBadEvidence.length} active transactions do not have observed/calculated classification evidence.`, txWithBadEvidence.length, 0) : pass("transaction_semantics_evidence", "Transaction semantic evidence", "Active transactions have evidence-backed classification states.", 0, 0);
  const completedRuns = runRows.filter(r => itemIds.has(r.item_id) && ["completed", "validated"].includes(r.state));
  completedRuns.length ? pass("pagination_checkpoint", "Provider pagination checkpoint", "Completed sync runs retain checkpoint state.", completedRuns.length, completedRuns.length) : warn("pagination_checkpoint", "Provider pagination checkpoint", "No completed/validated sync run is available for the user's Items.", 0, ">=1");

  // Warnings on unrelated Items must not invalidate a certified same-Item evidence boundary.
  const status: FidelitySeverity = checks.some(c => c.severity === "fail" && c.id !== "canonical_eight_domain_certification") ? "fail" : checks.some(c => c.severity === "warn") ? "warn" : "pass";
  const certifiedItemReady = completeItems.some(item => itemHasCurrentTx(item.id) && itemHasCurrentBalance(item.id));
  const hardIntegrityFailure = checks.some(c => c.severity === "fail" && c.id !== "canonical_eight_domain_certification");
  const ready = !hardIntegrityFailure && certifiedItemReady && eightDomainReady;
  return {
    gate_version: "IRIS_SOURCE_FIDELITY_V3", status, ready_for_higher_order_intelligence: ready, checks,
    limitations: checks.filter(c => c.severity !== "pass").map(c => c.detail),
    counts: { items: itemRows.length, accounts: accountRows.length, canonical_transactions: txRows.length, raw_transaction_observations: rawTxRows.length, raw_balance_observations: rawBalanceRows.length, raw_liability_observations: rawLiabilityRows.length, sync_runs_inspected: runRows.length, current_product_observations: productRows.length, current_raw_product_observations: rawProductRows.length, eight_domain_ready_items: completeItems.length },
    reconciliation: { canonical_active_transactions: txRows.filter(r => r.is_active).length, raw_current_transactions: rawTxRows.filter(r => r.is_current).length, added: runRows.reduce((n, r) => n + Number(r.added_count ?? 0), 0), modified: runRows.reduce((n, r) => n + Number(r.modified_count ?? 0), 0), removed: runRows.reduce((n, r) => n + Number(r.removed_count ?? 0), 0) },
    eight_domain_items: completeItems.map(i => i.id),
    missing_by_item: itemRows.map(item => {
      const observed = new Set(productRows.filter(r => r.item_id === item.id && OBSERVED_LIFECYCLES.has(r.lifecycle_state) && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")).map(r => r.product));
      const raw = new Set(rawProductRows.filter(r => r.item_id === item.id && OBSERVED_EVIDENCE.has(r.evidence_state ?? "")).map(r => r.product));
      return { item: item.id, missing_observed: CANONICAL_PRODUCTS.filter(p => !observed.has(p)), missing_raw: CANONICAL_PRODUCTS.filter(p => !(p === "transactions" ? itemHasCurrentTx(item.id) : p === "balance" ? itemHasCurrentBalance(item.id) : p === "liabilities" ? itemHasCurrentLiability(item.id) : raw.has(p))) };
    }),
    generated_at: new Date().toISOString(), principle: "Plaid observations remain source-of-truth provider evidence; Iris may interpret them only within the certified same-Item evidence boundary."
  };
}
