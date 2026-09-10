import test from "node:test";
import assert from "node:assert/strict";
import { executeRisk, executeOpportunity, executeConsequence } from "./riskOpportunityConsequenceOperators.js";
import type { CapabilityExecutionContext, CapabilityOperatorResult } from "./capabilityOperators.js";

function dependency(capability_id: string, result: Record<string, unknown>, evidence_state: CapabilityOperatorResult["evidence_state"] = "CALCULATED"): CapabilityOperatorResult {
  return {
    capability_id,
    operator_id: capability_id,
    operator_version: "test",
    evidence_state,
    result,
  };
}

function context(dependencyResults: Record<string, CapabilityOperatorResult>): CapabilityExecutionContext {
  return {
    runId: "test-run",
    asOf: "2026-01-01T00:00:00.000Z",
    evidenceBoundary: "2026-01-01T00:00:00.000Z",
    evidenceManifestHash: "test-manifest",
    runEvidenceIds: ["raw-observation-1"],
    dependencyResults,
  };
}

test("risk remains evidence-bound and infers only from available certified dependencies", async () => {
  const result = await executeRisk("user-test", context({
    analysis: dependency("analysis", { transaction_count: 3, flow: { outflow: 120 } }),
    anomaly: dependency("anomaly", { detection_count: 2 }),
  }));

  assert.equal(result.evidence_state, "INFERRED");
  assert.equal(result.result.risk_state, "signals_present");
  assert.equal(result.result.provenance?.financial_values_created, false);
  assert.equal(result.result.provenance?.provider_observations_created, false);
});

test("risk fails closed when no analytical evidence exists", async () => {
  const result = await executeRisk("user-test", context({}));
  assert.equal(result.evidence_state, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.result.risk_state, "insufficient_evidence");
});

test("opportunity propagates only observed or modeled dependency outputs", async () => {
  const result = await executeOpportunity("user-test", context({
    analysis: dependency("analysis", { transaction_count: 2, spending: [{ label: "observed component", amount: 25 }] }),
    scenario: dependency("scenario", { scenarios: [{ id: "scenario-1" }] }, "SCENARIO"),
  }));

  assert.equal(result.evidence_state, "INFERRED");
  assert.equal(result.result.opportunity_state, "investigation_candidates");
  assert.equal(result.result.provenance?.financial_values_created, false);
});

test("consequence preserves conditional semantics across recursive dependencies", async () => {
  const result = await executeConsequence("user-test", context({
    risk: dependency("risk", { risk_signals: [{ type: "review_signal" }] }, "INFERRED"),
    opportunity: dependency("opportunity", { opportunities: [{ type: "investigation_candidate" }] }, "INFERRED"),
    scenario: dependency("scenario", { scenarios: [{ id: "scenario-1" }] }, "SCENARIO"),
    decision: dependency("decision", { decisions: [{ id: "decision-1" }] }, "INFERRED"),
  }));

  assert.equal(result.evidence_state, "INFERRED");
  assert.equal(result.result.consequence_state, "conditional_implications");
  assert.ok(Array.isArray(result.result.consequences));
  assert.equal(result.result.provenance?.money_movement_executed, false);
});
