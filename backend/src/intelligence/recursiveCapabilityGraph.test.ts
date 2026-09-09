import test from "node:test";
import assert from "node:assert/strict";
import { classifyCapabilityContract, type CapabilityContract } from "./capabilityReadiness.js";

const contract = (key: string, metadata: Record<string, unknown>): CapabilityContract => ({
  key,
  label: key,
  capability_group: "test",
  description: null,
  metadata,
  active: true,
});

test("catalog presence is discoverable, not automatically ready", () => {
  const candidate = contract("analysis", { evidence_ready: false, runtime_proven: false });
  assert.equal(classifyCapabilityContract(candidate, [candidate]), "discoverable");
});

test("explicit evidence and runtime proof are required for readiness", () => {
  const candidate = contract("analysis", { evidence_ready: true, runtime_proven: true });
  assert.equal(classifyCapabilityContract(candidate, [candidate]), "ready");
});

test("a missing declared dependency blocks composition", () => {
  const candidate = contract("analysis", { dependencies: ["missing"], evidence_ready: true, runtime_proven: true });
  assert.equal(classifyCapabilityContract(candidate, [candidate]), "blocked");
});

test("a non-ready dependency blocks downstream readiness", () => {
  const dependency = contract("source", { evidence_ready: false, runtime_proven: false });
  const candidate = contract("analysis", { dependencies: ["source"], evidence_ready: true, runtime_proven: true });
  assert.equal(classifyCapabilityContract(candidate, [candidate, dependency]), "blocked");
  assert.equal(classifyCapabilityContract(dependency, [candidate, dependency]), "discoverable");
});
