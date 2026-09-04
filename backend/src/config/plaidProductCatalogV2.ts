import { PLAID_PRODUCT_CATALOG as BASE_CATALOG, type PlaidProductDefinition } from "./plaidProductCatalog.js";

/**
 * Extended Plaid capability catalog.
 *
 * Item product-state identifiers are authoritative only for runtime state;
 * public Plaid services are cataloged separately and are never treated as
 * observed merely because they exist in this registry.
 */
const ADDITIONAL_PRODUCTS: readonly PlaidProductDefinition[] = [
  {
    key: "identity_match", displayName: "Identity Match", category: "payments",
    description: "Match bank account owner information with identity data.", phase1Relevant: false,
    irisCapabilities: ["account_identity", "ownership_evidence", "risk"], plaidProductStates: ["identity_match"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "payment_initiation", displayName: "Payment Initiation", category: "payments",
    description: "Initiate supported bank payments through Plaid payment rails where enabled.", phase1Relevant: false,
    irisCapabilities: ["money_movement"], plaidProductStates: ["payment_initiation"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "beacon", displayName: "Beacon", category: "fraud_risk",
    description: "Plaid network identity and fraud-prevention capabilities where enabled.", phase1Relevant: false,
    irisCapabilities: ["fraud_risk", "identity", "network_signals"], plaidProductStates: ["beacon"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "employment", displayName: "Employment", category: "lending",
    description: "Supported employment-related financial verification data.", phase1Relevant: false,
    irisCapabilities: ["income", "stability", "employment"], plaidProductStates: ["employment"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "standing_orders", displayName: "Standing Orders", category: "payments",
    description: "Supported recurring bank-order information.", phase1Relevant: true,
    irisCapabilities: ["recurring", "bills", "cash_flow", "forecasting"], plaidProductStates: ["standing_orders"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "transactions_refresh", displayName: "Transactions Refresh", category: "financial_management",
    description: "Refresh transaction data for supported Items.", phase1Relevant: true,
    irisCapabilities: ["freshness", "spending", "cash_flow"], plaidProductStates: ["transactions_refresh"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "recurring_transactions", displayName: "Recurring Transactions", category: "financial_management",
    description: "Identify recurring transaction streams.", phase1Relevant: true,
    irisCapabilities: ["recurring", "bills", "cash_flow", "forecasting"], plaidProductStates: ["recurring_transactions"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "profile", displayName: "Profile", category: "open_finance",
    description: "Permissioned profile and financial-data context for supported integrations.", phase1Relevant: true,
    irisCapabilities: ["profile", "data_relationships", "permissioned_data"], plaidProductStates: ["profile"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "consumer_report", displayName: "Consumer Report by Plaid Check", category: "lending",
    description: "Permissioned financial, income, cash-flow and risk reporting through Plaid Check.", phase1Relevant: true,
    irisCapabilities: ["financial_state", "income", "cash_flow", "stability", "risk", "forecasting", "credit"],
    plaidProductStates: ["cra_base_report", "cra_income_insights", "cra_cashflow_insights", "cra_network_insights", "cra_partner_insights", "cra_monitoring", "cra_lend_score", "cra_plaid_credit_score", "cra_qualify", "cra_home_lending"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "cash_flow_insights", displayName: "Cash Flow Insights", category: "lending",
    description: "Plaid Check cash-flow insights derived from permissioned financial data.", phase1Relevant: true,
    irisCapabilities: ["cash_flow", "stability", "risk", "forecasting"], plaidProductStates: ["cra_cashflow_insights"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "income_insights", displayName: "Income Insights", category: "lending",
    description: "Plaid Check income insights where enabled.", phase1Relevant: true,
    irisCapabilities: ["income", "stability", "timing", "forecasting"], plaidProductStates: ["cra_income_insights"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "network_insights", displayName: "Network Insights", category: "lending",
    description: "Plaid Check network-derived insights where permitted.", phase1Relevant: false,
    irisCapabilities: ["risk", "data_relationships"], plaidProductStates: ["cra_network_insights"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "partner_insights", displayName: "Partner Insights", category: "lending",
    description: "Plaid Check partner-derived insights for supported use cases.", phase1Relevant: false,
    irisCapabilities: ["cash_flow", "risk"], plaidProductStates: ["cra_partner_insights"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "plaid_check_lend_score", displayName: "Plaid Check LendScore", category: "lending",
    description: "Plaid Check lending risk signal.", phase1Relevant: false,
    irisCapabilities: ["credit_risk", "risk"], plaidProductStates: ["cra_lend_score"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "plaid_credit_score", displayName: "Plaid Credit Score", category: "lending",
    description: "Plaid credit-score capability where enabled.", phase1Relevant: false,
    irisCapabilities: ["credit", "credit_risk", "risk"], plaidProductStates: ["cra_plaid_credit_score"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "qualify", displayName: "Qualify", category: "lending",
    description: "Plaid lending qualification capability where enabled.", phase1Relevant: false,
    irisCapabilities: ["credit", "underwriting", "risk"], plaidProductStates: ["cra_qualify"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "processor_payments", displayName: "Processor Payments", category: "payments",
    description: "Processor-oriented payment connectivity for supported integrations.", phase1Relevant: false,
    irisCapabilities: ["payment_data", "money_movement"], plaidProductStates: ["processor_payments"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "processor_identity", displayName: "Processor Identity", category: "payments",
    description: "Processor-oriented identity data for supported integrations.", phase1Relevant: false,
    irisCapabilities: ["account_identity", "identity"], plaidProductStates: ["processor_identity"], pricing: "included_unless_plaid_charges",
  },
  {
    key: "pay_by_bank", displayName: "Pay by Bank", category: "payments",
    description: "Bank-payment checkout capabilities where supported.", phase1Relevant: false,
    irisCapabilities: ["payments", "money_movement"], plaidProductStates: ["pay_by_bank"], pricing: "included_unless_plaid_charges",
  },
];

/** Complete application capability catalog; runtime state remains authoritative. */
export const PLAID_PRODUCT_CATALOG_V2: readonly PlaidProductDefinition[] = [...BASE_CATALOG, ...ADDITIONAL_PRODUCTS];
