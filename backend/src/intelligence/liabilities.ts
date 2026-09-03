import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * LAYER 1 (extended) + LAYER 8 — LIABILITIES OBSERVATION & DEBT-COST FORECAST
 *
 * Prior state: PLAID_PRODUCTS included "liabilities" and plaid_raw_liabilities
 * existed as an empty audit table since the first migration — the product
 * was requested and paid for but never called. dashboard.ts hardcoded
 * `interest_cost_attribution: null` with a comment saying it required this.
 *
 * This is the fix: an actual liabilitiesGet call, written through the same
 * raw-then-normalized pattern as every other Plaid product in this
 * codebase (see sync.ts's fullSyncForItem for transactions/accounts).
 *
 * This is also the first genuinely MULTI-SOURCE computation in the
 * codebase: computeDebtCostIntelligence combines liability_details (APR,
 * minimum payment) with plaid_accounts (current balance) to answer a
 * question neither source can answer alone — "what does carrying this
 * balance actually cost." Every previous metric in intelligence.ts touched
 * exactly one table.
 */

export async function syncLiabilitiesForItem(userId: string, accessToken: string) {
  let response;
  try {
    response = await plaidClient.liabilitiesGet({ access_token: accessToken });
  } catch (err: any) {
    // Not every institution/account supports Liabilities (e.g. plain
    // checking-only items). A PRODUCT_NOT_READY or NO_LIABILITY_ACCOUNTS
    // error here is an expected, non-fatal outcome, not a sync failure —
    // it means "nothing to observe," which the rest of this system already
    // treats as null/insufficient-evidence rather than a crash.
    console.warn("liabilitiesGet skipped (item may have no liability accounts):", err?.message ?? err);
    return;
  }

  const { data: accountIdRows } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id, plaid_account_id")
    .eq("user_id", userId);
  const idMap = new Map((accountIdRows ?? []).map((a) => [a.plaid_account_id, a.id]));

  const allLiabilityAccounts = [
    ...(response.data.liabilities.credit ?? []).map((l) => ({ type: "credit" as const, raw: l })),
    ...(response.data.liabilities.student ?? []).map((l) => ({ type: "student" as const, raw: l })),
    ...(response.data.liabilities.mortgage ?? []).map((l) => ({ type: "mortgage" as const, raw: l })),
  ];

  for (const { type, raw } of allLiabilityAccounts) {
    const localAccountId = idMap.get((raw as any).account_id);
    if (!localAccountId) continue;

    // Raw mirror — untouched API response, same audit pattern as balances/tx.
    await supabaseAdmin.from("plaid_raw_liabilities").insert({
      user_id: userId,
      account_id: localAccountId,
      raw_response: raw,
    });

    if (type === "credit") {
      const l = raw as any;
      const purchaseApr = (l.aprs ?? []).find((a: any) => a.apr_type === "purchase_apr");
      await supabaseAdmin.from("liability_details").upsert(
        {
          user_id: userId,
          account_id: localAccountId,
          liability_type: "credit",
          apr_percentage: purchaseApr?.apr_percentage ?? null,
          apr_type: purchaseApr?.apr_type ?? null,
          is_overdue: l.is_overdue ?? null,
          last_statement_balance: l.last_statement_balance ?? null,
          last_payment_amount: l.last_payment_amount ?? null,
          last_payment_date: l.last_payment_date ?? null,
          minimum_payment_amount: l.minimum_payment_amount ?? null,
          next_payment_due_date: l.next_payment_due_date ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,liability_type,apr_type" }
      );
    } else if (type === "student") {
      const l = raw as any;
      await supabaseAdmin.from("liability_details").upsert(
        {
          user_id: userId,
          account_id: localAccountId,
          liability_type: "student",
          apr_percentage: l.interest_rate_percentage ?? null,
          apr_type: "interest_rate",
          is_overdue: l.is_overdue ?? null,
          last_payment_amount: l.last_payment_amount ?? null,
          last_payment_date: l.last_payment_date ?? null,
          minimum_payment_amount: l.minimum_payment_amount ?? null,
          next_payment_due_date: l.next_payment_due_date ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,liability_type,apr_type" }
      );
    } else if (type === "mortgage") {
      const l = raw as any;
      await supabaseAdmin.from("liability_details").upsert(
        {
          user_id: userId,
          account_id: localAccountId,
          liability_type: "mortgage",
          apr_percentage: l.interest_rate?.percentage ?? null,
          apr_type: l.interest_rate?.type ?? null,
          last_payment_amount: l.last_payment_amount ?? null,
          last_payment_date: l.last_payment_date ?? null,
          next_payment_due_date: l.next_monthly_payment ? null : null, // Plaid mortgage schema has no single due-date field
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,liability_type,apr_type" }
      );
    }
  }
}

export interface DebtCostIntelligence {
  totalRevolvingBalance: number | null;
  weightedAvgApr: number | null; // balance-weighted across credit accounts with a known APR
  estimatedMonthlyInterestCost: number | null;
  minimumPaymentTotal: number | null;
  accountsWithKnownApr: number;
  accountsWithoutAprData: number;
  evidence: "calculated" | "insufficient_evidence";
  basis: string;
}

/**
 * Combines liability_details (APR, minimum payment) with plaid_accounts
 * (current balance) — the first true dual-source computation in this
 * codebase. Returns insufficient_evidence rather than a guessed APR when
 * no liability data has been observed for a user's credit accounts
 * (e.g. sync hasn't run since this feature shipped, or the institution
 * doesn't report APR through Plaid).
 */
export async function computeDebtCostIntelligence(userId: string): Promise<DebtCostIntelligence> {
  const { data: rows, error } = await supabaseAdmin
    .from("liability_details")
    .select("apr_percentage, minimum_payment_amount, plaid_accounts(current_balance)")
    .eq("user_id", userId)
    .eq("liability_type", "credit");

  if (error) throw error;

  if (!rows || rows.length === 0) {
    return {
      totalRevolvingBalance: null,
      weightedAvgApr: null,
      estimatedMonthlyInterestCost: null,
      minimumPaymentTotal: null,
      accountsWithKnownApr: 0,
      accountsWithoutAprData: 0,
      evidence: "insufficient_evidence",
      basis: "No liability data has been observed for this user's credit accounts yet.",
    };
  }

  const withApr = (rows as any[]).filter(
    (r) => r.apr_percentage !== null && r.plaid_accounts?.current_balance !== null
  );
  const withoutApr = rows.length - withApr.length;

  const totalRevolvingBalance = (rows as any[]).reduce(
    (sum, r) => sum + Number(r.plaid_accounts?.current_balance ?? 0),
    0
  );
  const minimumPaymentTotal = (rows as any[]).reduce(
    (sum, r) => sum + Number(r.minimum_payment_amount ?? 0),
    0
  );

  if (withApr.length === 0) {
    return {
      totalRevolvingBalance,
      weightedAvgApr: null,
      estimatedMonthlyInterestCost: null,
      minimumPaymentTotal: minimumPaymentTotal || null,
      accountsWithKnownApr: 0,
      accountsWithoutAprData: withoutApr,
      evidence: "insufficient_evidence",
      basis: "Balances are known but no account reports an APR through Plaid — interest cost cannot be calculated.",
    };
  }

  const aprWeightedSum = withApr.reduce(
    (sum, r) => sum + Number(r.apr_percentage) * Number(r.plaid_accounts.current_balance),
    0
  );
  const aprBalanceBasis = withApr.reduce((sum, r) => sum + Number(r.plaid_accounts.current_balance), 0);
  const weightedAvgApr = aprBalanceBasis > 0 ? aprWeightedSum / aprBalanceBasis : null;

  // Simple monthly interest estimate: balance * (APR/100) / 12, summed
  // per account with known APR. This is a stated approximation (ignores
  // daily compounding and mid-cycle paydown), not a bank's actual accrual
  // calculation — labeled as such via `basis`.
  const estimatedMonthlyInterestCost = withApr.reduce(
    (sum, r) => sum + (Number(r.apr_percentage) / 100 / 12) * Number(r.plaid_accounts.current_balance),
    0
  );

  return {
    totalRevolvingBalance,
    weightedAvgApr,
    estimatedMonthlyInterestCost,
    minimumPaymentTotal: minimumPaymentTotal || null,
    accountsWithKnownApr: withApr.length,
    accountsWithoutAprData: withoutApr,
    evidence: "calculated",
    basis: `Balance-weighted average APR across ${withApr.length} account(s) with reported APR; simple monthly-rate approximation, not compounded daily accrual.`,
  };
}
