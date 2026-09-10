import test from "node:test";
import assert from "node:assert/strict";
import { buildScenarioSensitivityIntelligence } from "./counterfactual.js";

test("scenario sensitivity never manufactures stressed financial values", () => {
  const result = buildScenarioSensitivityIntelligence({
    predictive: {},
    causal: { hypotheses: [] },
    safeToSpend: null,
    cashFlowNet: null,
    revolvingDebt: null,
  });

  assert.equal(result.engine_version, "IRIS_SCENARIO_ENGINE_V2");
  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.projection_available, false);
  assert.equal(result.scenarios.length, 0);
  assert.equal(result.scenario_generation_blocked_reason, "NO_PROVENANCE_BACKED_SCENARIO_INPUT");
  assert.equal(result.generation.financial_values_created, false);
  assert.equal(result.generation.fake_mock_or_seeded_data, false);
  assert.equal(result.generation.provider_observations_created, false);
});

test("scenario sensitivity preserves an upstream projection without deriving a synthetic stress value", () => {
  const result = buildScenarioSensitivityIntelligence({
    predictive: { projectedLiquidPosition: "upstream-derived" },
    causal: { hypotheses: [{ id: "upstream-hypothesis" }] },
    safeToSpend: null,
    cashFlowNet: null,
    revolvingDebt: null,
  });

  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.scenarios.length, 0);
  assert.equal(result.scenario_generation_blocked_reason, "NO_PROVENANCE_BACKED_SCENARIO_INPUT");
  assert.equal(result.generation.financial_values_created, false);
});
