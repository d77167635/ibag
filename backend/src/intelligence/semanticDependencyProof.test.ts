import test from "node:test";
import assert from "node:assert/strict";
import { buildSemanticDependencyProof, verifySemanticDependencyProof } from "./semanticDependencyProof.js";
import { trackDependencyReads } from "./semanticDependencyTracker.js";
import { validateSemanticDependencyPaths } from "./semanticDependencyContract.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

const result = (capability_id: string, value: unknown): CapabilityOperatorResult => ({ capability_id, operator_id: capability_id, operator_version: "test", evidence_state: "CALCULATED", result: value as Record<string, unknown> });

test("proof binds consumed dependency output hashes and accessed paths to downstream output", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const tracked = trackDependencyReads(dependencyResults);
  void tracked.dependencies.temporal.result.net;
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, tracked.consumed_dependency_paths, output);
  assert.equal(proof.consumed_dependency_paths.temporal.includes("root.result.net"), true);
  assert.equal(verifySemanticDependencyProof(proof, dependencyResults, output), true);
});

test("proof fails when an upstream result changes", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const tracked = trackDependencyReads(dependencyResults);
  void tracked.dependencies.temporal.result.net;
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, tracked.consumed_dependency_paths, output);
  const changed = { temporal: result("temporal", { net: 11 }) };
  assert.equal(verifySemanticDependencyProof(proof, changed, output), false);
});

test("proof fails when downstream output changes", () => {
  const dependencyResults = { temporal: result("temporal", { net: 10 }) };
  const tracked = trackDependencyReads(dependencyResults);
  void tracked.dependencies.temporal.result.net;
  const output = result("analysis", { net: 10, temporal_used: true });
  const proof = buildSemanticDependencyProof("analysis", ["temporal"], dependencyResults, tracked.consumed_dependency_paths, output);
  const changedOutput = result("analysis", { net: 10, temporal_used: false });
  assert.equal(verifySemanticDependencyProof(proof, dependencyResults, changedOutput), false);
});

test("semantic transformation validation requires declared field access", () => {
  const paths = { temporal: new Set(["root.result.net"]) };
  assert.deepEqual(validateSemanticDependencyPaths("analysis", paths), ["temporal:root.result"]);
  paths.temporal.add("root.result");
  assert.deepEqual(validateSemanticDependencyPaths("analysis", paths), []);
});
