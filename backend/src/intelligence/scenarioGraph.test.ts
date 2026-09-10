import test from "node:test";
import assert from "node:assert/strict";
import { buildScenarioSensitivityIntelligence } from "./counterfactual.js";

test("scenario sensitivity consumes upstream projection and causal hypotheses without downstream decision data", () => {
  const result = buildScenarioSensitivityIntelligence({
    predictive: { projectedLiquidPosition: 1000 },
    causal: { hypotheses: [{ id: "h1" }] },
    safeToSpend: 200,
    cashFlowNet: -500,
    revolvingDebt: 1000,
  });

  assert.equal(result.engine_version, "IRIS_SCENARIO_ENGINE_V1");
  assert.equal(result.evidence_state, "SCENARIO");
  assert.equal(result.causal_hypothesis_count, 1);
  assert.equal(result.projection_available, true);
  assert.equal(result.generation.execution_capability, false);
  assert.equal(result.generation.fake_mock_or_seeded_data, false);
  assert.equal(result.scenarios.length, 3);
  for (const scenario of result.scenarios) {
    assert.equal(scenario.causal_claim_allowed, false);
    assert.equal(scenario.probability_claim_allowed, false);
    assert.equal(scenario.evidence_basis, "upstream_predictive_projection");
  }
});

test("scenario sensitivity fails closed when predictive evidence is absent", () => {
  const result = buildScenarioSensitivityIntelligence({
    predictive: {},
    causal: { hypotheses: [] },
    safeToSpend: null,
    cashFlowNet: null,
    revolvingDebt: null,
  });

  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.projection_available, false);
  assert.deepEqual(result.scenarios, []);
});
