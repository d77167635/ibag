export type FinancialCompositionStatus = "reconciled" | "warning" | "failed";

export interface AccountBalanceComponent {
  account_id: string;
  item_id: string;
  account_type: string;
  current_balance: number;
  currency?: string | null;
}

export interface InvestmentHoldingValue {
  holding_id: string;
  account_id?: string | null;
  market_value?: number | null;
  currency?: string | null;
}

export interface LiabilityValue {
  liability_id: string;
  account_id?: string | null;
  balance?: number | null;
  currency?: string | null;
}

export interface AssetReportValue {
  asset_id: string;
  account_id?: string | null;
  value?: number | null;
  currency?: string | null;
}

export interface FinancialCompositionReconciliation {
  status: FinancialCompositionStatus;
  net_worth_basis: "account_balances_only" | "insufficient_evidence";
  liquid_assets: number | null;
  investment_accounts: number | null;
  debt_accounts: number | null;
  net_worth: number | null;
  investment_holdings_value: number | null;
  liability_product_value: number | null;
  asset_report_value: number | null;
  currencies: string[];
  duplicate_account_ids: string[];
  invalid_account_ids: string[];
  investment_account_overlap: string[];
  liability_account_overlap: string[];
  asset_account_overlap: string[];
  double_counting_risk: boolean;
  limitations: string[];
}

/**
 * Reconciles financial composition without treating overlapping provider products
 * as additive. Account balances are the sole net-worth basis here; specialized
 * holdings, liability and asset-report values are retained as corroborating
 * domains until explicit identity/valuation reconciliation exists.
 */
export function reconcileFinancialComposition(
  accounts: AccountBalanceComponent[],
  holdings: InvestmentHoldingValue[],
  liabilities: LiabilityValue[],
  assets: AssetReportValue[],
): FinancialCompositionReconciliation {
  const duplicateAccountIds = [...new Set(accounts.map((row) => row.account_id).filter((id, index, all) => all.indexOf(id) !== index))].sort();
  const invalidAccountIds = [...new Set(accounts.filter((row) => !Number.isFinite(row.current_balance)).map((row) => row.account_id))].sort();
  const currencies = [...new Set(accounts.map((row) => row.currency).filter((value): value is string => Boolean(value)).map((value) => value.toUpperCase()))].sort();
  const currencySafe = currencies.length <= 1;
  const depository = accounts.filter((row) => row.account_type.toLowerCase() === "depository");
  const investments = accounts.filter((row) => row.account_type.toLowerCase() === "investment");
  const debt = accounts.filter((row) => ["credit", "loan"].includes(row.account_type.toLowerCase()));
  const sum = (rows: Array<{ current_balance: number }>) => rows.length ? rows.reduce((total, row) => total + row.current_balance, 0) : null;
  const liquidAssets = currencySafe && invalidAccountIds.length === 0 ? sum(depository) : null;
  const investmentAccounts = currencySafe && invalidAccountIds.length === 0 ? sum(investments) : null;
  const debtAccounts = currencySafe && invalidAccountIds.length === 0 ? sum(debt) : null;
  const netWorth = currencySafe && invalidAccountIds.length === 0 && accounts.length > 0 ? (liquidAssets ?? 0) + (investmentAccounts ?? 0) - (debtAccounts ?? 0) : null;

  const accountIds = new Set(accounts.map((row) => row.account_id));
  const investmentAccountOverlap = holdings.filter((row) => row.account_id && accountIds.has(row.account_id)).map((row) => row.holding_id).sort();
  const liabilityAccountOverlap = liabilities.filter((row) => row.account_id && accountIds.has(row.account_id)).map((row) => row.liability_id).sort();
  const assetAccountOverlap = assets.filter((row) => row.account_id && accountIds.has(row.account_id)).map((row) => row.asset_id).sort();
  const numberSum = (values: Array<number | null | undefined>) => {
    const present = values.filter((value): value is number => value != null && Number.isFinite(value));
    return present.length ? present.reduce((total, value) => total + value, 0) : null;
  };

  const limitations = [
    "Account balances are the only additive net-worth basis in this reconciliation; specialized provider values are not added to avoid double counting.",
    "Holding, liability-product, and asset-report values are corroborating observations until explicit provider-object identity and valuation-period reconciliation is available.",
    "A net-worth value is not certified across mixed currencies; currency conversion is not performed at this boundary.",
    "Non-finite account balances are never aggregated into financial composition.",
  ];
  const doubleCountingRisk = duplicateAccountIds.length > 0 || investmentAccountOverlap.length > 0 || liabilityAccountOverlap.length > 0 || assetAccountOverlap.length > 0;
  const failed = duplicateAccountIds.length > 0 || invalidAccountIds.length > 0;
  const warning = !currencySafe || doubleCountingRisk || accounts.length === 0;

  return {
    status: failed ? "failed" : warning ? "warning" : "reconciled",
    net_worth_basis: netWorth == null ? "insufficient_evidence" : "account_balances_only",
    liquid_assets: liquidAssets,
    investment_accounts: investmentAccounts,
    debt_accounts: debtAccounts,
    net_worth: netWorth,
    investment_holdings_value: numberSum(holdings.map((row) => row.market_value)),
    liability_product_value: numberSum(liabilities.map((row) => row.balance)),
    asset_report_value: numberSum(assets.map((row) => row.value)),
    currencies,
    duplicate_account_ids: duplicateAccountIds,
    invalid_account_ids: invalidAccountIds,
    investment_account_overlap: investmentAccountOverlap,
    liability_account_overlap: liabilityAccountOverlap,
    asset_account_overlap: assetAccountOverlap,
    double_counting_risk: doubleCountingRisk,
    limitations,
  };
}