import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAID_CAPABILITY_REGISTRY,
  PLAID_ITEM_STATE_COVERAGE,
  PLAID_UNMAPPED_ITEM_STATES,
} from "./plaidCapabilityRegistry.js";
import { isPlaidItemProductState, PLAID_ITEM_PRODUCT_STATES } from "./plaidItemProductStates.js";

test("every documented Plaid Item product state has at least one catalog capability", () => {
  assert.equal(PLAID_UNMAPPED_ITEM_STATES.length, 0);
  assert.equal(PLAID_ITEM_STATE_COVERAGE.length, PLAID_ITEM_PRODUCT_STATES.length);

  for (const entry of PLAID_ITEM_STATE_COVERAGE) {
    assert.ok(isPlaidItemProductState(entry.state));
    assert.ok(entry.catalogKeys.length > 0, `unmapped Plaid Item product state: ${entry.state}`);
  }
});

test("catalog state references are valid Plaid Item product states", () => {
  for (const capability of PLAID_CAPABILITY_REGISTRY) {
    for (const state of capability.plaidProductStates) {
      assert.ok(isPlaidItemProductState(state), `${capability.key} references unknown Item state: ${state}`);
    }
  }
});

test("Item state coverage preserves one-to-many capability relationships", () => {
  const sharedState = PLAID_ITEM_STATE_COVERAGE.find((entry) => entry.catalogKeys.length > 1);
  assert.ok(sharedState, "expected at least one documented Item state to map to multiple catalog capabilities");
});
