import assert from "node:assert/strict";
import test from "node:test";
import { traverseIntelligenceGraph } from "./intelligenceGraphTraversal.js";

const edge = (upstream_node_id: string, downstream_node_id: string, execution_id = "exec-1") => ({ user_id: "user-1", run_id: "run-1", execution_id, upstream_node_id, downstream_node_id, relation_type: "derives_from" });

test("traverses arbitrary upstream depth without a maximum intelligence level", () => {
  const edges = [edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n4"), edge("n4", "n5")];
  const result = traverseIntelligenceGraph({ startNodeId: "n5", direction: "upstream", edges, userId: "user-1", runId: "run-1", executionId: "exec-1" });
  assert.deepEqual(result.node_ids, ["n1", "n2", "n3", "n4"]);
  assert.equal(result.cycle_detected, false);
});

test("supports downstream traversal", () => {
  const result = traverseIntelligenceGraph({ startNodeId: "n1", direction: "downstream", edges: [edge("n1", "n2"), edge("n2", "n3")], userId: "user-1", runId: "run-1", executionId: "exec-1" });
  assert.deepEqual(result.node_ids, ["n2", "n3"]);
});

test("stops a cycle safely and reports it", () => {
  const result = traverseIntelligenceGraph({ startNodeId: "n1", direction: "downstream", edges: [edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n1")], userId: "user-1", runId: "run-1", executionId: "exec-1" });
  assert.deepEqual(result.node_ids, ["n2", "n3"]);
  assert.equal(result.cycle_detected, true);
});

test("does not cross user, run, or execution boundaries", () => {
  const result = traverseIntelligenceGraph({ startNodeId: "n1", direction: "downstream", edges: [edge("n1", "n2"), { ...edge("n2", "n3"), user_id: "other-user" }, { ...edge("n2", "n4"), execution_id: "other-exec" }], userId: "user-1", runId: "run-1", executionId: "exec-1" });
  assert.deepEqual(result.node_ids, ["n2"]);
  assert.equal(result.boundary_mismatch_count, 2);
});
