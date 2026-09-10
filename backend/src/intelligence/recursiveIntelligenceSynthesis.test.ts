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

test("recursive synthesis exposes foundational life-state and higher-order risk chains", () => {
  const synthesis = buildRecursiveIntelligenceSynthesis({
    financial_life_state: result("financial_life_state", "CALCULATED"),
    relational_ontology: result("relational_ontology", "CALCULATED", ["financial_life_state"]),
    analysis: result("analysis", "CALCULATED"),
    behavioral: result("behavioral", "CALCULATED", ["analysis"]),
    anomaly: result("anomaly", "CALCULATED", ["analysis", "behavioral"]),
    predictive: result("predictive", "PREDICTED", ["analysis"]),
    risk: result("risk", "INFERRED", ["analysis", "behavioral", "anomaly", "predictive"]),
    opportunity: result("opportunity", "INFERRED", ["analysis", "behavioral"]),
    consequence: result("consequence", "INFERRED", ["risk", "opportunity"]),
  });

  assert.ok(synthesis.higher_order_findings.some(f => f.id === "life-state-ontology-foundation"));
  assert.ok(synthesis.higher_order_findings.some(f => f.id === "risk-opportunity-interaction"));
  assert.ok(synthesis.higher_order_findings.some(f => f.id === "risk-opportunity-consequence-chain"));
  assert.ok(synthesis.higher_order_findings.some(f => f.capabilities.includes("consequence") && f.kind === "chain"));
});

test("generic recursive composition traverses beyond the former 32-level guard", () => {
  const results: Record<string, CapabilityOperatorResult> = {};
  const depth = 40;
  for (let index = 0; index < depth; index += 1) {
    const id = `layer_${index}`;
    results[id] = result(id, "CALCULATED", index === 0 ? [] : [`layer_${index - 1}`]);
  }

  const synthesis = buildRecursiveIntelligenceSynthesis(results);

  assert.equal(synthesis.composition_depth, depth);
  assert.ok(synthesis.higher_order_findings.some(f => f.kind === "chain" && f.capabilities.length === depth));
});
