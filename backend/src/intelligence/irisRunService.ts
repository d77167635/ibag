import { createHash, randomUUID } from "node:crypto";
import { computeFullIntelligence } from "./orchestrator.js";
import { getCertifiedEvidenceBoundary } from "./certifiedEvidenceBoundary.js";
import { buildEvidenceManifest, persistRunEvidence } from "./irisEvidenceManifest.js";
import { createRun, failRun, getRun, transitionRun } from "./irisRunRepository.js";
import { startExecution, completeExecution, getExecution, failExecution, recordInput, recordOutput, updateExecutionValidation } from "./irisExecutionRepository.js";
import { getRunValidations, recordValidation } from "./irisValidationRepository.js";
import { recordCertification, updateExecutionCertification } from "./irisCertificationRepository.js";
import { decideCertification } from "./irisCertificationGate.js";
import { recordRuntimeAudit } from "./irisRuntimeAudit.js";
import type { IrisExecutionPolicy, IrisResult, IrisRun, IrisResourceBudget } from "./irisExecutionTypes.js";

const DEFAULT_BUDGET: IrisResourceBudget = {
  max_execution_time_ms: 120_000, max_memory_budget_mb: 512, max_graph_nodes: 2_000, max_graph_edges: 4_000,
  max_compositions: 96, max_investigations: 24, max_provider_acquisitions: 16, max_concurrent_runs: 1,
};
const POLICY: IrisExecutionPolicy = {
  version: "IRIS_EXECUTION_POLICY_V1", certification_policy_version: "IRIS_CERTIFICATION_POLICY_V1",
  resource_budget: DEFAULT_BUDGET, allow_limited_delivery: true,
};

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function outputSummary(result: any) {
  return {
    generated_at: result.generated_at ?? null,
    evidence_boundary: result.evidence_boundary ?? null,
    source_fidelity_status: result.source_fidelity?.status ?? null,
    higher_order_ready: result.intelligence_gate?.higher_order_conclusions_enabled ?? false,
    integrity_status: result.integrity?.status ?? null,
    atlas_counts: result.intelligence_atlas?.counts ?? null,
    investigation_count: result.investigations?.investigations?.length ?? 0,
    composition_counts: result.intelligence_composition?.counts ?? null,
  };
}

