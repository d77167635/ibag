export type PlaidProductCategory =
  | "payments"
  | "fraud_risk"
  | "financial_management"
  | "lending"
  | "open_finance"
  | "onboarding";

export interface PlaidProductDefinition {
  key: string;
  displayName: string;
  category: PlaidProductCategory;
  description: string;
  phase1Relevant: boolean;
  irisCapabilities: string[];
  plaidProductStates: string[];
  pricing: "included_unless_plaid_charges";
}

/**
 * Authoritative application catalog of Plaid's currently published product
 * surface. Product availability, consent and billing remain runtime facts;
 * this catalog describes what each capability can mean to iBag.
 *
 * Do not use this list as proof that a product is available for an Item.
 * Runtime Item state must come from Plaid and must be intersected with the
 * user's iBag plan entitlement before Iris can select or request it.
 */
export const PLAID_PRODUCT_CATALOG: readonly PlaidProductDefinition[] = [
  {
    key: "auth",
    displayName: "Auth",
    category: "payments",
    description: "Verify bank account and routing numbers.",
    phase1Relevant: true,
    irisCapabilities: ["account_verification", "account_linkage", "cash_flow"],
    plaidProductStates: ["auth"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "signal",
    displayName: "Signal",
    category: "payments",
    description: "Predict ACH return risk and payment reliability signals.",
    phase1Relevant: false,
    irisCapabilities: ["payment_risk", "risk"],
    plaidProductStates: ["signal"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "identity",
    displayName: "Identity",
    category: "payments",
    description: "Match bank-account ownership information.",
    phase1Relevant: false,
    irisCapabilities: ["account_identity", "ownership_evidence"],
    plaidProductStates: ["identity"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "balance",
    displayName: "Balance",
    category: "payments",
    description: "Retrieve real-time account balance information.",
    phase1Relevant: true,
    irisCapabilities: ["liquidity", "cash_flow", "financial_state", "available_funds"],
    plaidProductStates: ["balance", "balance_plus"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "transfer",
    displayName: "Transfer",
    category: "payments",
    description: "Process bank payments through supported payment rails.",
    phase1Relevant: false,
    irisCapabilities: ["money_movement"],
    plaidProductStates: ["transfer"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "investments_move",
    displayName: "Investments Move",
    category: "payments",
    description: "Support investment-account transfers.",
    phase1Relevant: false,
    irisCapabilities: ["investment_transfer"],
    plaidProductStates: ["investments_move"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "protect",
    displayName: "Protect",
    category: "fraud_risk",
    description: "Detect and respond to fraud risk.",
    phase1Relevant: true,
    irisCapabilities: ["fraud_risk", "account_risk", "risk"],
    plaidProductStates: ["protect_linked_bank", "protect_transactions"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "identity_verification",
    displayName: "Identity Verification",
    category: "fraud_risk",
    description: "Verify identity during financial onboarding.",
    phase1Relevant: false,
    irisCapabilities: ["identity_verification", "onboarding_risk"],
    plaidProductStates: ["identity_verification"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "cash_advance_index",
    displayName: "Cash Advance Index",
    category: "fraud_risk",
    description: "Provide repayment-likelihood signals for cash advances.",
    phase1Relevant: false,
    irisCapabilities: ["repayment_risk"],
    plaidProductStates: ["cash_advance_index"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "monitor",
    displayName: "Monitor",
    category: "fraud_risk",
    description: "Automate AML watchlist screening.",
    phase1Relevant: false,
    irisCapabilities: ["compliance_risk", "monitoring"],
    plaidProductStates: ["monitor"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "transactions",
    displayName: "Transactions",
    category: "financial_management",
    description: "Access categorized transaction history and updates.",
    phase1Relevant: true,
    irisCapabilities: ["spending", "cash_flow", "behavior", "patterns", "roundups", "forecasting", "merchant_analysis"],
    plaidProductStates: ["transactions", "transactions_refresh"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "investments",
    displayName: "Investments",
    category: "financial_management",
    description: "Retrieve investment accounts, holdings and investment transactions.",
    phase1Relevant: true,
    irisCapabilities: ["investments", "portfolio", "net_worth", "performance", "financial_state"],
    plaidProductStates: ["investments", "investments_auth"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "liabilities",
    displayName: "Liabilities",
    category: "financial_management",
    description: "Surface credit-card, mortgage and loan data.",
    phase1Relevant: true,
    irisCapabilities: ["debt", "credit", "interest_cost", "net_worth", "cash_flow", "risk"],
    plaidProductStates: ["liabilities", "credit_details"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "enrich",
    displayName: "Enrich",
    category: "financial_management",
    description: "Standardize and categorize transaction data.",
    phase1Relevant: true,
    irisCapabilities: ["classification", "merchant", "category", "behavior"],
    plaidProductStates: ["enrich"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "assets",
    displayName: "Assets",
    category: "financial_management",
    description: "Provide asset and financial-document data for supported use cases.",
    phase1Relevant: true,
    irisCapabilities: ["assets", "net_worth", "financial_state", "history"],
    plaidProductStates: ["assets"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "income",
    displayName: "Income",
    category: "financial_management",
    description: "Provide bank-derived income information.",
    phase1Relevant: true,
    irisCapabilities: ["income", "cash_flow", "forecasting", "stability", "timing"],
    plaidProductStates: ["income", "income_verification"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "statements",
    displayName: "Statements",
    category: "financial_management",
    description: "Provide financial statement information for supported institutions.",
    phase1Relevant: true,
    irisCapabilities: ["history", "evidence", "reconciliation", "document_context"],
    plaidProductStates: ["statements"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "income_verification",
    displayName: "Income Verification",
    category: "lending",
    description: "Verify income using real-time bank data.",
    phase1Relevant: false,
    irisCapabilities: ["income_verification", "income", "stability"],
    plaidProductStates: ["income_verification"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "underwriting",
    displayName: "Underwriting",
    category: "lending",
    description: "Use cash-flow data for credit underwriting decisions.",
    phase1Relevant: false,
    irisCapabilities: ["underwriting", "cash_flow_risk"],
    plaidProductStates: ["underwriting"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "lendscore",
    displayName: "LendScore",
    category: "lending",
    description: "Provide an additional lending risk score.",
    phase1Relevant: false,
    irisCapabilities: ["credit_risk", "risk"],
    plaidProductStates: ["cra_lend_score"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "core_exchange",
    displayName: "Core Exchange",
    category: "open_finance",
    description: "Enable standardized permissioned financial-data exchange.",
    phase1Relevant: true,
    irisCapabilities: ["data_exchange", "data_coverage", "permissioned_data"],
    plaidProductStates: ["core_exchange"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "app_directory",
    displayName: "App Directory",
    category: "open_finance",
    description: "Provide visibility into connected applications.",
    phase1Relevant: true,
    irisCapabilities: ["connected_apps", "data_relationships", "permissions_context"],
    plaidProductStates: ["app_directory"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "permissions_manager",
    displayName: "Permissions Manager",
    category: "open_finance",
    description: "Control and audit financial-data access permissions.",
    phase1Relevant: true,
    irisCapabilities: ["consent", "permissions", "data_governance", "trust"],
    plaidProductStates: ["permissions_manager"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "layer",
    displayName: "Layer",
    category: "onboarding",
    description: "Capture identity, contact and bank information in a unified onboarding flow.",
    phase1Relevant: false,
    irisCapabilities: ["onboarding", "identity", "account_linkage"],
    plaidProductStates: ["layer"],
    pricing: "included_unless_plaid_charges",
  },
  {
    key: "plaid_link",
    displayName: "Plaid Link",
    category: "onboarding",
    description: "Connect users to supported financial institutions.",
    phase1Relevant: true,
    irisCapabilities: ["institution_connection", "consent", "account_linkage"],
    plaidProductStates: ["link"],
    pricing: "included_unless_plaid_charges",
  },
] as const;

export const PLAID_PRODUCT_BY_KEY = new Map(
  PLAID_PRODUCT_CATALOG.map((product) => [product.key, product]),
);

export const PLAID_PRODUCT_STATE_TO_CATALOG_KEY = new Map<string, string>();
for (const product of PLAID_PRODUCT_CATALOG) {
  for (const state of product.plaidProductStates) {
    PLAID_PRODUCT_STATE_TO_CATALOG_KEY.set(state, product.key);
  }
}
