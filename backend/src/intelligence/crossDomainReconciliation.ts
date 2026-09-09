export type ReconciliationState = "reconciled" | "partially_reconciled" | "unreconciled" | "insufficient_evidence";

export interface CrossDomainReconciliationInput {
  accountBalanceCount: number;
  transactionAccountCount: number;
  transactionLineageComplete: boolean;
  balanceCurrencySafe: boolean;
  investmentAccountBalance: number | null;
  investmentHoldingValue: number | null;
  liabilityAccountBalance: number | null;
  liabilityProductBalance: number | null;
  assetReportValue: number | null;
  statementAccountCount: number;
  statementTransactionAccountOverlap: number;
}

export interface CrossDomainReconciliationResult {
  architecture_version: "IRIS_CROSS_DOMAIN_RECONCILIATION_V1";
  state: ReconciliationState;
  net_worth_basis: "account_balances_only" | "withheld";
  overlap_protection: {
    investment_holdings_excluded_from_net_worth: true;
    asset_report_values_excluded_from_net_worth: true;
    liability_product_values_not_double_counted: true;
  };
  checks: {
    transaction_account_lineage: boolean;
    currency_safe: boolean;
    statement_account_coverage: number | null;
    liability_balance_comparable: boolean | null;
    investment_balance_comparable: boolean | null;
  };
  limitations: string[];
}

function finite(value: number | null): boolean {
  return value !== null && Number.isFinite(value);
}

/**
 * Pure cross-domain reconciliation policy. It never creates or mutates financial facts.
 * Values from specialized Plaid reports are comparison evidence only; canonical account
 * balances remain the sole net-worth basis until overlap and currency safety are proven.
 */
export function reconcileCrossDomainState(input: CrossDomainReconciliationInput): CrossDomainReconciliationResult {
  const limitations: string[] = [];
  const transactionLineage = input.transactionLineageComplete && input.transactionAccountCount >= 0;
  const statementCoverage = input.statementAccountCount > 0
    ? Math.min(1, Math.max(0, input.statementTransactionAccountOverlap / input.statementAccountCount))
    : null;

  if (!transactionLineage) limitations.push("Transaction-to-account-to-Item lineage is incomplete; transaction-derived cross-domain conclusions are constrained.");
  if (!input.balanceCurrencySafe) limitations.push("Balance currency is not unambiguous across the reconciled account set; monetary aggregation is withheld.");
  if (input.statementAccountCount > 0 && statementCoverage !== 1) limitations.push("Statement evidence does not cover every account represented by transaction evidence; statement coverage is not treated as dollar reconciliation.");
  if (finite(input.investmentAccountBalance) && finite(input.investmentHoldingValue)) limitations.push("Investment account balances and investment holding values are both observed; holdings are excluded from net worth to prevent double counting.");
  if (finite(input.assetReportValue)) limitations.push("Asset-report values are observed but excluded from net worth because canonical account balances are the non-overlapping basis.");
  if (finite(input.liabilityAccountBalance) && finite(input.liabilityProductBalance)) limitations.push("Liability account and liability-product balances are both observed; the same obligation is not counted twice.");

  const comparability = (accountValue: number | null, productValue: number | null): boolean | null =>
    finite(accountValue) && finite(productValue) ? true : accountValue === null && productValue === null ? null : false;

  const checks = {
    transaction_account_lineage: transactionLineage,
    currency_safe: input.balanceCurrencySafe,
    statement_account_coverage: statementCoverage,
    liability_balance_comparable: comparability(input.liabilityAccountBalance, input.liabilityProductBalance),
    investment_balance_comparable: comparability(input.investmentAccountBalance, input.investmentHoldingValue),
  };

  const hasEvidence = input.accountBalanceCount > 0 || input.transactionAccountCount > 0 || input.statementAccountCount > 0 || finite(input.liabilityProductBalance) || finite(input.investmentHoldingValue) || finite(input.assetReportValue);
  const allCoreChecks = transactionLineage && input.balanceCurrencySafe && (statementCoverage === null || statementCoverage === 1);
  const state: ReconciliationState = !hasEvidence
    ? "insufficient_evidence"
    : allCoreChecks
      ? "reconciled"
      : transactionLineage || input.balanceCurrencySafe
        ? "partially_reconciled"
        : "unreconciled";

  return {
    architecture_version: "IRIS_CROSS_DOMAIN_RECONCILIATION_V1",
    state,
    net_worth_basis: input.balanceCurrencySafe && input.accountBalanceCount > 0 ? "account_balances_only" : "withheld",
    overlap_protection: {
      investment_holdings_excluded_from_net_worth: true,
      asset_report_values_excluded_from_net_worth: true,
      liability_product_values_not_double_counted: true,
    },
    checks,
    limitations: [...new Set(limitations)],
  };
}
