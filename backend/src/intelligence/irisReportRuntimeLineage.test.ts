import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";

const resolvedLineage = {
  "report.analysis.test": {
    resolution_state: "resolved" as const,
    report_id: "report.analysis.test",
    analysis_definition_id: "analysis.test",
    feature_ids: [],
    capability_ids: ["capability.test"],
    intelligence_node_ids: ["node-real"],
    upstream_intelligence_node_ids: ["node-upstream"],
    transformation_edge_ids: ["edge-real"],
    run_evidence_ids: ["evidence-real"],
    evidence_lineage_present: true as const,
    run_id: "run-1",
    execution_id: "execution-1",
    limitation: null,
  },
};

const certified = { certification_gate: { certified: true, reasons: [], lineage_verified: true, semantic_dependency_reads_verified: true, evidence_boundary_satisfied: true } };

test("does not treat a ready atlas or feature definition as runtime lineage", () => {
  const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} });
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], {});
  assert.equal(runtime.outputs[0]?.runtime_lineage, null);
  assert.equal(runtime.outputs[0]?.state, "suppressed");
  assert.ok(runtime.outputs[0]?.blockers.includes("runtime_intelligence_lineage_unresolved"));
});

test("resolved runtime lineage is still not publishable without certification", () => {
  const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: { "feature.test": 1 } });
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], resolvedLineage);
  assert.equal(runtime.outputs[0]?.state, "suppressed");
  assert.ok(runtime.outputs[0]?.blockers.includes("report_certification_runtime_missing"));
  assert.equal(runtime.publishable.length, 0);
});

test("certified report publication requires exact runtime lineage and certification", () => {
  const featureRuntime = buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: { "feature.test": 1 } });
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ id: "analysis.test", family: "test", name: "Test", purpose: "Test", output: "Test output", evidence_ready: true, missing_inputs: [] }] }, featureRuntime, ["report.analysis.test"], resolvedLineage, { "report.analysis.test": certified });
  assert.equal(runtime.outputs[0]?.state, "ready");
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.intelligence_node_ids, ["node-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.run_evidence_ids, ["evidence-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.transformation_edge_ids, ["edge-real"]);
  assert.equal(runtime.publishable.length, 1);
});
