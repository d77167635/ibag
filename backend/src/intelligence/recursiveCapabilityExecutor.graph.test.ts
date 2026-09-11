import test from "node:test";
import assert from "node:assert/strict";
import type { CapabilityPlan } from "./capabilityPlanner.js";
import { executeRecursiveCapabilityPlan } from "./recursiveCapabilityExecutor.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

const result = (capability_id: string, value: Record<string, unknown>): CapabilityOperatorResult => ({
  capability_id,
  operator_id: capability_id,
  operator_version: "test",
  evidence_state: "CALCULATED",
  result: value,
});

function plan(): CapabilityPlan {
  return {
    planner_version: "test",
    requested: ["child"],
    ordered_capabilities: ["parent", "child"],
    contracts: [
      {
        capability_id: "parent",
        version: "test",
        operator_id: "parent",
        operator_version: "test",
        evidence_requirements: {},
        dependencies: [],
        validation_rules: [],
        output_type: "test",
        output_contract: {},
        lineage_requirements: ["dependency"],
        resource_limits: {},
        user_control: {},
        recursive: false,
        cross_domain: false,
      },
      {
        capability_id: "child",
        version: "test",
        operator_id: "child",
        operator_version: "test",
        evidence_requirements: {},
        dependencies: ["parent"],
        validation_rules: [],
        output_type: "test",
        output_contract: {},
        lineage_requirements: ["dependency"],
        resource_limits: {},
        user_control: {},
        recursive: true,
        cross_domain: false,
      },
    ],
    missing_capabilities: [],
    unsupported_capabilities: [],
    cycle_detected: false,
    evidence: { observed_products: [], observed_product_count: 0, source_field_observation_count: 0 },
    resource_estimate: { nodes: 2, edges: 1, compositions: 1 },
    status: "READY",
    limitations: [],
  };
}

test("recursive executor returns the exact persisted graph-node ID for every executed capability", async () => {
  const persisted: Record<string, string> = {};
  const execution = await executeRecursiveCapabilityPlan(
    "user-test",
    plan(),
    {
      runId: "run-test",
      executionId: "execution-test",
      persistSemanticDependencyProof: async () => {},
      persistSemanticTransformationEdges: async () => {},
      persistGraphNode: async ({ capabilityId, dependencyNodeIds }) => {
        if (capabilityId === "child") assert.deepEqual(dependencyNodeIds, { parent: "node-parent" });
        const id = `node-${capabilityId}`;
        persisted[capabilityId] = id;
        return { id };
      },
    },
    { maxNodes: 10, maxEdges: 10, maxCompositions: 10 },
    async ({ capabilityId, context }) => {
      if (capabilityId === "parent") return result("parent", { value: 1 });
      assert.equal(context?.dependencyResults?.parent?.result.value, 1);
      return result("child", { value: 2 });
    },
  );

  assert.equal(execution.status, "COMPLETED");
  assert.deepEqual(execution.graph_node_ids, persisted);
  assert.deepEqual(execution.graph_node_ids, { parent: "node-parent", child: "node-child" });
});
