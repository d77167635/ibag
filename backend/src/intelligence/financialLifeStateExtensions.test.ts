import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildIncomeIntelligence, buildRecurrenceIntelligence } from "./financialLifeStateExtensions.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

const tx = (overrides: Partial<CanonicalTransaction> = {}): CanonicalTransaction => ({
  id: "tx-1",
  account_id: "acct-1",
  amount: 100,
  posted_date: "2026-01-01",
  transaction_class: "purchase",
  classification_evidence: "observed",
  plaid_category_primary: null,
  plaid_category_detailed: null,
  merchant_id: "merchant-1",
  merchant_name: "Observed Merchant",
  subdomain: null,
  domain: null,
  ...overrides,
});

test("income intelligence is derived only from observed canonical income inflows", () => {
  const state = buildIncomeIntelligence([
    tx({ id: "income-1", amount: -1200, transaction_class: "income", posted_date: "2026-01-01", merchant_name: "Observed Income Source" }),
    tx({ id: "income-2", amount: -1300, transaction_class: "income", posted_date: "2026-01-15", merchant_name: "Observed Income Source" }),
    tx({ id: "purchase-1", amount: 80, transaction_class: "purchase" }),
  ]);

  assert.equal(state.evidence_state, "calculated");
  assert.equal(state.transaction_count, 2);
  assert.equal(state.total_observed_income, 2500);
  assert.equal(state.active_income_days, 2);
  assert.equal(state.income_sources[0]?.label, "Observed Income Source");
  assert.equal(state.income_sources[0]?.share_of_observed_income, 1);
});

test("recurrence intelligence identifies repeated intervals without calling them obligations", () => {
  const state = buildRecurrenceIntelligence([
    tx({ id: "r1", posted_date: "2026-01-01", amount: 50 }),
    tx({ id: "r2", posted_date: "2026-01-15", amount: 52 }),
    tx({ id: "r3", posted_date: "2026-01-29", amount: 49 }),
  ]);

  assert.equal(state.evidence_state, "calculated");
  assert.equal(state.candidate_count, 1);
  assert.equal(state.candidates[0]?.median_gap_days, 14);
  assert.equal(state.candidates[0]?.first_observed_date, "2026-01-01");
  assert.equal(state.candidates[0]?.last_observed_date, "2026-01-29");
  assert.equal(state.candidates[0]?.modeled_next_date, "2026-02-12");
  assert.equal(state.candidates[0]?.transaction_class, "purchase");
  assert.equal(state.obligation_candidate_count, 1);
  assert.equal(state.obligation_candidates[0]?.candidate_strength, "high");
  assert.equal(state.obligation_candidates[0]?.modeled_next_date, "2026-02-12");
});

test("recurrence intelligence remains evidence-limited with too few observations", () => {
  const state = buildRecurrenceIntelligence([
    tx({ id: "one", posted_date: "2026-01-01" }),
    tx({ id: "two", posted_date: "2026-01-15" }),
  ]);

  assert.equal(state.evidence_state, "insufficient_evidence");
  assert.equal(state.candidate_count, 0);
  assert.equal(state.obligation_candidate_count, 0);
  assert.deepEqual(state.candidates, []);
  assert.deepEqual(state.obligation_candidates, []);
});
