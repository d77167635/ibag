import test from "node:test";
import assert from "node:assert/strict";
import { PLAID_PRODUCT_CATALOG_V2 } from "./plaidProductCatalogV2.js";

test("expanded Plaid catalog has unique stable capability keys", () => {
  const keys = PLAID_PRODUCT_CATALOG_V2.map((product) => product.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.length >= 40);
});

test("Europe payment public capabilities remain cataloged without fake Item-state evidence", () => {
  for (const key of ["virtual_accounts", "payouts", "variable_recurring_payments"]) {
    const product = PLAID_PRODUCT_CATALOG_V2.find((entry) => entry.key === key);
    assert.ok(product, `missing catalog capability: ${key}`);
    assert.deepEqual(product.plaidProductStates, []);
  }
});

test("money-movement capabilities remain outside Phase 1 intelligence use", () => {
  for (const key of ["payment_initiation", "virtual_accounts", "payouts", "variable_recurring_payments", "pay_by_bank"]) {
    const product = PLAID_PRODUCT_CATALOG_V2.find((entry) => entry.key === key);
    assert.ok(product, `missing payment capability: ${key}`);
    assert.equal(product.phase1Relevant, false);
  }
});
