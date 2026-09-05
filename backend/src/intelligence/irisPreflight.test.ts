import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisPreflight } from "./irisPreflight.js";

test("Iris authorizes downstream intelligence only after a certified evidence boundary", () => {
  const result = buildIrisPreflight({
    status: "pass",
    ready_for_higher_order_intelligence: true,
    eight_domain_items: ["item-1"],
    checks: [],
  }, "2026-09-05T21:00:00.000Z");
  assert.equal(result.status, "authorized");
  assert.equal(result.execute_downstream_intelligence, true);
  assert.equal(result.allow_higher_order_intelligence, true);
  assert.equal(result.selected_item_id, "item-1");
});

test("Iris constrains higher-order intelligence when the same-Item gate is not ready", () => {
  const result = buildIrisPreflight({
    status: "warn",
    ready_for_higher_order_intelligence: false,
    eight_domain_items: [],
    checks: [],
  }, "2026-09-05T21:00:00.000Z");
  assert.equal(result.status, "constrained");
  assert.equal(result.execute_downstream_intelligence, true);
  assert.equal(result.allow_higher_order_intelligence, false);
  assert.ok(result.constraints.length > 0);
});

test("Iris blocks execution on a hard source-integrity failure", () => {
  const result = buildIrisPreflight({
    status: "fail",
    ready_for_higher_order_intelligence: false,
    eight_domain_items: [],
    checks: [{ id: "transaction_raw_lineage", severity: "fail" }],
  }, "2026-09-05T21:00:00.000Z");
  assert.equal(result.status, "blocked");
  assert.equal(result.execute_downstream_intelligence, false);
});
