import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";

test("does not treat a ready atlas or feature definition as runtime lineage", () => {
  const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} });
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], {});
  assert.equal(runtime.outputs[0]?.runtime_lineage, null);
  assert.equal(runtime.outputs[0]?.state, "suppressed");
  assert.ok(runtime.outputs[0]?.blockers.includes("runtime_intelligence_lineage_unresolved"));
});

test("accepts a report only when exact runtime lineage is resolved", () => {
  const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} });
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], {
    "report.analysis.test": {
      resolution_state: "resolved",
      report_id: "report.analysis.test",
      analysis_definition_id: "analysis.test",
      feature_ids: [],
      capability_ids: ["capability.test"],
      intelligence_node_ids: ["node-real"],
      upstream_intelligence_node_ids: ["node-upstream"],
      transformation_edge_ids: ["edge-real"],
      run_evidence_ids: ["evidence-real"],
      evidence_lineage_present: true,
      run_id: "run-1",
      execution_id: "execution-1",
      limitation: null,
    },
  });
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.intelligence_node_ids, ["node-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.run_evidence_ids, ["evidence-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.transformation_edge_ids, ["edge-real"]);
});
