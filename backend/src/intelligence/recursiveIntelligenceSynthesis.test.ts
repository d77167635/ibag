import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildRecursiveIntelligenceSynthesis } from "./recursiveIntelligenceSynthesis.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

function result(capability_id: string, evidence_state: CapabilityOperatorResult["evidence_state"], dependencies: string[] = []): CapabilityOperatorResult {
  return {
    capability_id,
    operator_id: capability_id,
    operator_version: "test",
    evidence_state,
    result: {
      evidence_boundary: "2026-01-01T00:00:00.000Z",
      provenance: {
        dependency_capabilities: dependencies.map(id => ({ capability_id: id, evidence_state: "CALCULATED", output_hash: `hash-${id}` })),
      },
    },
  };
}

test("recursive synthesis composes dependency chains without creating financial evidence", () => {
  const results = {
    temporal: result("temporal", "CALCULATED"),
    analysis: result("analysis", "CALCULATED", ["temporal"]),
    relationship: result("relationship", "INFERRED", ["analysis"]),
    causal: result("causal", "INFERRED", ["relationship"]),
    predictive: result("predictive", "PREDICTED", ["causal"]),
    scenario: result("scenario", "SCENARIO", ["predictive", "causal"]),
    decision: result("decision", "INFERRED", ["scenario"]),
    recommendation: result("recommendation", "INFERRED", ["decision"]),
  } satisfies Record<string, CapabilityOperatorResult>;

  const synthesis = buildRecursiveIntelligenceSynthesis(results, {
    runId: "run-1",
    evidenceManifestHash: "manifest-1",
    runEvidenceIds: ["raw-2", "raw-1"],
    evidenceBoundary: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(synthesis.provenance.financial_values_created, false);
  assert.equal(synthesis.provenance.provider_observations_created, false);
  assert.equal(synthesis.provenance.money_movement_executed, false);
  assert.ok(synthesis.composition_depth >= 1);
  assert.ok(synthesis.higher_order_findings.some(f => f.id === "prediction-scenario-chain"));
  assert.ok(synthesis.higher_order_findings.some(f => f.id === "scenario-decision-chain"));
  assert.deepEqual(synthesis.provenance.run_evidence_ids, ["raw-1", "raw-2"]);
});

test("recursive synthesis keeps missing evidence explicit", () => {
  const synthesis = buildRecursiveIntelligenceSynthesis({
    temporal: result("temporal", "CALCULATED"),
    predictive: result("predictive", "INSUFFICIENT_EVIDENCE"),
  });

  assert.ok(synthesis.unresolved_evidence.some(item => item.includes("predictive")));
  assert.equal(synthesis.evidence_profile.complete, false);
  assert.ok(synthesis.higher_order_findings.some(f => f.kind === "evidence_gap" && f.capabilities[0] === "predictive"));
});
