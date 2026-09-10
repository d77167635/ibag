import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildDebtPaymentIntelligence } from "./debtPaymentIntelligence.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

const tx = (overrides: Partial<CanonicalTransaction> = {}): CanonicalTransaction => ({
  id: "tx-1",
  account_id: "acct-1",
  amount: 100,
  posted_date: "2026-01-01",
  transaction_class: "debt_payment",
  classification_evidence: "observed",
  plaid_category_primary: null,
  plaid_category_detailed: null,
  merchant_id: "debt-source-1",
  merchant_name: "Observed Debt Source",
  subdomain: null,
  domain: null,
  ...overrides,
});

test("debt payment intelligence calculates observed cadence, source concentration, and amount trend", () => {
  const state = buildDebtPaymentIntelligence([
    tx({ id: "d1", amount: 100, posted_date: "2026-01-01" }),
    tx({ id: "d2", amount: 110, posted_date: "2026-01-15" }),
    tx({ id: "d3", amount: 120, posted_date: "2026-01-29" }),
    tx({ id: "d4", amount: 130, posted_date: "2026-02-12" }),
  ]);

  assert.equal(state.evidence_state, "calculated");
  assert.equal(state.transaction_count, 4);
  assert.equal(state.total_observed_debt_payments, 460);
  assert.equal(state.payment_sources[0]?.share_of_observed_payments, 1);
  assert.equal(state.cadence.median_gap_days, 14);
  assert.equal(state.cadence.gap_mad_days, 0);
  assert.equal(state.cadence.regularity, "high");
  assert.equal(state.cadence.modeled_next_date, "2026-02-26");
  assert.equal(state.trend.direction, "increasing");
  assert.equal(state.trend.recent_average_amount, 125);
});

test("debt payment intelligence fails closed when debt-payment evidence is absent", () => {
  const state = buildDebtPaymentIntelligence([
    tx({ transaction_class: "purchase" }),
  ]);
  assert.equal(state.evidence_state, "insufficient_evidence");
  assert.equal(state.total_observed_debt_payments, null);
  assert.deepEqual(state.payment_sources, []);
});

test("debt payment intelligence does not infer balance, APR, due date, or payoff", () => {
  const state = buildDebtPaymentIntelligence([
    tx({ id: "d1", amount: 100, posted_date: "2026-01-01" }),
    tx({ id: "d2", amount: 100, posted_date: "2026-02-01" }),
    tx({ id: "d3", amount: 100, posted_date: "2026-03-01" }),
  ]);
  assert.ok(state.limitations.some(value => value.includes("outstanding debt")));
  assert.ok(state.limitations.some(value => value.includes("APR")));
  assert.ok(state.limitations.some(value => value.includes("due date")));
  assert.ok(state.limitations.some(value => value.includes("payoff date")));
});
