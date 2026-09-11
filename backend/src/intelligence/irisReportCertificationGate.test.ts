import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIrisReportCertificationGate } from "./irisReportCertificationGate.js";
import { evaluateReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";
import type { IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";
import type { IrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";

const lineage: IrisReportRuntimeLineage = {
  resolution_state: "resolved",
  report_id: "report.test",
  analysis_definition_id: "test.analysis",
  feature_ids: ["feature.test"],
  capability_ids: ["capability.test"],
  intelligence_node_ids: ["node-1"],
  upstream_intelligence_node_ids: ["node-0"],
  transformation_edge_ids: ["edge-1"],
  run_evidence_ids: ["evidence-1"],
  evidence_lineage_present: true,
  run_id: "run-1",
  execution_id: "execution-1",
  limitation: null,
};

const semantic: IrisReportSemanticConsumption = {
  report_id: "report.test",
  state: "verified",
  capability_ids: ["capability.test"],
  proof_capability_ids: ["capability.test"],
  missing_capability_proofs: [],
  missing_dependency_reads: [],
  semantic_sufficiency_certified: false,
  limitation: "Structural dependency reads are verified; semantic sufficiency is not certified.",
};

test("report certification remains blocked when the exact evidence-key boundary is not satisfied", () => {
  const boundary = evaluateReportEvidenceBoundary(["financial_state"], []);
  const gate = evaluateIrisReportCertificationGate({ executionStatus: "EXECUTED", runtimeLineage: lineage, semanticConsumption: semantic, evidenceBoundary: boundary });
  assert.equal(boundary.state, "insufficient");
  assert.equal(gate.certified, false);
  assert.deepEqual(gate.reasons, ["evidence_boundary_not_satisfied"]);
});

test("report certification requires every conjunctive condition", () => {
  const boundary = evaluateReportEvidenceBoundary([], []);
  const blockedExecution = evaluateIrisReportCertificationGate({ executionStatus: "FAILED", runtimeLineage: lineage, semanticConsumption: semantic, evidenceBoundary: boundary });
  assert.equal(blockedExecution.certified, false);
  assert.ok(blockedExecution.reasons.includes("execution_not_succeeded"));

  const blockedLineage = evaluateIrisReportCertificationGate({ executionStatus: "EXECUTED", runtimeLineage: { ...lineage, resolution_state: "partially_resolved" }, semanticConsumption: semantic, evidenceBoundary: boundary });
  assert.equal(blockedLineage.certified, false);
  assert.ok(blockedLineage.reasons.includes("runtime_lineage_not_resolved"));

  const blockedSemantic = evaluateIrisReportCertificationGate({ executionStatus: "EXECUTED", runtimeLineage: lineage, semanticConsumption: { ...semantic, state: "partial" }, evidenceBoundary: boundary });
  assert.equal(blockedSemantic.certified, false);
  assert.ok(blockedSemantic.reasons.includes("declared_semantic_dependency_reads_not_verified"));
});
