import assert from "node:assert/strict";
import test from "node:test";
import { orderedPathCount, planOrderedLayerPath } from "./orderedComposition.js";

const definitions = [
  { id: "a", family: "state", name: "A", purpose: "A", inputs: ["x"], output: "a", evidence_ready: true },
  { id: "b", family: "flow", name: "B", purpose: "B", inputs: ["y"], output: "b", evidence_ready: true },
  { id: "c", family: "risk", name: "C", purpose: "C", inputs: ["z"], output: "c", evidence_ready: false },
] as any;

test("Iris can plan an arbitrary non-empty ordered path", () => {
  const path = planOrderedLayerPath(definitions, ["b", "a"]);
  assert.deepEqual(path.layer_ids, ["b", "a"]);
  assert.deepEqual(path.layer_names, ["B", "A"]);
  assert.equal(path.order_sensitive, true);
  assert.equal(path.evidence_ready, true);
});

test("ordered path planning remains evidence gated", () => {
  const path = planOrderedLayerPath(definitions, ["a", "c", "b"]);
  assert.equal(path.evidence_ready, false);
});

test("ordered path count is sum of all non-empty permutations", () => {
  assert.equal(orderedPathCount(8), 109600);
});
