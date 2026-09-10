import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTABLE_CAPABILITY_OPERATORS, getCapabilityOperator } from "./capabilityOperators.js";

test("executable registry contains exactly the governed capability universe", () => {
  const expected = ["temporal", "analysis", "behavioral", "pattern", "relationship", "anomaly", "causal", "predictive", "scenario", "decision", "recommendation", "outcome", "learning", "emergent"];
  assert.deepEqual(EXECUTABLE_CAPABILITY_OPERATORS.map(x => x.capability_id), expected);
});

test("planned capabilities are never reported as implemented", () => {
  for (const operator of EXECUTABLE_CAPABILITY_OPERATORS) {
    assert.ok(operator.status === "implemented" || operator.status === "planned");
    if (operator.status === "planned") assert.equal(getCapabilityOperator(operator.capability_id)?.status, "planned");
  }
});

test("implemented operators are backed by explicit runtime operator identities", () => {
  const implemented = EXECUTABLE_CAPABILITY_OPERATORS.filter(x => x.status === "implemented");
  assert.deepEqual(implemented.map(x => x.capability_id), ["temporal", "analysis", "behavioral", "pattern", "relationship", "anomaly", "causal", "predictive", "scenario", "decision", "recommendation", "outcome", "learning", "emergent"]);
  for (const operator of implemented) {
    assert.equal(operator.operator_id, operator.capability_id);
    assert.match(operator.version, /^\d+\.\d+\.\d+$/);
    assert.notEqual(operator.evidence_state, "OBSERVED");
    assert.ok(operator.execution_stage.length > 0);
  }
});
