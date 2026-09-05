import { plaidClient } from "../plaid/client.js";
import { supabaseAdmin } from "../config/supabase.js";

/** Observe liabilities for exactly one owned Plaid Item. */
export async function syncLiabilitiesForItem(userId: string, itemId: string, accessToken: string): Promise<{ observed: boolean; liabilityCount: number }> {
  let response;
  try {
    response = await plaidClient.liabilitiesGet({ access_token: accessToken });
  } catch (err: any) {
    // An unavailable/not-ready product is not evidence. Do not manufacture an
    // "observed" state merely because the product was requested.
    console.warn("liabilitiesGet unavailable for item:", err?.response?.data?.error_code ?? err?.code ?? err?.message ?? err);
    return { observed: false, liabilityCount: 0 };
  }

  const { data: accountIdRows, error: accountError } = await supabaseAdmin
    .from("plaid_accounts")
    .select("id, plaid_account_id")
    .eq("user_id", userId)
    .eq("item_id", itemId);
  if (accountError) throw accountError;
  const idMap = new Map((accountIdRows ?? []).map((a) => [a.plaid_account_id, a.id]));

  const allLiabilityAccounts = [
    ...(response.data.liabilities.credit ?? []).map((l) => ({ type: "credit" as const, raw: l })),
    ...(response.data.liabilities.student ?? []).map((l) => ({ type: "student" as const, raw: l })),
    ...(response.data.liabilities.mortgage ?? []).map((l) => ({ type: "mortgage" as const, raw: l })),
  ];

  for (const { type, raw } of allLiabilityAccounts) {
    const localAccountId = idMap.get((raw as any).account_id);
    // Never write provider liability evidence into an account belonging to a
    // different Item. Missing lineage is an evidence-integrity failure.
    if (!localAccountId) continue;

    const { error: rawError } = await supabaseAdmin.from("plaid_raw_liabilities").insert({
      user_id: userId,
      account_id: localAccountId,
      raw_response: raw,
    });
    if (rawError) throw rawError;

    if (type === "credit") {
      const l = raw as any;
      const purchaseApr = (l.aprs ?? []).find((a: any) => a.apr_type === "purchase_apr");
      const { error } = await supabaseAdmin.from("liability_details").upsert({
        user_id: userId, account_id: localAccountId, liability_type: "credit",
        apr_percentage: purchaseApr?.apr_percentage ?? null, apr_type: purchaseApr?.apr_type ?? null,
        is_overdue: l.is_overdue ?? null, last_statement_balance: l.last_statement_balance ?? null,
        last_payment_amount: l.last_payment_amount ?? null, last_payment_date: l.last_payment_date ?? null,
        minimum_payment_amount: l.minimum_payment_amount ?? null, next_payment_due_date: l.next_payment_due_date ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,liability_type,apr_type" });
      if (error) throw error;
    } else if (type === "student") {
      const l = raw as any;
      const { error } = await supabaseAdmin.from("liability_details").upsert({
        user_id: userId, account_id: localAccountId, liability_type: "student",
        apr_percentage: l.interest_rate_percentage ?? null, apr_type: "interest_rate",
        is_overdue: l.is_overdue ?? null, last_payment_amount: l.last_payment_amount ?? null,
        last_payment_date: l.last_payment_date ?? null, minimum_payment_amount: l.minimum_payment_amount ?? null,
        next_payment_due_date: l.next_payment_due_date ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,liability_type,apr_type" });
      if (error) throw error;
    } else {
      const l = raw as any;
      const { error } = await supabaseAdmin.from("liability_details").upsert({
        user_id: userId, account_id: localAccountId, liability_type: "mortgage",
        apr_percentage: l.interest_rate?.percentage ?? null, apr_type: l.interest_rate?.type ?? null,
        last_payment_amount: l.last_payment_amount ?? null, last_payment_date: l.last_payment_date ?? null,
        next_payment_due_date: null, updated_at: new Date().toISOString(),
      }, { onConflict: "account_id,liability_type,apr_type" });
      if (error) throw error;
    }
  }

  return { observed: true, liabilityCount: allLiabilityAccounts.length };
}

export interface DebtCostIntelligence {
  totalRevolvingBalance: number | null;
  weightedAvgApr: number | null;
  estimatedMonthlyInterestCost: number | null;
  minimumPaymentTotal: number | null;
  accountsWithKnownApr: number;
  accountsWithoutAprData: number;
  evidence: "calculated" | "insufficient_evidence";
  basis: string;
}

export async function computeDebtCostIntelligence(userId: string): Promise<DebtCostIntelligence> {
  const { data: rows, error } = await supabaseAdmin
    .from("liability_details")
    .select("apr_percentage, minimum_payment_amount, plaid_accounts!liability_details_account_user_fk(current_balance)")
    .eq("user_id", userId)
    .eq("liability_type", "credit");
  if (error) throw error;
  if (!rows || rows.length === 0) return {
    totalRevolvingBalance: null, weightedAvgApr: null, estimatedMonthlyInterestCost: null,
    minimumPaymentTotal: null, accountsWithKnownApr: 0, accountsWithoutAprData: 0,
    evidence: "insufficient_evidence", basis: "No liability data has been observed for this user's credit accounts yet."
  };
  const withApr = (rows as any[]).filter(r => r.apr_percentage !== null && r.plaid_accounts?.current_balance !== null);
  const withoutApr = rows.length - withApr.length;
  const totalRevolvingBalance = (rows as any[]).reduce((sum, r) => sum + Number(r.plaid_accounts?.current_balance ?? 0), 0);
  const minimumPaymentTotal = (rows as any[]).reduce((sum, r) => sum + Number(r.minimum_payment_amount ?? 0), 0);
  if (withApr.length === 0) return {
    totalRevolvingBalance, weightedAvgApr: null, estimatedMonthlyInterestCost: null,
    minimumPaymentTotal: minimumPaymentTotal || null, accountsWithKnownApr: 0, accountsWithoutAprData: withoutApr,
    evidence: "insufficient_evidence", basis: "Balances are known but no account reports an APR through Plaid — interest cost cannot be calculated."
  };
  const aprWeightedSum = withApr.reduce((sum, r) => sum + Number(r.apr_percentage) * Number(r.plaid_accounts.current_balance), 0);
  const aprBalanceBasis = withApr.reduce((sum, r) => sum + Number(r.plaid_accounts.current_balance), 0);
  const weightedAvgApr = aprBalanceBasis > 0 ? aprWeightedSum / aprBalanceBasis : null;
  const estimatedMonthlyInterestCost = withApr.reduce((sum, r) => sum + (Number(r.apr_percentage) / 100 / 12) * Number(r.plaid_accounts.current_balance), 0);
  return {
    totalRevolvingBalance, weightedAvgApr, estimatedMonthlyInterestCost,
    minimumPaymentTotal: minimumPaymentTotal || null, accountsWithKnownApr: withApr.length,
    accountsWithoutAprData: withoutApr, evidence: "calculated",
    basis: `Balance-weighted average APR across ${withApr.length} account(s) with reported APR; simple monthly-rate approximation, not compounded daily accrual.`
  };
}
