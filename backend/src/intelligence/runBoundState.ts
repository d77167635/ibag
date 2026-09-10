import { supabaseAdmin } from "../config/supabase.js";
import { getCanonicalTransactions } from "./transactionSemantics.js";
import { computeRunBoundForwardProjection } from "./runBoundProjection.js";

export interface RunBoundStateContext {
  userId: string;
  runId: string;
  evidenceBoundary: string;
  asOf?: string | null;
}

async function exactBalances(context: RunBoundStateContext) {
  const { data: evidence, error: evidenceError } = await supabaseAdmin
    .from("iris_run_evidence")
    .select("raw_observation_id,evidence_type,acquired_at")
    .eq("run_id", context.runId)
    .eq("user_id", context.userId)
    .eq("provider", "plaid")
    .eq("evidence_type", "provider_raw_balance")
    .lte("acquired_at", context.evidenceBoundary);
  if (evidenceError) throw new Error(`RUN_STATE_EVIDENCE_READ_FAILED: ${evidenceError.message}`);

  const ids = [...new Set((evidence ?? []).map((row) => row.raw_observation_id).filter((id): id is string => typeof id === "string"))];
  if (!ids.length) return [];

  const { data: balances, error } = await supabaseAdmin
    .from("plaid_raw_balances")
    .select("id,account_id,raw_response,effective_at,acquired_at,evidence_state")
    .eq("user_id", context.userId)
    .in("id", ids)
    .eq("evidence_state", "observed")
    .lte("acquired_at", context.evidenceBoundary);
  if (error) throw new Error(`RUN_STATE_BALANCE_READ_FAILED: ${error.message}`);

  const latest = new Map<string, any>();
  for (const row of balances ?? []) {
    if (!row.account_id) continue;
    const response = row.raw_response && typeof row.raw_response === "object" ? row.raw_response : {};
    const current = Number(response.current ?? response.balances?.current);
    const available = Number(response.available ?? response.balances?.available);
    if (!Number.isFinite(current) && !Number.isFinite(available)) continue;
    const previous = latest.get(row.account_id);
    const rowTime = new Date(row.effective_at ?? row.acquired_at ?? 0).getTime();
    const previousTime = previous ? new Date(previous.effective_at ?? previous.acquired_at ?? 0).getTime() : -Infinity;
    if (!previous || rowTime > previousTime) latest.set(row.account_id, { ...row, current, available });
  }
  return [...latest.values()];
}

async function exactAccounts(context: RunBoundStateContext, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id,type,subtype,credit_limit")
    .eq("user_id", context.userId)
    .in("id", ids);
  if (error) throw new Error(`RUN_STATE_ACCOUNT_READ_FAILED: ${error.message}`);
  return data ?? [];
}

export async function computeRunBoundState(context: RunBoundStateContext) {
  const balances = await exactBalances(context);
  const accounts = await exactAccounts(context, balances.map((row) => row.account_id));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const depository = balances.filter((row) => accountMap.get(row.account_id)?.type === "depository" && Number.isFinite(row.current));
  const credit = balances.filter((row) => accountMap.get(row.account_id)?.type === "credit" && Number.isFinite(row.current));
  const liquidAssets = depository.length ? depository.reduce((sum, row) => sum + Number(row.current), 0) : null;
  const revolvingDebt = credit.length ? credit.reduce((sum, row) => sum + Number(row.current), 0) : null;
  const creditWithLimits = credit.filter((row) => Number(accountMap.get(row.account_id)?.credit_limit) > 0);
  const creditUtilization = creditWithLimits.length
    ? creditWithLimits.reduce((sum, row) => sum + Number(row.current) / Number(accountMap.get(row.account_id)?.credit_limit), 0) / creditWithLimits.length
    : null;
  const balanceAsOf = balances.map((row) => row.effective_at ?? row.acquired_at).filter(Boolean).sort().at(-1) ?? null;

  const transactionStart = new Date(new Date(context.evidenceBoundary).getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  const transactions = await getCanonicalTransactions(context.userId, transactionStart, context.evidenceBoundary, context.runId);
  const checkingBalances = balances.filter((row) => {
    const account = accountMap.get(row.account_id);
    return account?.type === "depository" && account?.subtype === "checking" && Number.isFinite(row.available);
  });
  const currentAvailable = checkingBalances.length ? checkingBalances.reduce((sum, row) => sum + Number(row.available), 0) : null;

  const forward = await computeRunBoundForwardProjection(context.userId, context.runId, 14, context.evidenceBoundary);
  const recurringSeries = "recurring_series" in forward && Array.isArray(forward.recurring_series) ? forward.recurring_series : [];
  const upcomingBills = recurringSeries.map((series) => ({ merchant: series.merchant, amount: series.amount, expectedDate: series.nextDate }));

  // Recurrence is not obligation evidence. Do not subtract every recurring
  // candidate from available cash or label it essential without explicit
  // obligation evidence. Safe-to-spend therefore remains unavailable here.
  const safeToSpend = null;

  const balanceHistory = depository.length
    ? reconstructHistory(depository.reduce((sum, row) => sum + Number(row.current), 0), transactions.filter((tx) => depository.some((row) => row.account_id === tx.account_id)), 90, context.evidenceBoundary)
    : [];
  const debtHistory = credit.length
    ? reconstructDebtHistory(credit.reduce((sum, row) => sum + Number(row.current), 0), transactions.filter((tx) => credit.some((row) => row.account_id === tx.account_id)), 30, context.evidenceBoundary)
    : [];

  const firstDebt = debtHistory[0]?.debt ?? null;
  const lastDebt = debtHistory.at(-1)?.debt ?? null;
  const debtChangePct = firstDebt !== null && firstDebt !== 0 && lastDebt !== null ? ((lastDebt - firstDebt) / Math.abs(firstDebt)) * 100 : null;

  return {
    balances: { liquidAssets, revolvingDebt, creditUtilization, asOf: balanceAsOf },
    cashFlowSafety: {
      safeToSpend,
      currentAvailable,
      essentialBillsTotal: null as unknown as number,
      upcomingBills,
      billCollisions: [],
      horizonDays: 14,
      evidence_state: "INSUFFICIENT_EVIDENCE" as const,
      limitation: upcomingBills.length
        ? "Exact-run evidence establishes recurring candidates, but does not establish which candidates are contractual or essential obligations; safe-to-spend is withheld."
        : "Exact-run evidence does not establish upcoming recurring obligations sufficient for a safe-to-spend calculation.",
    },
    balanceHistory,
    debtTrend: { changePct: debtChangePct, series: debtHistory },
    evidence: { transactionCount: transactions.length, balanceCount: balances.length, evidenceBoundary: context.evidenceBoundary, runId: context.runId },
  };
}

function reconstructHistory(currentTotal: number, transactions: any[], days: number, boundary: string) {
  const anchor = new Date(boundary);
  const series: { date: string; liquidAssets: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(anchor.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const after = transactions.filter((tx) => tx.posted_date > date).reduce((sum, tx) => sum + Number(tx.amount), 0);
    series.push({ date, liquidAssets: currentTotal + after });
  }
  return series;
}

function reconstructDebtHistory(currentTotal: number, transactions: any[], days: number, boundary: string) {
  const anchor = new Date(boundary);
  const series: { date: string; debt: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(anchor.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const after = transactions.filter((tx) => tx.posted_date > date).reduce((sum, tx) => sum + Number(tx.amount), 0);
    series.push({ date, debt: currentTotal - after });
  }
  return series;
}