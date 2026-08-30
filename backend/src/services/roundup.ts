import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";
import { env } from "../config/env.js";

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

  // 3. While there's enough accrued to cross the threshold, attempt a
  //    simulated sweep — checking real Balance data each time, since
  //    balance can change between sweeps within the same sync.
  while (unswept >= env.roundupSweepThreshold) {
    const { data: accountRow, error: accountErr } = await supabaseAdmin
      .from("plaid_accounts")
      .select("plaid_account_id")
      .eq("id", accountId)
      .single();
    if (accountErr) throw accountErr;

    const balanceResp = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
      options: { account_ids: [accountRow.plaid_account_id] },
    });

    const liveAccount = balanceResp.data.accounts[0];
    const availableBalance = liveAccount?.balances?.available ?? null;
    const safetyThreshold = env.roundupSweepThreshold + env.roundupSafetyBuffer;

    const canSweep = availableBalance !== null && availableBalance >= safetyThreshold;

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
