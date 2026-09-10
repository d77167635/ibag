import assert from "node:assert/strict";
import test from "node:test";
import { buildLayerCompositionEngine } from "./layerCompositionEngine.js";

test("recursive layer composition materializes pathways deeper than two layers", () => {
  const result = buildLayerCompositionEngine({
    definitions: [
      { id: "state", name: "State", family: "state", inputs: ["balance", "transaction"], output: "state", purpose: "understand financial state", evidence_ready: true },
      { id: "flow", name: "Flow", family: "cash_flow", inputs: ["transaction"], output: "cash_flow", purpose: "measure cash flow", evidence_ready: true },
      { id: "behavior", name: "Behavior", family: "behavior", inputs: ["transaction", "merchant"], output: "behavior", purpose: "understand behavior", evidence_ready: true },
      { id: "risk", name: "Risk", family: "decisions", inputs: ["behavior", "cash_flow"], output: "risk", purpose: "evaluate risk", evidence_ready: true },
    ],
    maxDepth: 4,
    maxCandidates: 100,
    beamWidth: 12,
  });

  assert.ok(result.counts.recursive_layered > 0);
  assert.ok(result.counts.max_materialized_depth >= 3);
  assert.equal(result.recursion.depth_is_resource_bound_not_semantic_ceiling, true);
  assert.equal(result.generation.fake_mock_or_seeded_data, false);
});

test("evidence-limited recursive pathways remain explicitly limited", () => {
  const result = buildLayerCompositionEngine({
    definitions: [
      { id: "a", name: "A", family: "state", inputs: ["balance"], output: "state", purpose: "read state", evidence_ready: true },
      { id: "b", name: "B", family: "risk", inputs: ["state"], output: "risk", purpose: "evaluate risk", evidence_ready: false },
      { id: "c", name: "C", family: "decision", inputs: ["risk"], output: "decision", purpose: "evaluate decisions", evidence_ready: false },
    ],
    maxDepth: 3,
    maxCandidates: 50,
    beamWidth: 8,
  });

  const limited = result.compositions.filter((composition) => composition.layer_ids.includes("b"));
  assert.ok(limited.length > 0);
  assert.ok(limited.some((composition) => composition.evidence_ready === false));
});
