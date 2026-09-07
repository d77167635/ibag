import { supabaseAdmin } from "../config/supabase.js";
import type { IrisExecutionContext } from "./irisExecutionContext.js";
import { getCertifiedCoreAccountIds } from "./certifiedEvidenceBoundary.js";

const DAY_MS = 86_400_000;

function anchorFor(context?: IrisExecutionContext) {
  const anchor = context ? new Date(context.temporal.as_of) : new Date();
  if (!Number.isFinite(anchor.getTime())) throw new Error("IRIS_EXECUTION_CONTEXT_INVALID_AS_OF");
  return anchor;
}

/**
 * Single governed financial-state acquisition boundary.
 * In a governed run, every account-backed state metric is restricted to the
 * certified core account universe captured by the evidence boundary.
 */
export async function computeGovernedFinancialState(userId: string, executionContext?: IrisExecutionContext) {
  const anchor = anchorFor(executionContext);
  const certifiedAccountIds = executionContext ? await getCertifiedCoreAccountIds(userId) : null;

  let accountQuery = supabaseAdmin
    .from("plaid_accounts")
    .select("id, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, item_id")
    .eq("user_id", userId);
  if (certifiedAccountIds) accountQuery = accountQuery.in("id", certifiedAccountIds.length ? certifiedAccountIds : ["__none__"]);
  const { data: accounts, error: accountError } = await accountQuery;
  if (accountError) throw accountError;

  const accountRows = accounts ?? [];
  const usable = accountRows.filter((a: any) => a.current_balance !== null && Number.isFinite(Number(a.current_balance)) && (!executionContext || !a.balance_updated_at || new Date(a.balance_updated_at).getTime() <= anchor.getTime()));
  const depository = usable.filter((a: any) => a.type === "depository");
  const credit = usable.filter((a: any) => a.type === "credit");
  const liquidAssets = depository.length ? depository.reduce((sum, a: any) => sum + Number(a.current_balance), 0) : null;
  const revolvingDebt = credit.length ? credit.reduce((sum, a: any) => sum + Number(a.current_balance), 0) : null;
  const creditWithLimits = credit.filter((a: any) => a.credit_limit !== null && Number(a.credit_limit) > 0);
  const creditUtilization = creditWithLimits.length ? creditWithLimits.reduce((sum, a: any) => sum + Number(a.current_balance) / Number(a.credit_limit), 0) / creditWithLimits.length : null;
  const balanceAsOf = usable.map((a: any) => a.balance_updated_at).filter(Boolean).sort().pop() ?? null;
  const stateEvidence = usable.length ? (executionContext && usable.length < accountRows.filter((a: any) => a.current_balance !== null).length ? "limited" : "observed") : "insufficient_evidence";

  const checking = accountRows.filter((a: any) => a.type === "depository" && a.subtype === "checking");
  const knownAvailable = checking.filter((a: any) => a.available_balance !== null && Number.isFinite(Number(a.available_balance)) && (!executionContext || !a.balance_updated_at || new Date(a.balance_updated_at).getTime() <= anchor.getTime()));
  const currentAvailable = knownAvailable.length ? knownAvailable.reduce((sum, a: any) => sum + Number(a.available_balance), 0) : null;

  const { data: series, error: seriesError } = await supabaseAdmin
    .from("recurring_series")
    .select("typical_amount, next_expected_date, merchant_id, is_essential, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("is_essential", true);
  if (seriesError) throw seriesError;
  const horizon = new Date(anchor.getTime() + 14 * DAY_MS);
  const upcoming = (series ?? [])
    .filter((s: any) => new Date(s.next_expected_date) <= horizon && new Date(s.next_expected_date) >= anchor)
    .sort((a: any, b: any) => a.next_expected_date.localeCompare(b.next_expected_date));
  const totalUpcomingBills = upcoming.reduce((sum: number, s: any) => sum + Number(s.typical_amount), 0);
  const safeToSpend = currentAvailable !== null ? currentAvailable - totalUpcomingBills : null;
  const collisions: { window_start: string; bills: string[] }[] = [];
  const claimed = new Set<number>();
  for (let i = 0; i < upcoming.length; i++) {
    if (claimed.has(i)) continue;
    const cluster = upcoming.map((s: any, j: number) => ({ s, j })).filter(({ s, j }: any) => !claimed.has(j) && Math.abs((new Date(s.next_expected_date).getTime() - new Date(upcoming[i].next_expected_date).getTime()) / DAY_MS) <= 3);
    if (cluster.length >= 2) {
      cluster.forEach(({ j }: any) => claimed.add(j));
      collisions.push({ window_start: upcoming[i].next_expected_date, bills: cluster.map(({ s }: any) => s.merchants?.canonical_name ?? "Unknown") });
    }
  }

  const accountIds = accountRows.map((a: any) => a.id);
  const historyStart = new Date(anchor.getTime() - 90 * DAY_MS).toISOString().slice(0, 10);
  const cutoff = anchor.toISOString().slice(0, 10);
  const { data: transactions, error: transactionError } = accountIds.length
    ? await supabaseAdmin.from("transactions").select("account_id, amount, posted_date").in("account_id", accountIds).eq("pending", false).gte("posted_date", historyStart).lte("posted_date", cutoff).order("posted_date", { ascending: true })
    : { data: [], error: null };
  if (transactionError) throw transactionError;

  const txs = transactions ?? [];
  const depositoryAccounts = accountRows.filter((a: any) => a.type === "depository" && a.current_balance !== null);
  const history = (() => {
    if (!depositoryAccounts.length) return [];
    if (executionContext && depositoryAccounts.some((a: any) => a.balance_updated_at && new Date(a.balance_updated_at).getTime() > anchor.getTime())) return [];
    const currentTotal = depositoryAccounts.reduce((sum: number, a: any) => sum + Number(a.current_balance), 0);
    const ids = new Set(depositoryAccounts.map((a: any) => a.id));
    const rows = txs.filter((t: any) => ids.has(t.account_id));
    const out: { date: string; liquidAssets: number }[] = [];
    for (let i = 90; i >= 0; i--) {
      const d = new Date(anchor.getTime() - i * DAY_MS).toISOString().slice(0, 10);
      const after = rows.filter((t: any) => t.posted_date > d && t.posted_date <= cutoff);
      out.push({ date: d, liquidAssets: currentTotal - after.reduce((sum: number, t: any) => sum + Number(t.amount), 0) });
    }
    return out;
  })();

  const debtTrend = (() => {
    const creditAccounts = accountRows.filter((a: any) => a.type === "credit" && a.current_balance !== null);
    if (!creditAccounts.length) return { changePct: null, series: [] as { date: string; revolvingDebt: number }[] };
    if (executionContext && creditAccounts.some((a: any) => a.balance_updated_at && new Date(a.balance_updated_at).getTime() > anchor.getTime())) return { changePct: null, series: [] as { date: string; revolvingDebt: number }[] };
    const currentTotal = creditAccounts.reduce((sum: number, a: any) => sum + Number(a.current_balance), 0);
    const ids = new Set(creditAccounts.map((a: any) => a.id));
    const rows = txs.filter((t: any) => ids.has(t.account_id));
    const windowStart = new Date(anchor.getTime() - 30 * DAY_MS).toISOString().slice(0, 10);
    const priorStart = new Date(anchor.getTime() - 60 * DAY_MS).toISOString().slice(0, 10);
    const currentRows = rows.filter((t: any) => t.posted_date > windowStart && t.posted_date <= cutoff);
    const priorRows = rows.filter((t: any) => t.posted_date > priorStart && t.posted_date <= windowStart);
    const currentChange = currentRows.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const priorChange = priorRows.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const priorBalance = currentTotal - currentChange - priorChange;
    const changePct = priorBalance !== 0 ? ((currentTotal - priorBalance) / Math.abs(priorBalance)) * 100 : null;
    return { changePct, series: [{ date: cutoff, revolvingDebt: currentTotal }] };
  })();

  return {
    certifiedAccountIds: certifiedAccountIds ?? accountIds,
    balances: { liquidAssets, revolvingDebt, creditUtilization, asOf: balanceAsOf, stateEvidence },
    cashFlowSafety: { safeToSpend, currentAvailable, essentialBillsTotal: totalUpcomingBills, upcomingBills: upcoming.map((s: any) => ({ merchant: s.merchants?.canonical_name ?? "Unknown", amount: Number(s.typical_amount), expectedDate: s.next_expected_date })), billCollisions: collisions, horizonDays: 14, asOf: anchor.toISOString(), stateEvidence: currentAvailable !== null ? "observed" : "insufficient_evidence" },
    balanceHistory: history,
    debtTrend,
  };
}
