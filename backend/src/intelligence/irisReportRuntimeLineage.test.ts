import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";

const definition = { id: "state.financial-state", family: "state", name: "Financial State", purpose: "Current financial state", output: "state", evidence_ready: true, missing_inputs: [] };
const reportId = "report.state.financial-state";
const resolvedLineage = {
  [reportId]: {
    resolution_state: "resolved" as const,
    report_id: reportId,
    analysis_definition_id: definition.id,
    feature_ids: ["feature.financial-state"],
    capability_ids: ["financial-state"],
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
const certified = { [reportId]: { certification_gate: { certified: true, reasons: [], lineage_verified: true, semantic_dependency_reads_verified: true, evidence_boundary_satisfied: true } } };

const build = (lineage = {}, certification = {}) => buildIrisIntelligenceOutputRuntime({ definitions: [definition] }, buildIrisFeatureRuntime({ activations: { "feature.financial-state": "enabled" }, evidenceCoverage: { "feature.financial-state": 1 } }), [reportId], lineage, certification);

test("does not treat a ready atlas or feature definition as runtime lineage", () => {
  const runtime = buildIrisIntelligenceOutputRuntime({ definitions: [{ ...definition, id: "analysis.test" }] }, buildIrisFeatureRuntime({ activations: {}, evidenceCoverage: {} }), ["report.analysis.test"], {});
  assert.equal(runtime.outputs[0]?.runtime_lineage, null);
  assert.equal(runtime.outputs[0]?.state, "suppressed");
  assert.ok(runtime.outputs[0]?.blockers.includes("report_feature_unmapped"));
});

test("resolved runtime lineage is still not publishable without certification", () => {
  const runtime = build(resolvedLineage);
  assert.equal(runtime.outputs[0]?.state, "suppressed");
  assert.ok(runtime.outputs[0]?.blockers.includes("report_certification_runtime_missing"));
  assert.equal(runtime.publishable.length, 0);
});

test("certified report publication requires exact runtime lineage and certification", () => {
  const runtime = build(resolvedLineage, certified);
  assert.equal(runtime.outputs[0]?.state, "ready");
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.intelligence_node_ids, ["node-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.run_evidence_ids, ["evidence-real"]);
  assert.deepEqual(runtime.outputs[0]?.runtime_lineage?.transformation_edge_ids, ["edge-real"]);
  assert.equal(runtime.publishable.length, 1);
});
