import assert from "node:assert/strict";
import test from "node:test";
import { evaluateIrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";

const dependency = { report_id: "report-1", analysis_definition_id: "analysis-1", feature_ids: ["feature-1"], required_evidence_keys: [], resolution_state: "definition_only" as const, upstream_intelligence_node_ids: [] };
const proof = (capability_id: string, dependencyId: string, path: string): SemanticDependencyProof => ({ capability_id, consumed_dependency_ids: [dependencyId], consumed_dependency_hashes: { [dependencyId]: "hash" }, consumed_dependency_paths: { [dependencyId]: [path] }, output_hash: "out", proof_version: "1.2.0" });

test("recognizes complete declared consumption without certifying semantic sufficiency", () => {
  const result = evaluateIrisReportSemanticConsumption({ dependency, capabilityIds: ["analysis"], proofs: [proof("analysis", "temporal", "root.result")] });
  assert.equal(result.state, "verified");
  assert.equal(result.semantic_sufficiency_certified, false);
});

test("rejects missing declared dependency reads", () => {
  const result = evaluateIrisReportSemanticConsumption({ dependency, capabilityIds: ["analysis"], proofs: [proof("analysis", "other", "root.result")] });
  assert.equal(result.state, "partial");
  assert.match(result.missing_dependency_reads.join("\n"), /analysis->temporal:dependency_not_consumed/);
});

test("requires proof for capabilities whose contract requires it", () => {
  const result = evaluateIrisReportSemanticConsumption({ dependency, capabilityIds: ["analysis"], proofs: [] });
  assert.equal(result.state, "unverified");
  assert.deepEqual(result.missing_capability_proofs, ["analysis"]);
});
