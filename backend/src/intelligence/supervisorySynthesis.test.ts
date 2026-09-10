import test from "node:test";
import assert from "node:assert/strict";
import { synthesizeCapabilityGraph } from "./supervisorySynthesis.js";

test("supervisory synthesis consumes every declared child output without upgrading evidence", () => {
  const result = synthesizeCapabilityGraph(
    ["temporal", "analysis", "causal"],
    {
      temporal: { capability_id: "temporal", execution_id: "e1", output_hash: "h1", value: { windows: [] }, evidence_state: "CALCULATED", uncertainty: null },
      analysis: { capability_id: "analysis", execution_id: "e2", output_hash: "h2", value: { transaction_count: 4 }, evidence_state: "CALCULATED", uncertainty: null },
      causal: { capability_id: "causal", execution_id: "e3", output_hash: "h3", value: { hypotheses: [] }, evidence_state: "INFERRED", uncertainty: { status: "qualified" } },
    },
  );

  assert.equal(result.graph_complete, true);
  assert.equal(result.dependency_count, 3);
  assert.deepEqual(result.consumed_capabilities, ["temporal", "analysis", "causal"]);
  assert.deepEqual(result.output_hashes, { temporal: "h1", analysis: "h2", causal: "h3" });
  assert.equal(result.uncertainty_present, true);
  assert.equal(result.strongest_evidence_state, "CALCULATED");
  assert.equal(result.evidence_state, "INFERRED");
});

test("supervisory synthesis fails closed when a child output is missing", () => {
  const result = synthesizeCapabilityGraph(
    ["temporal", "analysis"],
    {
      temporal: { capability_id: "temporal", execution_id: "e1", output_hash: "h1", value: {}, evidence_state: "CALCULATED", uncertainty: null },
    },
  );

  assert.equal(result.graph_complete, false);
  assert.deepEqual(result.missing_capabilities, ["analysis"]);
  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
});

test("supervisory synthesis never upgrades an insufficient child", () => {
  const result = synthesizeCapabilityGraph(
    ["analysis", "causal"],
    {
      analysis: { capability_id: "analysis", execution_id: "e1", output_hash: "h1", value: {}, evidence_state: "CALCULATED", uncertainty: null },
      causal: { capability_id: "causal", execution_id: "e2", output_hash: "h2", value: {}, evidence_state: "INSUFFICIENT_EVIDENCE", uncertainty: { status: "blocked" } },
    },
  );

  assert.equal(result.graph_complete, true);
  assert.equal(result.strongest_evidence_state, "CALCULATED");
  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
});
