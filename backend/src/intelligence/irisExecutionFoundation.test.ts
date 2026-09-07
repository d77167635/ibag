import assert from "node:assert/strict";
import test from "node:test";
import { hashEvidenceManifest } from "./irisEvidenceManifest.js";
import { decideCertification } from "./irisCertificationGate.js";
import type { IrisExecutionRecord, IrisRun, IrisValidationResult } from "./irisExecutionTypes.js";

const run = (status: IrisRun["status"] = "CERTIFYING"): IrisRun => ({
  id: "run-1", request_id: "request-1", user_id: "user-1", request_surface: "test", request_mode: "full_intelligence",
  requested_capabilities: ["iris.full_intelligence"], status, as_of: "2026-09-07T14:00:00.000Z", evidence_boundary: "2026-09-07T13:00:00.000Z",
  evidence_version: "evidence-v1", resource_budget: { max_execution_time_ms: 1, max_memory_budget_mb: 1, max_graph_nodes: 1, max_graph_edges: 1, max_compositions: 1, max_investigations: 1, max_provider_acquisitions: 1, max_concurrent_runs: 1 },
  execution_policy: { version: "p1", certification_policy_version: "c1", resource_budget: { max_execution_time_ms: 1, max_memory_budget_mb: 1, max_graph_nodes: 1, max_graph_edges: 1, max_compositions: 1, max_investigations: 1, max_provider_acquisitions: 1, max_concurrent_runs: 1 }, allow_limited_delivery: false },
  planner_version: "p1", orchestrator_version: "o1", certification_policy_version: "c1", financial_context_hash: null, evidence_manifest_hash: "manifest-v1",
  started_at: null, completed_at: null, failure_code: null, failure_message: null, created_at: "2026-09-07T14:00:00.000Z", updated_at: "2026-09-07T14:00:00.000Z",
});

const execution = (validation_status: IrisExecutionRecord["validation_status"] = "PASS"): IrisExecutionRecord => ({
  id: "execution-1", run_id: "run-1", user_id: "user-1", capability_id: "iris.full_intelligence", operator_id: "test", operator_version: "1",
  execution_state: "EXECUTED", started_at: "2026-09-07T14:00:00.000Z", completed_at: "2026-09-07T14:00:01.000Z", input_hash: "in", output_hash: "out",
  evidence_state: "CALCULATED", input_manifest: {}, output_snapshot: {}, validation_status, certification_status: "PENDING", resource_usage: null, error_code: null, error_message: null,
});

const validation = (status: IrisValidationResult["status"] = "PASS"): IrisValidationResult => ({
  id: "validation-1", run_id: "run-1", execution_id: "execution-1", user_id: "user-1", rule_id: "RULE", rule_version: "1", status, severity: "CRITICAL", expected: true, actual: true, details: null, created_at: "2026-09-07T14:00:01.000Z",
});

test("evidence manifest hashing is deterministic", () => {
  const refs = [{ evidence_type: "product_observation", product: "balance", product_observation_id: "b", evidence_hash: "hb" }, { evidence_type: "product_observation", product: "transactions", product_observation_id: "t", evidence_hash: "ht" }];
  assert.equal(hashEvidenceManifest(refs), hashEvidenceManifest([...refs]));
});

test("certification succeeds only when execution and validation are complete", () => {
  const decision = decideCertification({ run: run(), execution: execution(), evidenceCount: 2, validations: [validation()], ownershipValid: true, temporalValid: true });
  assert.equal(decision.status, "CERTIFIED");
  assert.deepEqual(decision.reasons, []);
});

test("unknown validation can never certify", () => {
  const decision = decideCertification({ run: run(), execution: execution("UNKNOWN"), evidenceCount: 2, validations: [{ ...validation("UNKNOWN") }], ownershipValid: true, temporalValid: true });
  assert.equal(decision.status, "NOT_CERTIFIED");
  assert.ok(decision.reasons.includes("EXECUTION_VALIDATION_NOT_PASS"));
  assert.ok(decision.reasons.includes("VALIDATION_UNKNOWN"));
});

test("missing evidence can never certify", () => {
  const decision = decideCertification({ run: run(), execution: execution(), evidenceCount: 0, validations: [validation()], ownershipValid: true, temporalValid: true });
  assert.equal(decision.status, "NOT_CERTIFIED");
  assert.ok(decision.reasons.includes("NO_EVIDENCE_BOUND_TO_RUN"));
});
