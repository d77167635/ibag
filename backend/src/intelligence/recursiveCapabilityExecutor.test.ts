import assert from "node:assert/strict";
import test from "node:test";
import { executeRecursiveCapabilityPlan } from "./recursiveCapabilityExecutor.js";
import type { CapabilityPlan } from "./capabilityPlanner.js";

function plan(overrides: Partial<CapabilityPlan> = {}): CapabilityPlan {
  return {
    planner_version: "test-planner",
    requested: ["analysis"],
    ordered_capabilities: ["analysis"],
    contracts: [{
      capability_id: "analysis",
      version: "1.0.0",
      operator_id: "analysis",
      operator_version: "1.0.0",
      evidence_requirements: [],
      dependencies: [],
      validation_rules: [],
      output_type: "analysis",
      output_contract: {},
      lineage_requirements: ["run"],
      resource_limits: {},
      user_control: {},
      recursive: true,
      cross_domain: false,
    }],
    missing_capabilities: [],
    unsupported_capabilities: [],
    cycle_detected: false,
    evidence: { observed_products: [], observed_product_count: 0, source_field_observation_count: 0 },
    resource_estimate: { nodes: 1, edges: 0, compositions: 1 },
    status: "READY",
    limitations: [],
    ...overrides,
  };
}

test("blocked plans do not execute any capability", async () => {
  const result = await executeRecursiveCapabilityPlan("00000000-0000-0000-0000-000000000000", plan({ status: "BLOCKED", limitations: ["missing evidence"] }));
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(result.executed_capabilities, []);
});

test("resource limits terminate execution without semantic maximum-depth errors", async () => {
  const result = await executeRecursiveCapabilityPlan(
    "00000000-0000-0000-0000-000000000000",
    plan({ resource_estimate: { nodes: 2, edges: 0, compositions: 1 } }),
    {},
    { maxNodes: 1, maxEdges: 10, maxCompositions: 10 },
  );
  assert.equal(result.status, "EXECUTION_BUDGET_EXCEEDED");
  assert.match(result.error ?? "", /execution budget/i);
  assert.doesNotMatch(result.error ?? "", /maximum.*level/i);
});

test("dependency edges and recursive compositions are budgeted before dispatch", async () => {
  const dependency = plan({
    requested: ["behavioral"],
    ordered_capabilities: ["analysis", "behavioral"],
    contracts: [
      plan().contracts[0],
      {
        capability_id: "behavioral",
        version: "1.0.0",
        operator_id: "behavioral",
        operator_version: "1.0.0",
        evidence_requirements: [],
        dependencies: ["analysis"],
        validation_rules: [],
        output_type: "analysis",
        output_contract: {},
        lineage_requirements: ["run"],
        resource_limits: {},
        user_control: {},
        recursive: true,
        cross_domain: false,
      },
    ],
    resource_estimate: { nodes: 2, edges: 1, compositions: 2 },
  });
  const result = await executeRecursiveCapabilityPlan(
    "00000000-0000-0000-0000-000000000000",
    dependency,
    {},
    { maxNodes: 10, maxEdges: 0, maxCompositions: 10 },
  );
  assert.equal(result.status, "EXECUTION_BUDGET_EXCEEDED");
  assert.equal(result.resource_usage.edges, 1);
});
