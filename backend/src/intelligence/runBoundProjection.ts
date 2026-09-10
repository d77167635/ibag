import { supabaseAdmin } from "../config/supabase.js";
import { getCanonicalTransactions, isEconomicOutflow } from "./transactionSemantics.js";

/**
 * Forward projection whose entire input boundary is the current execution run.
 * No later recurring-series state, balance state, or transaction observation is
 * imported. Resource limits belong to the caller/certification contract; this
 * function deliberately has no semantic depth ceiling.
 */
export async function computeRunBoundForwardProjection(userId: string, runId: string, days = 30, asOf?: string | Date | null) {
  const boundary = asOf ? new Date(asOf) : new Date();
  if (!Number.isFinite(boundary.getTime())) throw new Error("INVALID_EVIDENCE_BOUNDARY");
  const horizonDays = Math.max(0, Math.floor(days));

  const { data: evidence, error: evidenceError } = await supabaseAdmin
    .from("iris_run_evidence")
    .select("id,raw_observation_id,evidence_type,acquired_at,effective_at,evidence_hash")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .eq("provider", "plaid")
    .lte("acquired_at", boundary.toISOString());
  if (evidenceError) throw new Error(`RUN_PROJECTION_EVIDENCE_READ_FAILED: ${evidenceError.message}`);

  const balanceEvidence = (evidence ?? []).filter((e) => e.evidence_type === "provider_raw_balance" && typeof e.raw_observation_id === "string");
  const transactionEvidenceIds = [...new Set((evidence ?? []).filter((e) => e.evidence_type === "provider_raw_transaction").map((e) => e.raw_observation_id).filter((id): id is string => typeof id === "string"))];
  if (!balanceEvidence.length || !transactionEvidenceIds.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_evidence_missing_balance_or_transactions", evidence_state: "insufficient_evidence" as const, limitations: ["An exact-run projection requires both observed Balance evidence and observed transaction evidence."] };
  }

  const balanceIds = [...new Set(balanceEvidence.map((e) => e.raw_observation_id).filter((id): id is string => typeof id === "string"))];
  const { data: balances, error: balanceError } = await supabaseAdmin
    .from("plaid_raw_balances")
    .select("id,account_id,raw_response,effective_at,acquired_at,evidence_state,is_current")
    .eq("user_id", userId)
    .in("id", balanceIds)
    .eq("evidence_state", "observed")
    .lte("acquired_at", boundary.toISOString());
  if (balanceError) throw new Error(`RUN_PROJECTION_BALANCE_READ_FAILED: ${balanceError.message}`);

  // A historical run may contain a balance that is no longer current. Select
  // the latest usable observed balance per account inside the exact run.
  const latestByAccount = new Map<string, any>();
  for (const row of balances ?? []) {
    const response = row.raw_response && typeof row.raw_response === "object" ? row.raw_response : {};
    const available = Number(response.available ?? response.balances?.available);
    if (!Number.isFinite(available) || !row.account_id) continue;
    const prior = latestByAccount.get(row.account_id);
    const rowTime = new Date(row.effective_at ?? row.acquired_at ?? 0).getTime();
    const priorTime = prior ? new Date(prior.effective_at ?? prior.acquired_at ?? 0).getTime() : -Infinity;
    if (!prior || rowTime > priorTime) latestByAccount.set(row.account_id, { ...row, available });
  }
  const balanceRows = [...latestByAccount.values()];
  if (!balanceRows.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_balance_not_numerically_observed", evidence_state: "insufficient_evidence" as const, limitations: ["The exact run contains Balance evidence, but no usable observed available balance was found."] };
  }

  const accounts = balanceRows.map((row) => row.account_id);
  const { data: accountRows, error: accountError } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id,type,subtype")
    .eq("user_id", userId)
    .in("id", accounts);
  if (accountError) throw new Error(`RUN_PROJECTION_ACCOUNT_READ_FAILED: ${accountError.message}`);
  const checkingIds = new Set((accountRows ?? []).filter((a: any) => a.type === "depository" && a.subtype === "checking").map((a: any) => a.id));
  const checkingBalances = balanceRows.filter((row) => checkingIds.has(row.account_id));
  if (!checkingBalances.length) {
    return { series: [], projectedLiquidPosition: null, basis: "exact_run_has_no_checking_balance", evidence_state: "insufficient_evidence" as const, limitations: ["The exact run does not contain an observed checking balance suitable for the forward projection."] };
  }
  const startBalance = checkingBalances.reduce((sum: number, row: any) => sum + row.available, 0);

  const widestStart = new Date(boundary.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  const transactions = await getCanonicalTransactions(userId, widestStart, boundary, runId);
  const outflows = transactions.filter(isEconomicOutflow);

  type Recurring = { merchant: string; amount: number; nextDate: string; occurrences: number; averageGapDays: number };
  const groups = new Map<string, typeof outflows>();
  for (const tx of outflows) {
    const key = tx.merchant_id ?? tx.merchant_name ?? `transaction:${tx.id}`;
    const rows = groups.get(key) ?? [];
    rows.push(tx);
    groups.set(key, rows);
  }
  const recurring: Recurring[] = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const ordered = [...rows].sort((a, b) => a.posted_date.localeCompare(b.posted_date));
    const gaps: number[] = [];
    for (let i = 1; i < ordered.length; i++) {
      const gap = (new Date(ordered[i].posted_date).getTime() - new Date(ordered[i - 1].posted_date).getTime()) / 86_400_000;
      if (Number.isFinite(gap) && gap > 0) gaps.push(gap);
    }
    if (!gaps.length) continue;
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const mid = Math.floor(sortedGaps.length / 2);
    const medianGapDays = sortedGaps.length % 2 ? sortedGaps[mid] : (sortedGaps[mid - 1] + sortedGaps[mid]) / 2;
    if (medianGapDays < 5 || medianGapDays > 45) continue;
    const amounts = ordered.map((tx) => tx.amount).filter(Number.isFinite);
    if (!amounts.length) continue;
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const amountMid = Math.floor(sortedAmounts.length / 2);
    const amount = sortedAmounts.length % 2 ? sortedAmounts[amountMid] : (sortedAmounts[amountMid - 1] + sortedAmounts[amountMid]) / 2;
    const last = ordered[ordered.length - 1];
    const next = new Date(new Date(last.posted_date).getTime() + medianGapDays * 86_400_000);
    if (next <= boundary) continue;
    recurring.push({ merchant: last.merchant_name ?? "Observed recurring outflow", amount, nextDate: next.toISOString().slice(0, 10), occurrences: ordered.length, averageGapDays: medianGapDays });
  }

  const projected: { date: string; balance: number; event: string | null }[] = [];
  let balance = startBalance;
  for (let i = 0; i <= horizonDays; i++) {
    const date = new Date(boundary.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const due = recurring.filter((item) => item.nextDate === date);
    let event: string | null = null;
    for (const item of due) {
      balance -= item.amount;
      event = event ? `${event}, ${item.merchant}` : item.merchant;
    }
    projected.push({ date, balance, event });
  }

  return {
    series: projected,
    projectedLiquidPosition: projected.at(-1)?.balance ?? null,
    basis: "exact_run_observed_checking_balance_plus_recurring_patterns_derived_from_exact_run_transactions",
    evidence_state: recurring.length ? "PREDICTED" as const : "INSUFFICIENT_EVIDENCE" as const,
    recurring_series_count: recurring.length,
    recurring_series: recurring,
    transaction_evidence_count: transactions.length,
    balance_evidence_count: checkingBalances.length,
    horizon_days: horizonDays,
    limitations: ["Recurring events are derived only from repeated outflows observed inside this exact run; no external recurring-series state is imported.", "The projection does not model unobserved future income or discretionary spending."]
  };
}
