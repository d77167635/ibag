import test from "node:test";
import assert from "node:assert/strict";
import { buildSemanticDependencyProof, verifySemanticDependencyProof } from "./semanticDependencyProof.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

const result = (capability_id: string, value: unknown): CapabilityOperatorResult => ({
  capability_id,
  operator_id: capability_id,
  operator_version: "test",
  evidence_state: "CALCULATED",
  result: { value },
});

test("proof binds declared dependency output hashes to downstream output", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, output);
  assert.equal(verifySemanticDependencyProof(proof, dependencyResults, output), true);
});

test("proof fails when an upstream result changes", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, output);
  const changed = { temporal: result("temporal", { net: 11 }) };
  assert.equal(verifySemanticDependencyProof(proof, changed, output), false);
});

test("proof fails when downstream output changes", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, output);
  const changedOutput = result("analysis", { net: 10, temporal_used: false });
  assert.equal(verifySemanticDependencyProof(proof, dependencyResults, changedOutput), false);
});
