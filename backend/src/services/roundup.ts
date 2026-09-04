import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { getFeatureFlags } from "./features.js";

const ROUNDUP_CALCULATION_VERSION = "ROUNDUP_STANDARD_V2";

/**
 * Round-Up Intelligence Engine — SIMULATION ONLY (Phase 1).
 *
 * No money moves. Every contribution is tied to a canonical transaction and
 * every simulated sweep is atomically allocated back to those contributions.
 */
export async function recomputeRoundupsForAccount(
  userId: string,
  accountId: string,
  accessToken: string
) {
  const { data: accountFlags, error: accountFlagsError } = await supabaseAdmin
    .from("plaid_accounts")
    .select("roundup_enabled")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();
  if (accountFlagsError) throw accountFlagsError;
  if (accountFlags?.roundup_enabled === false) return;

  const flags = await getFeatureFlags(userId);
  if (!flags.roundup) return;

  const { data: txRows, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("id, plaid_transaction_id, raw_transaction_id, amount, transaction_class, classification_evidence, classification_version")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .eq("transaction_class", "purchase")
    .in("classification_evidence", ["observed", "calculated"]);
  if (txErr) throw txErr;

  for (const tx of txRows ?? []) {
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 800) continue;
    const roundup = Math.ceil(amount) - amount;
    if (roundup <= 0) continue;

    const { error: contributionError } = await supabaseAdmin.rpc(
      "record_roundup_contribution",
      {
        p_user_id: userId,
        p_account_id: accountId,
        p_transaction_id: tx.id,
        p_provider_transaction_id: tx.plaid_transaction_id,
        p_calculation_version: ROUNDUP_CALCULATION_VERSION,
        p_classification_version: tx.classification_version,
        p_eligibility_evidence: tx.classification_evidence,
        p_amount: roundup,
        p_source_observation_id: tx.raw_transaction_id,
      }
    );
    if (contributionError) throw contributionError;
  }

  const { data: contributionRows, error: contributionQueryError } = await supabaseAdmin
    .from("roundup_contributions")
    .select("amount")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .eq("calculation_version", ROUNDUP_CALCULATION_VERSION);
  if (contributionQueryError) throw contributionQueryError;

  const lifetimeRoundupTotal = (contributionRows ?? []).reduce((sum, row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);

  const { data: allocatedRows, error: allocationQueryError } = await supabaseAdmin
    .from("roundup_sweep_allocations")
    .select("amount")
    .eq("account_id", accountId)
    .eq("user_id", userId);
  if (allocationQueryError) throw allocationQueryError;

  const alreadyAllocated = (allocatedRows ?? []).reduce((sum, row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  let unswept = Math.max(0, lifetimeRoundupTotal - alreadyAllocated);

  const { data: accountRow, error: accountErr } = await supabaseAdmin
    .from("plaid_accounts")
    .select("plaid_account_id, type")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();
  if (accountErr) throw accountErr;

  let availableBalance: number | null = null;
  let safetyThreshold: number | null = null;
  if (accountRow.type === "depository") {
    const balanceResp = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
      options: { account_ids: [accountRow.plaid_account_id] },
    });
    const liveAccount = balanceResp.data.accounts[0];
    availableBalance = liveAccount?.balances?.available ?? null;
    safetyThreshold = env.roundupSweepThreshold + env.roundupSafetyBuffer;
  }

  while (unswept >= env.roundupSweepThreshold) {
    const canSweep = accountRow.type === "depository"
      ? availableBalance !== null && availableBalance >= safetyThreshold!
      : true;

    if (!canSweep) {
      const { error: heldError } = await supabaseAdmin.from("roundup_sweep_events").insert({
        user_id: userId,
        account_id: accountId,
        event_type: "held_insufficient_balance",
        amount: env.roundupSweepThreshold,
        available_balance_at_check: availableBalance,
        safety_threshold: safetyThreshold,
      });
      if (heldError) throw heldError;
      break;
    }

    const { error: sweepError } = await supabaseAdmin.rpc("record_roundup_sweep", {
      p_user_id: userId,
      p_account_id: accountId,
      p_amount: env.roundupSweepThreshold,
      p_available_balance: availableBalance,
      p_safety_threshold: safetyThreshold,
    });
    if (sweepError) throw sweepError;

    unswept -= env.roundupSweepThreshold;

    const { data: existingIbag, error: ibagError } = await supabaseAdmin
      .from("virtual_ibag_balance")
      .select("projected_balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (ibagError) throw ibagError;

    const newBalance = (existingIbag?.projected_balance ?? 0) + env.roundupSweepThreshold;
    const { error: balanceError } = await supabaseAdmin.from("virtual_ibag_balance").upsert({
      user_id: userId,
      projected_balance: newBalance,
      updated_at: new Date().toISOString(),
    });
    if (balanceError) throw balanceError;

    const { error: auditError } = await supabaseAdmin.from("calculation_audit_log").insert({
      user_id: userId,
      metric_key: "virtual_ibag_balance",
      inputs: {
        account_id: accountId,
        sweep_amount: env.roundupSweepThreshold,
        available_balance_at_check: availableBalance,
        safety_threshold: safetyThreshold,
        calculation_basis: ROUNDUP_CALCULATION_VERSION,
      },
      result: newBalance,
    });
    if (auditError) throw auditError;
  }

  const { error: ledgerError } = await supabaseAdmin.from("card_roundup_ledger").upsert(
    {
      user_id: userId,
      account_id: accountId,
      accrued_unswept: unswept,
      lifetime_roundup_total: lifetimeRoundupTotal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
  if (ledgerError) throw ledgerError;
}

/**
 * Preview/what-if calculator for "transfer back to a card" — Phase 1 only
 * computes the resulting numbers, never executes anything.
 */
export async function previewTransferBackToCard(
  userId: string,
  accountId: string,
  amount: number,
  accessToken: string,
  plaidAccountId: string
) {
  const { data: ibag } = await supabaseAdmin
    .from("virtual_ibag_balance")
    .select("projected_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const currentIbagBalance = ibag?.projected_balance ?? 0;
  if (amount > currentIbagBalance) {
    return { error: "Amount exceeds projected ibag balance", currentIbagBalance };
  }

  const balanceResp = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
    options: { account_ids: [plaidAccountId] },
  });

  const liveAccount = balanceResp.data.accounts[0];
  const currentAvailable = liveAccount?.balances?.available ?? null;
  const projectedAvailable = currentAvailable !== null ? currentAvailable + amount : null;

  return {
    currentIbagBalance,
    projectedIbagBalanceAfterTransfer: currentIbagBalance - amount,
    currentAvailableBalance: currentAvailable,
    projectedAvailableBalanceAfterTransfer: projectedAvailable,
    note: "This is a preview only. No funds have moved.",
  };
}
