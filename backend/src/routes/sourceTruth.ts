import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const sourceTruthRouter = Router();

/**
 * Authenticated, read-only projection of the canonical financial evidence store.
 * Secrets (including Plaid access tokens) are intentionally never selected.
 * Provider observations remain distinguishable from canonical/calculated data.
 */
sourceTruthRouter.get("/dashboard/source", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 200) || 200, 1), 500);

  const [items, accounts, transactions, rawTransactions, rawBalances, rawLiabilities, productObservations, syncRuns, roundupContributions, recurring, liabilities, audit] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, plaid_item_id, institution_id, institution_name, status, last_webhook_code, last_synced_at, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, roundup_enabled, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabaseAdmin.from("transactions").select("id, account_id, raw_transaction_id, plaid_transaction_id, amount, iso_currency_code, merchant_name, plaid_category_primary, plaid_category_detailed, posted_date, pending, merchant_id, subdomain_id, transaction_class, classification_evidence, classification_version, classified_at, is_active, retired_at, retirement_reason, created_at").eq("user_id", userId).order("posted_date", { ascending: false }).limit(limit),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, raw_response, fetched_at, observation_hash, observation_version, supersedes_id, is_current, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance").eq("user_id", userId).order("fetched_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance, observation_version").eq("user_id", userId).order("fetched_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance, observation_version").eq("user_id", userId).order("fetched_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("plaid_product_observations").select("id, item_id, provider, product, lifecycle_state, billed, available, authorized, observed_at, provenance, provider_object_id, effective_at, acquired_at, evidence_state, observation_version, supersedes_id, is_current, observation_hash, requested, provider_added").eq("user_id", userId).order("observed_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("sync_runs").select("id, item_id, state, idempotency_key, cursor, pages_processed, added_count, modified_count, removed_count, error_code, error_message, requested_at, started_at, last_checkpoint_at, completed_at").eq("user_id", userId).order("requested_at", { ascending: false }).limit(100),
    supabaseAdmin.from("roundup_contributions").select("id, account_id, transaction_id, provider_transaction_id, calculation_version, classification_version, eligibility_state, eligibility_evidence, amount, calculated_at, source_observation_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("recurring_series").select("id, merchant_id, typical_amount, interval_days, last_seen_date, next_expected_date, occurrence_count, is_essential, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("liability_details").select("id, account_id, liability_type, apr_percentage, apr_type, is_overdue, last_statement_balance, last_payment_amount, last_payment_date, minimum_payment_amount, next_payment_due_date, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("calculation_audit_log").select("id, metric_key, inputs, result, computed_at").eq("user_id", userId).order("computed_at", { ascending: false }).limit(100),
  ]);

  const failures = [items, accounts, transactions, rawTransactions, rawBalances, rawLiabilities, productObservations, syncRuns, roundupContributions, recurring, liabilities, audit].filter((q) => q.error).map((q) => q.error?.message);
  if (failures.length) return res.status(500).json({ error: "Unable to assemble the source-of-truth view", details: failures });

  const sourceRows = [
    ...(rawTransactions.data ?? []).map((r: any) => ({ type: "transaction_observation", id: r.id, provider: r.provider, evidence_state: r.evidence_state, observed_at: r.effective_at ?? r.fetched_at, acquired_at: r.acquired_at, object_id: r.provider_object_id ?? r.plaid_transaction_id, canonical_id: (transactions.data ?? []).find((t: any) => t.raw_transaction_id === r.id)?.id ?? null })),
    ...(rawBalances.data ?? []).map((r: any) => ({ type: "balance_observation", id: r.id, provider: r.provider, evidence_state: r.evidence_state, observed_at: r.effective_at ?? r.fetched_at, acquired_at: r.acquired_at, object_id: r.provider_object_id, canonical_id: r.account_id })),
    ...(rawLiabilities.data ?? []).map((r: any) => ({ type: "liability_observation", id: r.id, provider: r.provider, evidence_state: r.evidence_state, observed_at: r.effective_at ?? r.fetched_at, acquired_at: r.acquired_at, object_id: r.provider_object_id, canonical_id: r.account_id })),
  ];

  res.json({
    source: "canonical_user_financial_evidence_store",
    read_only: true,
    provider: "plaid",
    generated_at: new Date().toISOString(),
    limits: { requested: limit, transactions: transactions.data?.length ?? 0, raw_transactions: rawTransactions.data?.length ?? 0 },
    counts: {
      items: items.data?.length ?? 0,
      accounts: accounts.data?.length ?? 0,
      transactions: transactions.data?.length ?? 0,
      transaction_observations: rawTransactions.data?.length ?? 0,
      balance_observations: rawBalances.data?.length ?? 0,
      liability_observations: rawLiabilities.data?.length ?? 0,
      product_observations: productObservations.data?.length ?? 0,
      sync_runs: syncRuns.data?.length ?? 0,
      roundup_contributions: roundupContributions.data?.length ?? 0,
      recurring_series: recurring.data?.length ?? 0,
      liabilities: liabilities.data?.length ?? 0,
      calculations: audit.data?.length ?? 0,
    },
    items: items.data ?? [],
    accounts: accounts.data ?? [],
    transactions: transactions.data ?? [],
    observations: { transactions: rawTransactions.data ?? [], balances: rawBalances.data ?? [], liabilities: rawLiabilities.data ?? [] },
    product_observations: productObservations.data ?? [],
    sync_runs: syncRuns.data ?? [],
    roundup_contributions: roundupContributions.data ?? [],
    recurring_series: recurring.data ?? [],
    liabilities: liabilities.data ?? [],
    calculation_audit: audit.data ?? [],
    lineage: sourceRows,
    evidence_legend: {
      observed: "Directly observed provider/source information.",
      calculated: "Derived deterministically from observed inputs.",
      inferred: "Interpretation or inference; not a provider fact.",
      limited: "Some evidence exists but is incomplete or bounded.",
      insufficient_evidence: "The available evidence is not sufficient for a reliable conclusion.",
      retired: "Historical observation no longer treated as current.",
    },
  });
});
