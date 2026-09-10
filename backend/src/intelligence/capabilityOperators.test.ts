import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTABLE_CAPABILITY_OPERATORS, getCapabilityOperator } from "./capabilityOperators.js";

test("executable registry contains exactly the governed capability universe", () => {
  const expected = ["temporal", "financial_life_state", "relational_ontology", "analysis", "behavioral", "pattern", "relationship", "anomaly", "causal", "predictive", "scenario", "decision", "recommendation", "outcome", "learning", "emergent"];
  assert.deepEqual(EXECUTABLE_CAPABILITY_OPERATORS.map(x => x.capability_id), expected);
});

test("planned capabilities are never reported as implemented", () => {
  for (const operator of EXECUTABLE_CAPABILITY_OPERATORS) {
    assert.ok(operator.status === "implemented" || operator.status === "planned");
    if (operator.status === "planned") assert.equal(getCapabilityOperator(operator.capability_id)?.status, "planned");
  }
});

test("implemented operators are bound to an actual executable function", () => {
  for (const operator of EXECUTABLE_CAPABILITY_OPERATORS.filter(x => x.status === "implemented")) {
    assert.equal(typeof operator.execute, "function");
    assert.notEqual(operator.evidence_state, "OBSERVED");
    assert.ok(operator.execution_stage.length > 0);
  }
});

test("financial-life state and relational ontology are independently addressable governed capabilities", () => {
  const lifeState = getCapabilityOperator("financial_life_state");
  const ontology = getCapabilityOperator("relational_ontology");
  assert.ok(lifeState);
  assert.ok(ontology);
  assert.equal(lifeState?.operator_id, "financial_life_state");
  assert.equal(ontology?.operator_id, "relational_ontology");
  assert.equal(typeof lifeState?.execute, "function");
  assert.equal(typeof ontology?.execute, "function");
});

test("temporal is the first independently executable capability", () => {
  const operator = getCapabilityOperator("temporal");
  assert.ok(operator);
  assert.equal(operator.status, "implemented");
  assert.equal(operator.operator_id, "temporal");
  assert.equal(operator.version, "1.0.0");
  assert.equal(typeof operator.execute, "function");
});
