import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { getFeatureFlags } from "./features.js";

/**
 * Round-Up Intelligence Engine — SIMULATION ONLY (Phase 1).
 *
 * No money moves. The calculation is derived only from persisted transaction
 * classification evidence and real provider balance observations.
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

  // Round-Ups are derived from canonical economic classification, never from
  // amount sign alone. Only active, posted purchases with sufficient evidence
  // can create an opportunity; refunds, transfers, debt payments and fees are
  // therefore excluded by construction. The $800 rent-sized guard remains a
  // deterministic safety rule even if a provider classifies an item as a purchase.
  const { data: txRows, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("amount, pending, transaction_class, classification_evidence")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .eq("transaction_class", "purchase")
    .in("classification_evidence", ["observed", "calculated"]);
  if (txErr) throw txErr;

  const lifetimeRoundupTotal = (txRows ?? []).reduce((sum, tx) => {
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 800) return sum;
    return sum + (Math.ceil(amount) - amount);
  }, 0);

  const { data: sweptEvents, error: sweepErr } = await supabaseAdmin
    .from("roundup_sweep_events")
    .select("amount")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("event_type", "simulated_sweep");
  if (sweepErr) throw sweepErr;

  const alreadySwept = (sweptEvents ?? []).reduce((sum, event) => {
    const amount = Number(event.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  let unswept = Math.max(0, lifetimeRoundupTotal - alreadySwept);

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

    const { error: eventError } = await supabaseAdmin.from("roundup_sweep_events").insert({
      user_id: userId,
      account_id: accountId,
      event_type: canSweep ? "simulated_sweep" : "held_insufficient_balance",
      amount: env.roundupSweepThreshold,
      available_balance_at_check: availableBalance,
      safety_threshold: safetyThreshold,
    });
    if (eventError) throw eventError;

    if (!canSweep) break;

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
        calculation_basis: "canonical_purchase_classification_v1",
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
