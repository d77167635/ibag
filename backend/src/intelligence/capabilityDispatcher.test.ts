import test from "node:test";
import assert from "node:assert/strict";
import { getCapabilityOperator } from "./capabilityOperators.js";

test("implemented capabilities are explicitly runtime-wired", () => {
  for (const capabilityId of ["temporal", "behavioral", "anomaly", "relationship"]) {
    const operator = getCapabilityOperator(capabilityId);
    assert.ok(operator);
    assert.equal(operator.status, "implemented");
    assert.ok(operator.operator_id);
    assert.ok(operator.version);
  }
});

test("future capabilities remain truthful until independently wired", () => {
  for (const capabilityId of ["analysis", "pattern", "causal", "predictive", "scenario", "decision", "recommendation", "outcome", "learning", "emergent"]) {
    const operator = getCapabilityOperator(capabilityId);
    assert.ok(operator);
    assert.equal(operator.status, "planned");
  }
});