export async function executeIrisFullIntelligenceRun(input: {
  userId: string; requestId?: string; requestSurface?: string; requestMode?: string; requestedCapabilities?: string[]; asOf?: string;
}): Promise<{ run: IrisRun; result: IrisResult; intelligence: any }> {
  const requestId = input.requestId ?? randomUUID();
  const asOf = input.asOf ?? new Date().toISOString();
  const evidenceBoundary = await getCertifiedEvidenceBoundary(input.userId);
  const manifest = await buildEvidenceManifest(input.userId, evidenceBoundary);
  const run = await createRun({
    request_id: requestId, user_id: input.userId, request_surface: input.requestSurface ?? "dashboard", request_mode: input.requestMode ?? "full_intelligence",
    requested_capabilities: input.requestedCapabilities ?? ["iris.full_intelligence"], status: "PLANNED", as_of: asOf,
    evidence_boundary: evidenceBoundary, evidence_version: manifest.hash, resource_budget: DEFAULT_BUDGET, execution_policy: POLICY,
    planner_version: "IRIS_PLANNER_V1", orchestrator_version: "ORCHESTRATOR_COMPAT_737CEF", certification_policy_version: POLICY.certification_policy_version,
    financial_context_hash: null, evidence_manifest_hash: manifest.hash, started_at: null, completed_at: null, failure_code: null, failure_message: null,
  });

  let executionId: string | null = null;
  try {
    await persistRunEvidence(run.id, input.userId, manifest.references);
    await transitionRun(input.userId, run.id, "EXECUTING", { started_at: new Date().toISOString() });
    const execution = await startExecution({
      run_id: run.id, user_id: input.userId, capability_id: "iris.full_intelligence", operator_id: "computeFullIntelligence", operator_version: "ORCHESTRATOR_COMPAT_737CEF",
      execution_state: "EXECUTING", input_hash: manifest.hash, output_hash: null, evidence_state: manifest.references.length ? "OBSERVED" : "INSUFFICIENT_EVIDENCE",
      input_manifest: { evidence_manifest_hash: manifest.hash, evidence_count: manifest.references.length }, output_snapshot: null,
      validation_status: "UNKNOWN", certification_status: "PENDING", resource_usage: null, error_code: null, error_message: null,
    });
    executionId = execution.id;
    await recordInput({ execution_id: execution.id, input_type: "evidence_manifest", reference_type: "iris_run", reference_id: run.id, role: "governance_boundary", hash: manifest.hash });

    const intelligence: any = await computeFullIntelligence(input.userId);
    const outputHash = hashValue(intelligence);
    const summary = outputSummary(intelligence);
    await completeExecution(input.userId, execution.id, manifest.hash, outputHash, summary);
    await recordOutput({ execution_id: execution.id, output_key: "full_intelligence", output_type: "summary", value: summary, hash: outputHash, evidence_state: "CALCULATED", uncertainty: intelligence.uncertainty ?? null });
    await transitionRun(input.userId, run.id, "EXECUTED", { completed_at: new Date().toISOString() });
    await transitionRun(input.userId, run.id, "VALIDATING");

    const validationInputs = [
      { rule_id: "EVIDENCE_BOUND", status: manifest.references.length ? "PASS" : "FAIL", severity: "CRITICAL", expected: ">0 evidence references", actual: manifest.references.length },
      { rule_id: "EXECUTION_COMPLETE", status: "PASS", severity: "CRITICAL", expected: "EXECUTED", actual: "EXECUTED" },
      { rule_id: "OUTPUT_HASH_PRESENT", status: outputHash ? "PASS" : "FAIL", severity: "CRITICAL", expected: "sha256", actual: outputHash ? "sha256" : null },
      { rule_id: "CANONICAL_INPUT_INTEGRITY", status: intelligence.integrity?.status === "fail" ? "FAIL" : "PASS", severity: "CRITICAL", expected: "not fail", actual: intelligence.integrity?.status ?? null },
    ] as const;
    for (const validation of validationInputs) {
      await recordValidation({ user_id: input.userId, run_id: run.id, execution_id: execution.id, rule_id: validation.rule_id, rule_version: "IRIS_VALIDATION_V1", status: validation.status, severity: validation.severity, expected: validation.expected, actual: validation.actual, details: null });
    }

    const validations = await getRunValidations(input.userId, run.id);
    const refreshedRun = await getRun(input.userId, run.id);
    if (!refreshedRun) throw new Error("IRIS_RUN_NOT_FOUND_AFTER_EXECUTION");
    const allPass = validations.length > 0 && validations.every(v => v.status === "PASS");
    await updateExecutionValidation(input.userId, execution.id, allPass ? "PASS" : validations.some(v => v.status === "FAIL") ? "FAIL" : "LIMITED");
    const executionForCertification = await getExecution(input.userId, execution.id);
    if (!executionForCertification) throw new Error("IRIS_EXECUTION_RECORD_NOT_FOUND_AFTER_VALIDATION");
    const decision = decideCertification({
      run: refreshedRun, execution: executionForCertification, evidenceCount: manifest.references.length, validations,
      ownershipValid: true, temporalValid: new Date(asOf).getTime() >= (evidenceBoundary ? new Date(evidenceBoundary).getTime() : 0),
    });

    if (decision.status === "CERTIFIED") {
      await transitionRun(input.userId, run.id, "VALIDATED");
      await transitionRun(input.userId, run.id, "CERTIFYING");
    } else {
      await transitionRun(input.userId, run.id, "VALIDATION_FAILED");
    }
    await updateExecutionCertification(input.userId, execution.id, decision.status);
    await recordCertification({
      user_id: input.userId, run_id: run.id, execution_id: execution.id, result_id: null, policy_version: POLICY.certification_policy_version,
      status: decision.status, validation_snapshot: { rules: validations.map(v => ({ rule_id: v.rule_id, status: v.status, severity: v.severity })) },
      reconciliation_snapshot: {}, evidence_snapshot: { evidence_count: manifest.references.length, evidence_manifest_hash: manifest.hash },
      certification_hash: decision.certification_hash, certified_at: decision.status === "CERTIFIED" ? new Date().toISOString() : null,
    });
    const finalRun = decision.status === "CERTIFIED"
      ? await transitionRun(input.userId, run.id, "CERTIFIED", { completed_at: new Date().toISOString() })
      : (await getRun(input.userId, run.id))!;
    await recordRuntimeAudit({
      userId: input.userId, runId: finalRun.id, layerId: "iris.full_intelligence", analysisId: "computeFullIntelligence",
      inputManifest: { evidence_manifest_hash: manifest.hash, evidence_count: manifest.references.length }, inputHash: manifest.hash,
      outputHash, outputSnapshot: summary, evidenceState: manifest.references.length ? "calculated" : "insufficient_evidence",
      deliveryVerified: false, postUsageVerified: false, populatedVerified: true, verificationErrors: decision.reasons,
    });
    const result: IrisResult = {
      result_id: randomUUID(), run_id: finalRun.id, capability_id: "iris.full_intelligence", generated_at: new Date().toISOString(),
      evidence_as_of: finalRun.evidence_boundary, evidence_version: finalRun.evidence_version, observation_window: { as_of: finalRun.as_of },
      execution_state: "EXECUTED", validation_state: allPass ? "PASS" : "FAIL", certification_state: decision.status,
      delivery_state: decision.status === "CERTIFIED" ? "DELIVERED" : "WITHHELD", evidence_state: manifest.references.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE",
      values: summary, uncertainty: intelligence.uncertainty ?? null, limitations: decision.reasons, provenance: manifest.references,
    };
    return { run: finalRun, result, intelligence };
  } catch (error) {
    if (executionId) await failExecution(input.userId, executionId, "IRIS_EXECUTION_FAILED", error instanceof Error ? error.message : String(error)).catch(() => undefined);
    await failRun(input.userId, run.id, "IRIS_EXECUTION_FAILED", error instanceof Error ? error.message : String(error)).catch(() => undefined);
    throw error;
  }
}
