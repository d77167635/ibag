import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisPublicationRuntime } from "./irisPublicationContext.js";
import { getIrisFeatureByCapability } from "../contracts/irisFeatureRegistry.js";

test("publication runtime suppresses ready atlas output without exact runtime lineage", () => {
  const runtime = buildIrisPublicationRuntime([
    { id: "state.financial-state", family: "state", name: "Financial State", purpose: "Current financial state", output: "state", evidence_ready: true, missing_inputs: [] },
    { id: "state.liquidity-position", family: "state", name: "Liquidity position", purpose: "Current liquid-resource position", output: "state", evidence_ready: false, missing_inputs: ["cash_flow_safety"] },
  ], ["report.state.financial-state", "report.state.liquidity-position"]);
  const ready = runtime.intelligence_output_runtime.ready_outputs;
  const suppressed = runtime.intelligence_output_runtime.suppressed_outputs;
  assert.equal(ready.some((output) => output.analysis_id === "state.financial-state"), false);
  assert.equal(suppressed.some((output) => output.analysis_id === "state.financial-state"), true);
  assert.equal(suppressed.some((output) => output.analysis_id === "state.liquidity-position"), true);
});

test("internal feature coverage is calculated from required analysis IDs", () => {
  const feature = getIrisFeatureByCapability("financial-state");
  assert.ok(feature);
  assert.ok(feature.requiredAnalysisIds.includes("state.financial-state"));
  assert.ok(feature.requiredEvidence.includes("financial_state"));
  const runtime = buildIrisPublicationRuntime([{ id: "state.financial-state", evidence_ready: true, missing_inputs: [] }], ["report.state.financial-state"]);
  const state = runtime.feature_runtime.features.find((item) => item.featureId === feature.featureId);
  assert.ok(state);
  assert.equal(state.evidenceCoverage, 1);
  assert.equal(state.readiness, "ready");
});

test("publication runtime never turns an unmapped analysis into a claim", () => {
  const runtime = buildIrisPublicationRuntime([{ id: "unknown.analysis", evidence_ready: true, missing_inputs: [] }], ["report.unknown.analysis"]);
  assert.equal(runtime.intelligence_output_runtime.publishable.length, 0);
  assert.equal(runtime.intelligence_output_runtime.suppressed_outputs[0]?.blockers.includes("report_feature_unmapped"), true);
});

test("deactivated report suppresses otherwise ready output", () => {
  const runtime = buildIrisPublicationRuntime([{ id: "state.financial-state", evidence_ready: true, missing_inputs: [] }], []);
  const output = runtime.intelligence_output_runtime.suppressed_outputs.find((item) => item.analysis_id === "state.financial-state");
  assert.equal(output?.state, "suppressed");
  assert.equal(output?.blockers.includes("report_deactivated"), true);
});

test("publication boundary records the report/provider distinction", () => {
  const runtime = buildIrisPublicationRuntime([], []);
  assert.equal(runtime.publication_boundary.intelligence_hierarchy_is_not_a_user_product_catalog, true);
  assert.equal(runtime.publication_boundary.report_products_are_user_controllable, true);
  assert.equal(runtime.publication_boundary.report_activation_does_not_activate_provider_products, true);
  assert.equal(runtime.publication_boundary.report_activation_does_not_create_evidence, true);
  assert.equal(runtime.publication_boundary.catalog_metadata_is_not_evidence, true);
});
