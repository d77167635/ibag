import assert from "node:assert/strict";
import test from "node:test";
import { composeRecursiveReports } from "./irisRecursiveReportComposition.js";
import { evaluateReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";
import { evaluateIrisReportCertificationGate } from "./irisReportCertificationGate.js";

const lineage = { resolution_state: "resolved" as const, report_id: "r", analysis_definition_id: "a", feature_ids: [], capability_ids: ["analysis"], intelligence_node_ids: ["n2"], upstream_intelligence_node_ids: ["n1"], transformation_edge_ids: [], run_evidence_ids: ["e1"], evidence_lineage_present: true, run_id: "run", execution_id: "exec", limitation: null };
const structuralSemanticProofOnly = { report_id: "r", state: "verified" as const, capability_ids: ["analysis"], proof_capability_ids: ["analysis"], missing_capability_proofs: [], missing_dependency_reads: [], semantic_sufficiency_certified: false, semantic_sufficiency_failures: ["analysis:evidence_state_unresolved"], limitation: "structural proof only" };

test("composes multiple report products without imposing a depth ceiling", () => {
  const result = composeRecursiveReports({ components: [
    { report_id: "r1", intelligence_node_ids: ["n10"], upstream_intelligence_node_ids: ["n9"], run_id: "run", execution_id: "exec" },
    { report_id: "r2", intelligence_node_ids: ["n20"], upstream_intelligence_node_ids: ["n10", "n19"], run_id: "run", execution_id: "exec" },
  ], depthByNodeId: { n10: 100, n20: 101 } });
  assert.deepEqual(result.report_ids, ["r1", "r2"]);
  assert.deepEqual(result.intelligence_node_ids, ["n10", "n20"]);
  assert.deepEqual(result.upstream_intelligence_node_ids, ["n19", "n9"]);
  assert.equal(result.depth, 101);
});

test("does not turn missing evidence keys into zero or observations", () => {
  const result = evaluateReportEvidenceBoundary(["transactions", "balance"], [{ evidence_id: "obs-1", evidence_key: "transactions", state: "observed" }]);
  assert.equal(result.state, "partial");
  assert.deepEqual(result.missing_keys, ["balance"]);
  assert.equal(result.observed_evidence_ids[0], "obs-1");
});

test("structural dependency-read proof is not semantic sufficiency", () => {
  const evidence = evaluateReportEvidenceBoundary(["transactions"], [{ evidence_id: "obs-1", evidence_key: "transactions", state: "observed" }]);
  const certified = evaluateIrisReportCertificationGate({ executionStatus: "SUCCEEDED", runtimeLineage: lineage, semanticConsumption: structuralSemanticProofOnly, evidenceBoundary: evidence });
  assert.equal(certified.semantic_dependency_reads_verified, true);
  assert.equal(certified.semantic_sufficiency_verified, false);
  assert.equal(certified.certified, false);
  assert.match(certified.reasons.join("\n"), /semantic_sufficiency_not_certified/);
});

test("certification still requires runtime lineage resolution", () => {
  const evidence = evaluateReportEvidenceBoundary(["transactions"], [{ evidence_id: "obs-1", evidence_key: "transactions", state: "observed" }]);
  const failed = evaluateIrisReportCertificationGate({ executionStatus: "SUCCEEDED", runtimeLineage: { ...lineage, resolution_state: "partially_resolved" }, semanticConsumption: structuralSemanticProofOnly, evidenceBoundary: evidence });
  assert.equal(failed.certified, false);
  assert.match(failed.reasons.join("\n"), /runtime_lineage_not_resolved/);
  assert.match(failed.reasons.join("\n"), /semantic_sufficiency_not_certified/);
});
