import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";

const atlas = { definitions: [{ id: "state.financial-state", family: "state", name: "Financial State", purpose: "Current financial state", output: "state", evidence_ready: true, missing_inputs: [] }] };
const reportId = "report.state.financial-state";

test("insufficient feature evidence suppresses an active report", () => {
  const runtime = buildIrisFeatureRuntime();
  const output = buildIrisIntelligenceOutputRuntime(atlas, runtime, [reportId]);
  assert.equal(output.counts.suppressed, 1);
  assert.equal(output.publishable.length, 0);
});

test("ready evidence publishes an active mapped report product", () => {
  const runtime = buildIrisFeatureRuntime({ evidenceCoverage: { "feature.financial-state": 1 } });
  const output = buildIrisIntelligenceOutputRuntime(atlas, runtime, [reportId]);
  assert.equal(output.ready_outputs.length, 1);
  assert.equal(output.ready_outputs[0]?.analysis_id, "state.financial-state");
  assert.equal(output.ready_outputs[0]?.report_id, reportId);
});

test("limited evidence remains explicitly qualified", () => {
  const runtime = buildIrisFeatureRuntime({ evidenceCoverage: { "feature.financial-state": 0.5 } });
  const output = buildIrisIntelligenceOutputRuntime(atlas, runtime, [reportId]);
  assert.equal(output.limited_outputs.length, 1);
  assert.deepEqual(output.limited_outputs[0]?.blockers, ["partial_evidence"]);
});

test("deactivated report suppresses output even with complete evidence", () => {
  const runtime = buildIrisFeatureRuntime({ evidenceCoverage: { "feature.financial-state": 1 } });
  const output = buildIrisIntelligenceOutputRuntime(atlas, runtime, []);
  assert.equal(output.publishable.length, 0);
  assert.ok(output.suppressed_outputs[0]?.blockers.includes("report_deactivated"));
});

test("unmapped analytical definitions never become publishable", () => {
  const runtime = buildIrisFeatureRuntime({ evidenceCoverage: { "feature.financial-state": 1 } });
  const unknownReport = "report.unknown.analysis";
  const output = buildIrisIntelligenceOutputRuntime({ definitions: [{ ...atlas.definitions[0], id: "unknown.analysis" }] }, runtime, [unknownReport]);
  assert.equal(output.publishable.length, 0);
  assert.ok(output.suppressed_outputs[0]?.blockers.includes("report_feature_unmapped"));
});
