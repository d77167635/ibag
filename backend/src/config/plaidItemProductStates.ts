/**
 * Canonical Plaid Item product-state identifiers documented by Plaid.
 *
 * IMPORTANT: membership here means Plaid documents the identifier in Item
 * product state fields. It does NOT mean the product is available, entitled,
 * consented, billed, active, or actually observed for an iBag user.
 *
 * Source of truth: Plaid Item API documentation. Keep this list synchronized
 * when Plaid changes the API contract.
 */
export const PLAID_ITEM_PRODUCT_STATES = [
  "assets",
  "auth",
  "balance",
  "balance_plus",
  "beacon",
  "identity",
  "identity_match",
  "investments",
  "investments_auth",
  "liabilities",
  "payment_initiation",
  "identity_verification",
  "transactions",
  "credit_details",
  "income",
  "income_verification",
  "standing_orders",
  "transfer",
  "employment",
  "recurring_transactions",
  "transactions_refresh",
  "signal",
  "statements",
  "processor_payments",
  "processor_identity",
  "profile",
  "cra_base_report",
  "cra_income_insights",
  "cra_partner_insights",
  "cra_network_insights",
  "cra_cashflow_insights",
  "cra_monitoring",
  "cra_lend_score",
  "cra_plaid_credit_score",
  "cra_qualify",
  "cra_home_lending",
  "layer",
  "pay_by_bank",
  "protect_linked_bank",
  "protect_transactions",
] as const;

export type PlaidItemProductState = typeof PLAID_ITEM_PRODUCT_STATES[number];

const ITEM_PRODUCT_STATE_SET = new Set<string>(PLAID_ITEM_PRODUCT_STATES);

export function isPlaidItemProductState(value: string): value is PlaidItemProductState {
  return ITEM_PRODUCT_STATE_SET.has(value);
}

export function normalizePlaidItemProductStates(values: unknown): PlaidItemProductState[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === "string" && isPlaidItemProductState(value)))];
}
