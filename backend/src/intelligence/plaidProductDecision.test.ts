import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePlaidProductDecision } from "../contracts/plaidProductDecision.js";

test("observed entitled active product is selected", () => {
  const result = evaluatePlaidProductDecision({
    productKey: "transactions",
    providerState: "active",
    consentState: "consented",
    entitlementState: "entitled",
    commercialState: "included",
    evidenceState: "observed",
    intelligenceScore: 50,
  });
  assert.equal(result.decision, "selected");
  assert.equal(result.eligibleForIris, true);
  assert.deepEqual(result.blockers, []);
});

test("available product is eligible but cannot be selected without evidence", () => {
  const result = evaluatePlaidProductDecision({
    productKey: "income",
    providerState: "available",
    consentState: "consented",
    entitlementState: "entitled",
    commercialState: "included",
    evidenceState: "not_observed",
    intelligenceScore: 40,
  });
  assert.equal(result.decision, "eligible_awaiting_evidence");
  assert.equal(result.eligibleForIris, true);
  assert.deepEqual(result.blockers, ["evidence_required"]);
});

test("catalog membership cannot bypass entitlement", () => {
  const result = evaluatePlaidProductDecision({
    productKey: "investments",
    providerState: "active",
    consentState: "consented",
    entitlementState: "not_entitled",
    commercialState: "included",
    evidenceState: "observed",
    intelligenceScore: 30,
  });
  assert.equal(result.decision, "blocked");
  assert.equal(result.eligibleForIris, false);
  assert.ok(result.blockers.includes("not_entitled"));
});

test("unknown commercial terms never become an assumed free selection", () => {
  const result = evaluatePlaidProductDecision({
    productKey: "identity",
    providerState: "active",
    consentState: "consented",
    entitlementState: "entitled",
    commercialState: "unknown",
    evidenceState: "observed",
    intelligenceScore: 20,
  });
  assert.equal(result.decision, "blocked");
  assert.equal(result.eligibleForIris, false);
  assert.ok(result.blockers.includes("commercial_terms_unknown"));
});

test("consented-but-unobserved remains distinct from observed", () => {
  const result = evaluatePlaidProductDecision({
    productKey: "balance",
    providerState: "consented",
    consentState: "consented",
    entitlementState: "entitled",
    commercialState: "included",
    evidenceState: "not_observed",
    intelligenceScore: 25,
  });
  assert.equal(result.decision, "eligible_awaiting_evidence");
  assert.equal(result.evidenceState, "not_observed");
  assert.ok(result.reasons.some((reason) => reason.includes("not been observed")));
});
