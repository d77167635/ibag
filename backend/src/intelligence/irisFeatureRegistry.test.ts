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
  assert.ok(IRIS_FEATURE_REGISTRY.every((feature) => feature.version.length > 0));
  assert.ok(IRIS_FEATURE_REGISTRY.every((feature) => feature.prerequisites.length > 0));
  assert.ok(IRIS_FEATURE_REGISTRY.every((feature) => feature.evidencePolicy === "all"));
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

test("explicit evidence status requires every declared evidence item", () => {
  const feature = getIrisFeatureByCapability("cash-flow-trends");
  assert.ok(feature);
  assert.ok(feature.requiredEvidence.length >= 2);
  const partial: Record<string, "observed" | "missing"> = {};
  partial[feature.requiredEvidence[0]] = "observed";
  for (const id of feature.requiredEvidence.slice(1)) partial[id] = "missing";
  const partialState = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceStatusById: partial });
  assert.equal(partialState.readiness, "limited");
  assert.equal(partialState.evidenceCoverage, 1 / feature.requiredEvidence.length);

  const complete: Record<string, "observed"> = Object.fromEntries(feature.requiredEvidence.map((id) => [id, "observed"]));
  const completeState = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceStatusById: complete });
  assert.equal(completeState.readiness, "ready");
  assert.equal(completeState.evidenceCoverage, 1);
});

test("stale and retired evidence cannot satisfy a required evidence item", () => {
  const feature = getIrisFeatureByCapability("financial-state");
  assert.ok(feature);
  const status = Object.fromEntries(feature.requiredEvidence.map((id) => [id, "stale"] as const));
  const state = evaluateIrisFeatureState(feature, { activation: "enabled", evidenceStatusById: status });
  assert.equal(state.readiness, "insufficient_evidence");
  assert.equal(state.evidenceCoverage, 0);
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
