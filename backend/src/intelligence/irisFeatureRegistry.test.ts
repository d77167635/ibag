import test from "node:test";
import assert from "node:assert/strict";
import {
  IRIS_FEATURE_REGISTRY,
  evaluateIrisFeatureState,
  getIrisFeatureByCapability,
} from "../contracts/irisFeatureRegistry.js";

test("Iris feature registry is derived from the complete capability catalog", () => {
  assert.ok(IRIS_FEATURE_REGISTRY.length > 0);
  assert.ok(getIrisFeatureByCapability("maximum-intelligence"));
  assert.ok(getIrisFeatureByCapability("decision-lab"));
  assert.equal(new Set(IRIS_FEATURE_REGISTRY.map((feature) => feature.featureId)).size, IRIS_FEATURE_REGISTRY.length);
});

test("disabled feature cannot become available from evidence", () => {
  const feature = getIrisFeatureByCapability("cash-flow");
  assert.ok(feature);
  const state = evaluateIrisFeatureState(feature, { activation: "disabled", evidenceCoverage: 1 });
  assert.equal(state.readiness, "blocked");
  assert.equal(state.available, false);
  assert.ok(state.blockers.includes("feature_disabled"));
});

test("zero evidence is insufficient rather than observed", () => {
  const feature = getIrisFeatureByCapability("spending");
  assert.ok(feature);
  const state = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceCoverage: 0 });
  assert.equal(state.readiness, "insufficient_evidence");
  assert.equal(state.available, false);
  assert.deepEqual(state.blockers, ["evidence_required"]);
});

test("partial evidence produces limited readiness", () => {
  const feature = getIrisFeatureByCapability("cash-flow");
  assert.ok(feature);
  const state = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceCoverage: 0.6 });
  assert.equal(state.readiness, "limited");
  assert.equal(state.available, true);
  assert.equal(state.evidenceCoverage, 0.6);
});

test("complete evidence produces ready readiness", () => {
  const feature = getIrisFeatureByCapability("financial-state");
  assert.ok(feature);
  const state = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceCoverage: 1 });
  assert.equal(state.readiness, "ready");
  assert.equal(state.available, true);
});

test("provider or analytical blockers override evidence coverage", () => {
  const feature = getIrisFeatureByCapability("forecast");
  assert.ok(feature);
  const state = evaluateIrisFeatureState(feature, {
    activation: "enabled",
    evidenceCoverage: 1,
    blockers: ["provider_unavailable"],
  });
  assert.equal(state.readiness, "blocked");
  assert.equal(state.available, false);
  assert.deepEqual(state.blockers, ["provider_unavailable"]);
});
