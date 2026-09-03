import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";
import { getFeatureFlags } from "./features.js";

/**
 * Round-Up Intelligence Engine — SIMULATION ONLY (Phase 1).
 *
 * Nothing here moves money. Every "sweep" is a logged event and a virtual
 * ledger update. This function is written so that swapping the logging
 * calls for real ACH-pull calls (Phase 2, once a BaaS/bank partner is in
 * place) is the only change required — the math and the overdraft-safety
 * check are already correct against real data.
 */
export async function recomputeRoundupsForAccount(
  userId: string,
  accountId: string,
  accessToken: string
) {
  // Respect both the per-card toggle (a user may want round-up on a debit
  // card but not a credit card) and the global "roundup" feature flag.
  // Checked here rather than at the caller so every entry point (sync,
  // resync, webhook-triggered sync) gets the same behavior for free.
  const { data: accountFlags } = await supabaseAdmin
    .from("plaid_accounts")
    .select("roundup_enabled")
    .eq("id", accountId)
    .single();

  if (accountFlags && accountFlags.roundup_enabled === false) {
    return; // explicitly disabled for this card — skip silently, not an error
  }

  const flags = await getFeatureFlags(userId);
  if (!flags.roundup) {
    return; // round-up disabled account-wide
  }

  // 1. Sum round-ups over every POSTED (non-pending) transaction on this
  //    account. Round-up is only computed on money actually spent —
  //    ceil(amount) - amount, and only for positive (outflow) amounts.
  const { data: txRows, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("amount, pending")
    .eq("account_id", accountId)
    .eq("pending", false);

  if (txErr) throw txErr;

  const lifetimeRoundupTotal = (txRows ?? []).reduce((sum, tx) => {
    const amount = Number(tx.amount);
    if (amount <= 0) return sum; // ignore refunds/credits
    const roundUp = Math.ceil(amount) - amount;
    return sum + roundUp;
  }, 0);

  // 2. How much of that lifetime total has already been swept into the ibag,
  //    per this account's sweep event history.
  const { data: sweptEvents, error: sweepErr } = await supabaseAdmin
    .from("roundup_sweep_events")
    .select("amount")
    .eq("account_id", accountId)
    .eq("event_type", "simulated_sweep");

  if (sweepErr) throw sweepErr;

  const alreadySwept = (sweptEvents ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  let unswept = lifetimeRoundupTotal - alreadySwept;

  const { data: accountRow, error: accountErr } = await supabaseAdmin
    .from("plaid_accounts")
    .select("plaid_account_id, type")
    .eq("id", accountId)
    .single();
  if (accountErr) throw accountErr;

  // Fetched once per sync, not once per $2 threshold crossed. In Phase 1
  // nothing actually moves money, so the live balance cannot change
  // between iterations of this loop within a single sync call — repeating
  // the API/DB call per iteration was pure waste, and would become a real
  // rate-limit risk once a real backlog exists.
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

  // While there's enough accrued to cross the threshold, attempt a
  // simulated sweep using the balance snapshot taken above.
  while (unswept >= env.roundupSweepThreshold) {
    let canSweep: boolean;

    if (accountRow.type === "depository") {
      // Only depository accounts have a real "available cash" concept, so
      // only these get the overdraft-safety check — sweeping $2 from a
      // checking account with $1 available would be a real overdraft risk
      // once this becomes live money movement in Phase 2.
      canSweep = availableBalance !== null && availableBalance >= safetyThreshold!;
    } else {
      // Credit, loan, and investment accounts have no "available cash" to
      // overdraw — a credit-card round-up isn't a withdrawal from the
      // card, it's spend-based accrual that would eventually be funded
      // through however that card's bill gets paid. No safety check applies.
      canSweep = true;
    }

    await supabaseAdmin.from("roundup_sweep_events").insert({
      user_id: userId,
      account_id: accountId,
      event_type: canSweep ? "simulated_sweep" : "held_insufficient_balance",
      amount: env.roundupSweepThreshold,
      available_balance_at_check: availableBalance,
      safety_threshold: safetyThreshold,
    });

    if (!canSweep) {
      // Held — stop trying this account until the next sync brings fresh balance data.
      break;
    }

    unswept -= env.roundupSweepThreshold;

    // Update the aggregate virtual ibag balance (one row per user, across all cards).
    const { data: existingIbag } = await supabaseAdmin
      .from("virtual_ibag_balance")
      .select("projected_balance")
      .eq("user_id", userId)
      .maybeSingle();

    const newBalance = (existingIbag?.projected_balance ?? 0) + env.roundupSweepThreshold;

    await supabaseAdmin.from("virtual_ibag_balance").upsert({
      user_id: userId,
      projected_balance: newBalance,
      updated_at: new Date().toISOString(),
    });

    await supabaseAdmin.from("calculation_audit_log").insert({
      user_id: userId,
      metric_key: "virtual_ibag_balance",
      inputs: {
        account_id: accountId,
        sweep_amount: env.roundupSweepThreshold,
        available_balance_at_check: availableBalance,
        safety_threshold: safetyThreshold,
      },
      result: newBalance,
    });
  }

  // 4. Persist the current per-card accrual state (what hasn't crossed $2 yet).
  await supabaseAdmin.from("card_roundup_ledger").upsert(
    {
      user_id: userId,
      account_id: accountId,
      accrued_unswept: unswept,
      lifetime_roundup_total: lifetimeRoundupTotal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" }
  );
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
