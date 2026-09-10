import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalLifeState } from "./canonicalLifeState.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

const tx = (overrides: Partial<CanonicalTransaction>): CanonicalTransaction => ({
  id: "tx-1", account_id: "acct-1", amount: 25, posted_date: "2026-09-01", transaction_class: "purchase", classification_evidence: "observed",
  plaid_category_primary: "FOOD_AND_DRINK", plaid_category_detailed: "FOOD_AND_DRINK_RESTAURANT", merchant_id: "m-1", merchant_name: "Observed Merchant",
  subdomain: { key: "food", label: "Food" }, domain: { key: "living", label: "Living" }, ...overrides,
});

test("builds account, merchant, domain and transaction relationships from canonical evidence", () => {
  const state = buildCanonicalLifeState([
    tx({ id: "tx-1", amount: 25, posted_date: "2026-08-01" }),
    tx({ id: "tx-2", amount: 35, posted_date: "2026-09-01", merchant_id: "m-2", merchant_name: "Second Merchant" }),
  ], "2026-09-10T00:00:00Z");
  assert.equal(state.evidence_state, "calculated");
  assert.equal(state.transaction_count, 2);
  assert.equal(state.topology.accounts, 1);
  assert.equal(state.topology.merchants, 2);
  assert.ok(state.relationships.some((r) => r.kind === "account_merchant" && r.transaction_count === 1));
  assert.ok(state.relationships.every((r) => r.evidence === "calculated"));
});

test("does not invent an ontology when canonical evidence is absent", () => {
  const state = buildCanonicalLifeState([], null);
  assert.equal(state.evidence_state, "insufficient_evidence");
  assert.equal(state.entity_count, 0);
  assert.equal(state.relationship_count, 0);
});
