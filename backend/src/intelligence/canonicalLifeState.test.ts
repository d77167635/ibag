import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalLifeState } from "./canonicalLifeState.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

const tx = (overrides: Partial<CanonicalTransaction> = {}): CanonicalTransaction => ({
  id: "tx-1", account_id: "acct-1", amount: 25, posted_date: "2026-09-01", transaction_class: "purchase", classification_evidence: "observed",
  plaid_category_primary: "FOOD_AND_DRINK", plaid_category_detailed: "FOOD_AND_DRINK_RESTAURANT", merchant_id: "m-1", merchant_name: "Observed Merchant",
  subdomain: { key: "food", label: "Food" }, domain: { key: "living", label: "Living" }, ...overrides,
});

test("derives flows, activity density, concentration and relationships from canonical evidence", () => {
  const state = buildCanonicalLifeState([
    tx({ id: "tx-1", amount: 25, posted_date: "2026-08-01" }),
    tx({ id: "tx-2", amount: -100, posted_date: "2026-08-02", transaction_class: "income" }),
    tx({ id: "tx-3", amount: 15, posted_date: "2026-08-04", merchant_id: "m-2", merchant_name: "Second Merchant" }),
  ], "2026-09-10T00:00:00Z");
  assert.equal(state.architecture_version, "IRIS_CANONICAL_LIFE_STATE_V3");
  assert.equal(state.flow.inflow, 100);
  assert.equal(state.flow.outflow, 40);
  assert.equal(state.flow.net, 60);
  assert.equal(state.observation.active_day_count, 3);
  assert.equal(state.observation.span_days, 4);
  assert.equal(state.economic_transaction_count, 3);
  assert.equal(state.merchant_concentration.merchants_observed, 2);
  assert.equal(state.merchant_concentration.top[0]?.label, "Observed Merchant");
  assert.ok(state.relationships.some((r) => r.kind === "account_merchant" && r.transaction_count === 1));
  assert.ok(state.relationships.some((r) => r.kind === "account_transaction_class" && r.to === "transaction_class:purchase"));
  assert.ok(state.relationships.some((r) => r.kind === "account_transaction_class" && r.to === "transaction_class:income"));
  assert.ok(state.entities.some((e) => e.kind === "transaction_class" && e.id === "transaction_class:purchase"));
  assert.ok(state.entities.some((e) => e.kind === "transaction_class" && e.id === "transaction_class:income"));
  assert.ok(state.relationships.every((r) => r.evidence === "calculated"));
});

test("does not convert absent evidence into observed zero", () => {
  const state = buildCanonicalLifeState([], null);
  assert.equal(state.evidence_state, "insufficient_evidence");
  assert.equal(state.flow.evidence, "insufficient_evidence");
  assert.equal(state.flow.basis, null);
  assert.equal(state.observation.activity_density, null);
  assert.equal(state.merchant_concentration.evidence, "insufficient_evidence");
  assert.deepEqual(state.entities, []);
  assert.deepEqual(state.relationships, []);
});

test("preserves unknown transaction classification as an ontology fact without treating it as economic flow", () => {
  const state = buildCanonicalLifeState([
    tx({ amount: 50, transaction_class: "unknown" as CanonicalTransaction["transaction_class"] }),
  ], "2026-09-10T00:00:00Z");
  assert.equal(state.transaction_count, 1);
  assert.equal(state.economic_transaction_count, 0);
  assert.equal(state.flow.evidence, "insufficient_evidence");
  assert.ok(state.entities.some((e) => e.kind === "transaction_class" && e.id === "transaction_class:unknown"));
  assert.ok(state.transaction_class_distribution.some((e) => e.transaction_class === "unknown"));
});
