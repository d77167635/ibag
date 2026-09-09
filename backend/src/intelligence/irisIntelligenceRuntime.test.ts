import test from "node:test";
import assert from "node:assert/strict";
import { buildIrisIntelligenceRuntime } from "../contracts/irisIntelligenceRuntime.js";

const featureId = "feature.financial-state";

function product(decision: "selected" | "eligible_awaiting_evidence" | "blocked" | "not_eligible", evidenceStatus: "observed" | "not_observed" | "not_available" = "observed", capabilityIds = ["financial-state"]) {
  return { product: "transactions", capabilityIds, decision, evidenceStatus, availableToIris: decision === "selected" || decision === "eligible_awaiting_evidence" };
}

test("runtime defaults to insufficient evidence rather than inventing readiness", () => {
  const runtime = buildIrisIntelligenceRuntime();
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.readiness, "insufficient_evidence");
  assert.equal(state.available, false);
  assert.ok(state.prerequisites.includes("evidence_validated"));
  assert.ok(state.educationSurfaces.includes("what_it_means"));
  assert.ok(state.interactionModes.includes("trace"));
});

test("complete certified evidence makes an enabled feature ready", () => {
  const runtime = buildIrisIntelligenceRuntime({
    evidenceCoverageByCapabilityId: { "financial-state": 1 },
    productDecisions: [product("selected")],
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.readiness, "ready");
  assert.equal(state.available, true);
  assert.deepEqual(state.observedSupportingProducts, ["transactions"]);
});

test("explicit evidence statuses are authoritative over a fallback coverage number", () => {
  const runtime = buildIrisIntelligenceRuntime({
    evidenceCoverageByCapabilityId: { "financial-state": 1 },
    evidenceStatusByFeatureId: {
      [featureId]: { "state.financial-state": "stale" },
    },
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.evidenceCoverage, 0);
  assert.equal(state.readiness, "insufficient_evidence");
});

test("partial evidence remains limited", () => {
  const runtime = buildIrisIntelligenceRuntime({ evidenceCoverageByCapabilityId: { "financial-state": 0.5 } });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.readiness, "limited");
});

test("feature activation cannot activate a Plaid product", () => {
  const runtime = buildIrisIntelligenceRuntime({
    activationByFeatureId: { [featureId]: "disabled" },
    evidenceCoverageByCapabilityId: { "financial-state": 1 },
    productDecisions: [product("selected")],
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.readiness, "blocked");
  assert.equal(state.available, false);
  assert.equal(state.observedSupportingProducts.length, 1);
});

test("eligible awaiting evidence is never counted as observed supporting evidence", () => {
  const runtime = buildIrisIntelligenceRuntime({
    evidenceCoverageByCapabilityId: { "financial-state": 0 },
    productDecisions: [product("eligible_awaiting_evidence", "not_observed")],
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.deepEqual(state.supportingProducts, ["transactions"]);
  assert.deepEqual(state.observedSupportingProducts, []);
});

test("unrelated provider products are not falsely linked to a feature", () => {
  const runtime = buildIrisIntelligenceRuntime({
    evidenceCoverageByCapabilityId: { "financial-state": 1 },
    productDecisions: [product("selected", "observed", ["spending"])],
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.deepEqual(state.supportingProducts, []);
  assert.deepEqual(state.observedSupportingProducts, []);
});

test("upstream blocker remains authoritative", () => {
  const runtime = buildIrisIntelligenceRuntime({
    evidenceCoverageByCapabilityId: { "financial-state": 1 },
    blockersByCapabilityId: { "financial-state": ["provider_data_integrity_failure"] },
    productDecisions: [product("selected")],
  });
  const state = runtime.states.find((item) => item.featureId === featureId);
  assert.ok(state);
  assert.equal(state.readiness, "blocked");
  assert.equal(state.available, false);
});
