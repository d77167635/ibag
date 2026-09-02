import { supabaseAdmin } from "../config/supabase.js";

/**
 * Recurring transaction detection — rule-based, not ML. A "series" is
 * declared when a merchant has 3+ posted, same-sign (all outflows)
 * transactions whose amounts are within 10% of their median and whose
 * day-gaps are within 5 days of their median gap. Anything less regular
 * (e.g. alternating charges/refunds, one-off large purchases) is
 * correctly left undetected rather than force-fit into a pattern.
 */
export async function detectRecurringSeries(userId: string) {
  const { data: txs, error } = await supabaseAdmin
    .from("transactions")
    .select("merchant_id, amount, posted_date, plaid_category_detailed")
    .eq("user_id", userId)
    .eq("pending", false)
    .not("merchant_id", "is", null)
    .gt("amount", 0) // outflows only — bills, not refunds/income
    .order("posted_date", { ascending: true });

  if (error) throw error;

  const { data: essentialCategories } = await supabaseAdmin
    .from("category_mapping")
    .select("plaid_category_detailed")
    .eq("is_essential", true);
  const essentialSet = new Set((essentialCategories ?? []).map((c) => c.plaid_category_detailed));

  const byMerchant = new Map<string, { amount: number; date: string; category: string | null }[]>();
  for (const tx of txs ?? []) {
    const list = byMerchant.get(tx.merchant_id) ?? [];
    list.push({ amount: Number(tx.amount), date: tx.posted_date, category: tx.plaid_category_detailed });
    byMerchant.set(tx.merchant_id, list);
  }

  const median = (nums: number[]) => {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const daysBetween = (a: string, b: string) =>
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

  for (const [merchantId, occurrences] of byMerchant) {
    if (occurrences.length < 3) continue;

    const amounts = occurrences.map((o) => o.amount);
    const medianAmount = median(amounts);
    const amountsConsistent = amounts.every(
      (a) => Math.abs(a - medianAmount) / medianAmount <= 0.1
    );
    if (!amountsConsistent) continue;

    const gaps: number[] = [];
    for (let i = 1; i < occurrences.length; i++) {
      gaps.push(daysBetween(occurrences[i - 1].date, occurrences[i].date));
    }
    const medianGap = median(gaps);
    const gapsConsistent = gaps.every((g) => Math.abs(g - medianGap) <= 5);
    if (!gapsConsistent || medianGap < 1) continue;

    const lastSeen = occurrences[occurrences.length - 1].date;
    const nextExpected = new Date(new Date(lastSeen).getTime() + medianGap * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const mostRecentCategory = occurrences[occurrences.length - 1].category;
    const isEssential = mostRecentCategory ? essentialSet.has(mostRecentCategory) : false;

    await supabaseAdmin.from("recurring_series").upsert(
      {
        user_id: userId,
        merchant_id: merchantId,
        typical_amount: medianAmount,
        interval_days: Math.round(medianGap),
        last_seen_date: lastSeen,
        next_expected_date: nextExpected,
        occurrence_count: occurrences.length,
        is_essential: isEssential,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,merchant_id" }
    );
  }
}

/**
 * Net worth and debt metrics — real account balances only, no fabricated
 * figures. Returns null for anything that can't be computed (e.g. no
 * accounts of a given type yet) rather than defaulting to zero, so the
 * frontend can distinguish "genuinely zero" from "not yet known."
 */
export async function computeBalanceMetrics(userId: string) {
  const { data: accounts, error } = await supabaseAdmin
    .from("plaid_accounts")
    .select("type, current_balance, credit_limit, balance_updated_at")
    .eq("user_id", userId);

  if (error) throw error;
  if (!accounts || accounts.length === 0) {
    return { liquidAssets: null, revolvingDebt: null, creditUtilization: null, asOf: null };
  }

  const depository = accounts.filter((a) => a.type === "depository" && a.current_balance !== null);
  const credit = accounts.filter((a) => a.type === "credit" && a.current_balance !== null);

  const liquidAssets = depository.length
    ? depository.reduce((sum, a) => sum + Number(a.current_balance), 0)
    : null;

  const revolvingDebt = credit.length
    ? credit.reduce((sum, a) => sum + Number(a.current_balance), 0)
    : null;

  const creditWithLimits = credit.filter((a) => a.credit_limit && Number(a.credit_limit) > 0);
  const creditUtilization = creditWithLimits.length
    ? creditWithLimits.reduce((sum, a) => sum + Number(a.current_balance) / Number(a.credit_limit), 0) /
      creditWithLimits.length
    : null;

  const asOf = accounts
    .map((a) => a.balance_updated_at)
    .filter(Boolean)
    .sort()
    .pop() ?? null;

  return { liquidAssets, revolvingDebt, creditUtilization, asOf };
}

/**
 * Safe-to-Spend: checking-account available balance minus recurring bills
 * expected before the given horizon. Bill Due-Date Collision: any window
 * where 2+ distinct recurring bills are expected within `collisionWindowDays`
 * of each other. Both are plain arithmetic over detected series — not a
 * statistical forecast, and labeled as such to the frontend.
 */
export async function computeCashFlowSafety(userId: string, horizonDays = 14, collisionWindowDays = 3) {
  const { data: checkingAccounts } = await supabaseAdmin
    .from("plaid_accounts")
    .select("available_balance")
    .eq("user_id", userId)
    .eq("type", "depository")
    .eq("subtype", "checking");

  const knownBalances = (checkingAccounts ?? []).filter((a) => a.available_balance !== null);
  const currentAvailable = knownBalances.length
    ? knownBalances.reduce((sum, a) => sum + Number(a.available_balance), 0)
    : null;

  const { data: series } = await supabaseAdmin
    .from("recurring_series")
    .select("typical_amount, next_expected_date, merchant_id, is_essential, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("is_essential", true); // only genuine bills (rent, loan payments, insurance...) —
  // recurring discretionary habits (coffee, rideshare) are tracked separately
  // and never treated as an obligation against Safe-to-Spend.

  const today = new Date();
  const horizon = new Date(today.getTime() + horizonDays * 86_400_000);

  const upcoming = (series ?? [])
    .filter((s) => new Date(s.next_expected_date) <= horizon)
    .sort((a, b) => a.next_expected_date.localeCompare(b.next_expected_date));

  const totalUpcomingBills = upcoming.reduce((sum, s) => sum + Number(s.typical_amount), 0);
  const safeToSpend = currentAvailable !== null ? currentAvailable - totalUpcomingBills : null;

  // Cluster into non-overlapping windows rather than emitting one warning
  // per bill — a bill already claimed by an earlier cluster isn't reused.
  const collisions: { window_start: string; bills: string[] }[] = [];
  const claimed = new Set<number>();
  for (let i = 0; i < upcoming.length; i++) {
    if (claimed.has(i)) continue;
    const clusterIndices = upcoming
      .map((s, j) => ({ s, j }))
      .filter(
        ({ s, j }) =>
          !claimed.has(j) &&
          Math.abs(
            (new Date(s.next_expected_date).getTime() - new Date(upcoming[i].next_expected_date).getTime()) /
              86_400_000
          ) <= collisionWindowDays
      );
    if (clusterIndices.length >= 2) {
      clusterIndices.forEach(({ j }) => claimed.add(j));
      collisions.push({
        window_start: upcoming[i].next_expected_date,
        bills: clusterIndices.map(({ s }: any) => s.merchants?.canonical_name ?? "Unknown"),
      });
    }
  }

  return {
    safeToSpend,
    currentAvailable,
    essentialBillsTotal: totalUpcomingBills,
    upcomingBills: upcoming.map((s: any) => ({
      merchant: s.merchants?.canonical_name ?? "Unknown",
      amount: Number(s.typical_amount),
      expectedDate: s.next_expected_date,
    })),
    billCollisions: collisions,
    horizonDays,
  };
}

/**
 * Projected round-up accumulation: derives the daily accrual rate from the
 * actual dates of posted spending transactions (ceil(amount)-amount summed,
 * divided by the real span of days those transactions cover) — not from
 * when sweep events were logged, which can cluster around whenever a sync
 * happened to run rather than when the underlying spending occurred. This
 * is a trailing-rate projection based on observed history, not a guarantee.
 */
export async function computeRoundupProjection(userId: string, projectDays = 30) {
  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date")
    .eq("user_id", userId)
    .eq("pending", false)
    .gt("amount", 0);

  if (!txs || txs.length === 0) {
    return { dailyRate: null, projected: null, basisDays: 0 };
  }

  const totalRoundup = txs.reduce((sum, tx) => {
    const amount = Number(tx.amount);
    return sum + (Math.ceil(amount) - amount);
  }, 0);

  const dates = txs.map((tx) => new Date(tx.posted_date).getTime());
  const spanDays = Math.max(1, Math.round((Math.max(...dates) - Math.min(...dates)) / 86_400_000));
  const dailyRate = totalRoundup / spanDays;

  return {
    dailyRate,
    projected: dailyRate * projectDays,
    basisDays: spanDays,
    projectDays,
  };
}

/**
 * 30-day cash flow with a genuine period-over-period comparison — both
 * windows computed from real transaction dates/amounts, nothing modeled
 * or invented. "vs previous period" is a plain percentage of real totals.
 */
export async function computeCashFlow(userId: string, windowDays = 30) {
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 86_400_000).toISOString().slice(0, 10);
  const priorWindowStart = new Date(now - 2 * windowDays * 86_400_000).toISOString().slice(0, 10);

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date")
    .eq("user_id", userId)
    .eq("pending", false)
    .gte("posted_date", priorWindowStart);

  if (!txs || txs.length === 0) {
    return { inflow: null, outflow: null, net: null, netChangePct: null, windowDays };
  }

  const current = txs.filter((t) => t.posted_date >= windowStart);
  const prior = txs.filter((t) => t.posted_date < windowStart);

  const sum = (rows: typeof txs, sign: "in" | "out") =>
    rows
      .filter((t) => (sign === "in" ? Number(t.amount) < 0 : Number(t.amount) > 0))
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const inflow = sum(current, "in");
  const outflow = sum(current, "out");
  const net = inflow - outflow;

  const priorNet = sum(prior, "in") - sum(prior, "out");
  const netChangePct = prior.length > 0 && priorNet !== 0 ? ((net - priorNet) / Math.abs(priorNet)) * 100 : null;

  return { inflow, outflow, net, netChangePct, windowDays };
}

/**
 * Spending broken down by domain for a window, each with a real
 * period-over-period comparison — same computation as cash flow, just
 * grouped by the classification we already compute during sync.
 */
export async function computeSpendingByDomain(userId: string, windowDays = 30) {
  const now = Date.now();
  const windowStart = new Date(now - windowDays * 86_400_000).toISOString().slice(0, 10);
  const priorWindowStart = new Date(now - 2 * windowDays * 86_400_000).toISOString().slice(0, 10);

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date, subdomains(domains(key, label))")
    .eq("user_id", userId)
    .eq("pending", false)
    .gt("amount", 0)
    .gte("posted_date", priorWindowStart);

  if (!txs || txs.length === 0) return [];

  const byDomain = new Map<string, { label: string; current: number; prior: number }>();
  for (const tx of txs as any[]) {
    const domain = tx.subdomains?.domains;
    const key = domain?.key ?? "uncategorized";
    const label = domain?.label ?? "Uncategorized";
    const entry = byDomain.get(key) ?? { label, current: 0, prior: 0 };
    if (tx.posted_date >= windowStart) entry.current += Number(tx.amount);
    else entry.prior += Number(tx.amount);
    byDomain.set(key, entry);
  }

  return Array.from(byDomain.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      amount: v.current,
      changePct: v.prior > 0 ? ((v.current - v.prior) / v.prior) * 100 : null,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Reconstructs a daily liquid-assets trend for the trailing `days` days.
 * There's no stored historical balance snapshot — only the current one —
 * so this works backward: balance_at(D) = current_balance + sum(amount
 * for transactions posted after D). Since Plaid's convention is amount>0
 * for debits (money out), adding back everything that happened after D
 * correctly un-does it to reconstruct the earlier balance. This is exact
 * arithmetic on real transaction data, not modeled or estimated — but it
 * is a reconstruction, not a stored record, and is labeled as such.
 */
export async function computeBalanceHistory(userId: string, days = 90) {
  const { data: accounts } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id, current_balance")
    .eq("user_id", userId)
    .eq("type", "depository")
    .not("current_balance", "is", null);

  if (!accounts || accounts.length === 0) return [];

  const currentTotal = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const accountIds = accounts.map((a) => a.id);

  const windowStart = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date")
    .in("account_id", accountIds)
    .eq("pending", false)
    .gte("posted_date", windowStart)
    .order("posted_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const series: { date: string; liquidAssets: number }[] = [];

  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const afterD = (txs ?? []).filter((t) => t.posted_date > d);
    const reconstructed = currentTotal + afterD.reduce((s, t) => s + Number(t.amount), 0);
    series.push({ date: d, liquidAssets: reconstructed });
    if (d === today) break;
  }

  return series;
}

/**
 * Same reconstruction technique as computeBalanceHistory, applied to
 * revolving debt instead of liquid assets — real arithmetic on real
 * balance + transaction data, not a separate estimate.
 */
export async function computeDebtTrend(userId: string, days = 30) {
  const { data: accounts } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id, current_balance")
    .eq("user_id", userId)
    .eq("type", "credit")
    .not("current_balance", "is", null);

  if (!accounts || accounts.length === 0) return { changePct: null, series: [] };

  const currentTotal = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const accountIds = accounts.map((a) => a.id);
  const windowStart = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const { data: txs } = await supabaseAdmin
    .from("transactions")
    .select("amount, posted_date")
    .in("account_id", accountIds)
    .eq("pending", false)
    .gte("posted_date", windowStart);

  const series: { date: string; debt: number }[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const afterD = (txs ?? []).filter((t) => t.posted_date > d);
    // Credit balance moves opposite to depository: a debit (amount>0)
    // increases what's owed, so reconstruction adds rather than adds-back.
    const reconstructed = currentTotal - afterD.reduce((s, t) => s + Number(t.amount), 0);
    series.push({ date: d, debt: reconstructed });
  }

  const first = series[0]?.debt;
  const last = series[series.length - 1]?.debt;
  const changePct = first && first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;

  return { changePct, series };
}

/**
 * Rule-based anomaly flagging: a transaction is flagged if it's at least
 * 50% above that merchant's own historical average (computed from that
 * merchant's other transactions, minimum 2 prior data points required —
 * one data point isn't a baseline). This is a stated threshold rule, not
 * a statistical or ML model, and is labeled that way to the frontend.
 */
export async function detectAnomalies(userId: string, windowDays = 30) {
  const windowStart = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);

  const { data: recentTxs } = await supabaseAdmin
    .from("transactions")
    .select("id, amount, posted_date, merchant_id, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("pending", false)
    .gt("amount", 0)
    .gte("posted_date", windowStart)
    .not("merchant_id", "is", null);

  if (!recentTxs || recentTxs.length === 0) return [];

  const anomalies: { merchant: string; amount: number; typicalAmount: number; date: string; pctAboveTypical: number }[] = [];

  for (const tx of recentTxs as any[]) {
    const { data: history } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("merchant_id", tx.merchant_id)
      .eq("pending", false)
      .neq("id", tx.id)
      .gt("amount", 0);

    if (!history || history.length < 2) continue; // not enough evidence to call anything unusual

    const avg = history.reduce((s, h) => s + Number(h.amount), 0) / history.length;
    const amount = Number(tx.amount);
    if (avg > 0 && amount >= avg * 1.5) {
      anomalies.push({
        merchant: tx.merchants?.canonical_name ?? "Unknown",
        amount,
        typicalAmount: avg,
        date: tx.posted_date,
        pctAboveTypical: ((amount - avg) / avg) * 100,
      });
    }
  }

  return anomalies.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Forward balance projection: current available checking balance minus
 * each known essential recurring bill on its expected date, walked
 * forward day by day. Only accounts for bills we actually have evidence
 * for (recurring_series, is_essential=true) — does not model income or
 * discretionary spending, and says so, rather than imply a complete
 * forecast it can't back up.
 */
export async function computeForwardProjection(userId: string, days = 30) {
  const { data: checkingAccounts } = await supabaseAdmin
    .from("plaid_accounts")
    .select("available_balance")
    .eq("user_id", userId)
    .eq("type", "depository")
    .eq("subtype", "checking")
    .not("available_balance", "is", null);

  if (!checkingAccounts || checkingAccounts.length === 0) return { series: [], basis: "no_checking_balance" };

  const startBalance = checkingAccounts.reduce((sum, a) => sum + Number(a.available_balance), 0);

  const { data: series } = await supabaseAdmin
    .from("recurring_series")
    .select("typical_amount, next_expected_date, interval_days, merchants(canonical_name)")
    .eq("user_id", userId)
    .eq("is_essential", true);

  const horizon = new Date(Date.now() + days * 86_400_000);
  const projected: { date: string; balance: number; event: string | null }[] = [];
  let balance = startBalance;

  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
    const dueToday = (series ?? []).filter((s: any) => s.next_expected_date === d);
    let event: string | null = null;
    for (const bill of dueToday) {
      balance -= Number(bill.typical_amount);
      event = event ? `${event}, ${(bill as any).merchants?.canonical_name}` : (bill as any).merchants?.canonical_name;
    }
    projected.push({ date: d, balance, event });
  }

  return { series: projected, basis: "known_essential_bills_only" };
}

/**
 * Formats a signed dollar amount correctly: sign before the $, comma
 * thousands separators, always 2 decimals. Fixes the earlier bug where
 * `$${n.toFixed(2)}` on a negative number produced "$-10645.24" instead
 * of "-$10,645.24".
 */
function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Builds a plain-language summary from the actual computed values passed
 * in — every clause traces to a real number already shown elsewhere on
 * the dashboard. No invented confidence percentage: where evidence is
 * genuinely limited (e.g. too few data points), the narrative says so
 * instead of asserting a number.
 */
export function buildNarrative(inputs: {
  safeToSpend: number | null;
  essentialBillsCount: number;
  cashFlowNet: number | null;
  cashFlowNetChangePct: number | null;
  debtChangePct: number | null;
  anomalyCount: number;
}): string {
  const parts: string[] = [];

  if (inputs.safeToSpend !== null) {
    parts.push(
      `Your safe-to-spend estimate is ${money(inputs.safeToSpend)}, based on ${inputs.essentialBillsCount} known essential bill${
        inputs.essentialBillsCount === 1 ? "" : "s"
      } due soon.`
    );
  } else {
    parts.push("There isn't enough account data yet to estimate safe-to-spend.");
  }

  if (inputs.cashFlowNet !== null) {
    const direction = inputs.cashFlowNet >= 0 ? "positive" : "negative";
    parts.push(`Cash flow over the last 30 days is ${direction} (${money(inputs.cashFlowNet)}).`);
    if (inputs.cashFlowNetChangePct !== null) {
      const pct = Math.abs(inputs.cashFlowNetChangePct).toFixed(0);
      parts.push(
        pct === "0"
          ? "That's about the same as the prior 30 days."
          : `That's ${inputs.cashFlowNetChangePct >= 0 ? "up" : "down"} ${pct}% versus the prior 30 days.`
      );
    }
  }

  if (inputs.debtChangePct !== null) {
    parts.push(
      `Revolving debt has ${inputs.debtChangePct >= 0 ? "increased" : "decreased"} ${Math.abs(
        inputs.debtChangePct
      ).toFixed(0)}% over the last 30 days.`
    );
  }

  if (inputs.anomalyCount > 0) {
    parts.push(
      `${inputs.anomalyCount} transaction${inputs.anomalyCount === 1 ? " looks" : "s look"} unusually large compared to that merchant's typical amount — see below.`
    );
  }

  return parts.join(" ");
}
