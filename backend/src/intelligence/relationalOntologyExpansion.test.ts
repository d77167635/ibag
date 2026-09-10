import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRelationalOntologyExpansion } from "./relationalOntologyExpansion.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

function tx(overrides: Partial<CanonicalTransaction> = {}): CanonicalTransaction {
  return {
    id: "tx-1",
    account_id: "acct-1",
    merchant_id: "merchant-1",
    merchant_name: "Merchant One",
    amount: 25,
    posted_date: "2026-01-15",
    pending: false,
    transaction_class: "purchase",
    plaid_category_primary: "FOOD_AND_DRINK",
    plaid_category_detailed: "FOOD_AND_DRINK_GROCERIES",
    domain: { key: "essentials", label: "Essentials" },
    subdomain: { key: "groceries", label: "Groceries" },
    ...overrides,
  } as CanonicalTransaction;
}

test("builds multiple relational dimensions from one canonical observation", () => {
  const relations = buildRelationalOntologyExpansion([tx()]);
  const relationKinds = new Set(relations.map(relation => relation.relation));

  assert.equal(relationKinds.has("merchant_category"), true);
  assert.equal(relationKinds.has("merchant_subdomain"), true);
  assert.equal(relationKinds.has("account_domain"), true);
  assert.equal(relationKinds.has("account_category"), true);
  assert.equal(relationKinds.has("merchant_temporal"), true);
  assert.equal(relations.every(relation => relation.evidence === "calculated"), true);
  assert.equal(relations.every(relation => relation.observed_amount === 25), true);
});

test("does not invent relationships when identifying dimensions are absent", () => {
  const relations = buildRelationalOntologyExpansion([tx({ merchant_id: null, merchant_name: null, domain: undefined, subdomain: undefined, plaid_category_detailed: null, plaid_category_primary: null })]);
  assert.deepEqual(relations.map(relation => relation.relation), ["account_transaction_class"]);
});
