import test from "node:test";
import assert from "node:assert/strict";
import { IRIS_STANDARD_CAPABILITY_IDS, getIrisCatalogCapability } from "./irisCatalog.js";
import { IRIS_CATALOG_EXPANSION } from "./irisCatalogExpansion.js";

test("Iris Standard has exactly the canonical ten capability preferences", () => {
  assert.equal(IRIS_STANDARD_CAPABILITY_IDS.length, 10);
  assert.deepEqual([...IRIS_STANDARD_CAPABILITY_IDS], [
    "roundups",
    "financial-state",
    "cash-flow",
    "spending",
    "liquidity",
    "debt",
    "forecast",
    "recurrence",
    "causality",
    "decision-lab",
  ]);
});

test("every standard capability is resolvable from the complete catalog surface", () => {
  for (const id of IRIS_STANDARD_CAPABILITY_IDS) {
    assert.ok(getIrisCatalogCapability(id) || IRIS_CATALOG_EXPANSION.some((capability) => capability.id === id), `missing standard capability: ${id}`);
  }
});

test("standard capability selection is a preference baseline rather than an intelligence ceiling", () => {
  assert.ok(!IRIS_STANDARD_CAPABILITY_IDS.includes("maximum-intelligence"));
  assert.ok(getIrisCatalogCapability("maximum-intelligence"));
});
