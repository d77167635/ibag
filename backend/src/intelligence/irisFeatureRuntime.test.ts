import assert from "node:assert/strict";
import test from "node:test";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";

test("runtime includes every authoritative Iris feature", () => {
  const runtime = buildIrisFeatureRuntime();
  assert.equal(runtime.registry_version, "IRIS_FEATURE_REGISTRY_V2");
  assert.equal(runtime.features.length, IRIS_FEATURE_REGISTRY.length);
  assert.equal(runtime.enabled_count, IRIS_FEATURE_REGISTRY.length);
  assert.equal(runtime.ready_count, 0);
  assert.equal(runtime.insufficient_evidence_count, IRIS_FEATURE_REGISTRY.length);
});

test("a feature becomes ready only from explicit evidence coverage", () => {
  const feature = IRIS_FEATURE_REGISTRY[0];
  const runtime = buildIrisFeatureRuntime({
    evidenceCoverage: { [feature.featureId]: 1 },
  });
  const state = runtime.features.find((item) => item.featureId === feature.featureId);
  assert.equal(state?.readiness, "ready");
  assert.equal(state?.available, true);
});

test("partial evidence is limited rather than promoted to ready", () => {
  const feature = IRIS_FEATURE_REGISTRY[0];
  const runtime = buildIrisFeatureRuntime({
    evidenceCoverage: { [feature.featureId]: 0.5 },
  });
  const state = runtime.features.find((item) => item.featureId === feature.featureId);
  assert.equal(state?.readiness, "limited");
  assert.equal(state?.available, true);
  assert.ok(state?.blockers.includes("partial_evidence"));
});

test("disabled features remain blocked even with complete evidence", () => {
  const feature = IRIS_FEATURE_REGISTRY[0];
  const runtime = buildIrisFeatureRuntime({
    activations: { [feature.featureId]: "disabled" },
    evidenceCoverage: { [feature.featureId]: 1 },
  });
  const state = runtime.features.find((item) => item.featureId === feature.featureId);
  assert.equal(state?.readiness, "blocked");
  assert.equal(state?.available, false);
  assert.ok(state?.blockers.includes("feature_disabled"));
});

test("upstream analytical blockers override complete evidence", () => {
  const feature = IRIS_FEATURE_REGISTRY[0];
  const runtime = buildIrisFeatureRuntime({
    evidenceCoverage: { [feature.featureId]: 1 },
    blockers: { [feature.featureId]: ["analytical_readiness_failed"] },
  });
  const state = runtime.features.find((item) => item.featureId === feature.featureId);
  assert.equal(state?.readiness, "blocked");
  assert.equal(state?.available, false);
  assert.deepEqual(state?.blockers, ["analytical_readiness_failed"]);
});
