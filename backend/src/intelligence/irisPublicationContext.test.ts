import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisPublicationRuntime } from "./irisPublicationContext.js";

test("publication runtime publishes only evidence-ready enabled analyses", () => {
  const runtime = buildIrisPublicationRuntime([
    {
      id: "state.financial-state",
      family: "state",
      name: "Financial State",
      purpose: "Current financial state",
      output: "state",
      evidence_ready: true,
      missing_inputs: [],
    },
    {
      id: "state.liquidity-position",
      family: "state",
      name: "Liquidity position",
      purpose: "Current liquid-resource position",
      output: "state",
      evidence_ready: false,
      missing_inputs: ["cash_flow_safety"],
    },
  ], ["financial-state"]);

  const ready = runtime.intelligence_output_runtime.ready_outputs;
  const suppressed = runtime.intelligence_output_runtime.suppressed_outputs;
  assert.equal(ready.some((output) => output.analysis_id === "state.financial-state"), true);
  assert.equal(suppressed.some((output) => output.analysis_id === "state.liquidity-position"), true);
});

test("publication runtime never turns an unmapped analysis into a claim", () => {
  const runtime = buildIrisPublicationRuntime([
    { id: "unknown.analysis", evidence_ready: true, missing_inputs: [] },
  ], ["financial-state"]);
  assert.equal(runtime.intelligence_output_runtime.publishable.length, 0);
  assert.equal(runtime.intelligence_output_runtime.suppressed_outputs[0]?.blockers.includes("feature_runtime_unmapped"), true);
});

test("disabled capability suppresses otherwise ready output", () => {
  const runtime = buildIrisPublicationRuntime([
    { id: "state.financial-state", evidence_ready: true, missing_inputs: [] },
  ], []);
  const output = runtime.intelligence_output_runtime.suppressed_outputs.find((item) => item.analysis_id === "state.financial-state");
  assert.equal(output?.state, "suppressed");
  assert.equal(output?.blockers.includes("feature_disabled"), true);
});

test("publication boundary records the provider/analysis distinction", () => {
  const runtime = buildIrisPublicationRuntime([], []);
  assert.equal(runtime.publication_boundary.atlas_readiness_is_not_raw_provider_observation, true);
  assert.equal(runtime.publication_boundary.catalog_metadata_is_not_evidence, true);
  assert.equal(runtime.publication_boundary.feature_activation_does_not_activate_provider_products, true);
});
