import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { computeFullIntelligence } from "./orchestrator.js";

const PLANNER_VERSION = "iris-planner-v1";
const ORCHESTRATOR_VERSION = "iris-orchestrator-v1";
const CERTIFICATION_POLICY_VERSION = "iris-certification-v1";
const CAPABILITY_ID = "iris.full_intelligence";
const OPERATOR_ID = "computeFullIntelligence";
const OPERATOR_VERSION = "1";

type RunRequest = {
  userId: string;
  requestId?: string;
  surface?: string;
  mode?: string;
  requestedCapabilities?: string[];
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function executeIrisRun(request: RunRequest) {
  const userId = request.userId;
  const requestId = request.requestId?.trim() || randomUUID();
  const surface = request.surface || "iris";
  const mode = request.mode || "full_intelligence";
  const requestedCapabilities = request.requestedCapabilities?.length ? request.requestedCapabilities : [CAPABILITY_ID];
  const asOf = new Date().toISOString();

  const { data: existing } = await supabaseAdmin
    .from("iris_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (existing?.id) {
    return existing;
  }

  const initialManifest = {
    user_id: userId,
    request_id: requestId,
    surface,
    mode,
    requested_capabilities: requestedCapabilities,
    as_of: asOf,
    planner_version: PLANNER_VERSION,
    orchestrator_version: ORCHESTRATOR_VERSION,
    certification_policy_version: CERTIFICATION_POLICY_VERSION,
  };

  const { data: run, error: runError } = await supabaseAdmin
    .from("iris_runs")
    .insert({
      request_id: requestId,
      user_id: userId,
      request_surface: surface,
      request_mode: mode,
      requested_capabilities: requestedCapabilities,
      status: "PLANNED",
      as_of: asOf,
      resource_budget: { max_execution_time_ms: 120000, max_graph_nodes: 10000, max_graph_edges: 30000, max_compositions: 5000, max_investigations: 500 },
      execution_policy: { evidence_gated: true, certify_only_after_validation: true, server_authoritative: true },
      planner_version: PLANNER_VERSION,
      orchestrator_version: ORCHESTRATOR_VERSION,
      certification_policy_version: CERTIFICATION_POLICY_VERSION,
      financial_context_hash: hash({ user_id: userId, as_of: asOf }),
      evidence_manifest_hash: hash(initialManifest),
      started_at: asOf,
      updated_at: asOf,
    })
    .select("*")
    .single();

  if (runError || !run) throw new Error(`Unable to create Iris run: ${runError?.message || "unknown error"}`);

  const { data: execution, error: executionError } = await supabaseAdmin
    .from("iris_execution_records")
    .insert({
      run_id: run.id,
      user_id: userId,
      capability_id: CAPABILITY_ID,
      operator_id: OPERATOR_ID,
      operator_version: OPERATOR_VERSION,
      execution_state: "EXECUTING",
      started_at: asOf,
      evidence_state: "CALCULATED",
      validation_status: "UNKNOWN",
      certification_status: "PENDING",
      input_manifest: initialManifest,
    })
    .select("*")
    .single();

  if (executionError || !execution) {
    await failRun(run.id, `EXECUTION_RECORD_CREATE_FAILED: ${executionError?.message || "unknown error"}`);
    throw new Error(`Unable to create Iris execution record: ${executionError?.message || "unknown error"}`);
  }

  await supabaseAdmin.from("iris_runs").update({ status: "EXECUTING", updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);

  const inputHash = hash(initialManifest);
  const { error: inputError } = await supabaseAdmin.from("iris_execution_inputs").insert({
    execution_id: execution.id,
    input_type: "execution_manifest",
    reference_type: "iris_run",
    reference_id: run.id,
    role: "primary",
    hash: inputHash,
  });
  if (inputError) {
    await failExecution(run.id, execution.id, userId, "EXECUTION_INPUT_PERSIST_FAILED", inputError.message);
    throw new Error(`Unable to persist Iris execution input: ${inputError.message}`);
  }

  try {
    const result = await computeFullIntelligence(userId);
    const outputHash = hash(result);
    const finishedAt = new Date().toISOString();

    const { error: outputError } = await supabaseAdmin.from("iris_execution_outputs").insert({
      execution_id: execution.id,
      output_key: "full_intelligence",
      output_type: "intelligence_snapshot",
      value: result,
      hash: outputHash,
      evidence_state: "CALCULATED",
      uncertainty: result?.uncertainty ?? null,
    });
    if (outputError) {
      await failExecution(run.id, execution.id, userId, "EXECUTION_OUTPUT_PERSIST_FAILED", outputError.message);
      throw new Error(`Unable to persist Iris execution output: ${outputError.message}`);
    }

    await supabaseAdmin.from("iris_execution_records").update({
      execution_state: "EXECUTED",
      completed_at: finishedAt,
      input_hash: inputHash,
      output_hash: outputHash,
      output_snapshot: { output_key: "full_intelligence", output_hash: outputHash },
      resource_usage: { duration_ms: Date.parse(finishedAt) - Date.parse(asOf) },
      validation_status: "UNKNOWN",
    }).eq("id", execution.id).eq("user_id", userId);

    await supabaseAdmin.from("iris_runs").update({ status: "EXECUTED", completed_at: finishedAt, updated_at: finishedAt }).eq("id", run.id).eq("user_id", userId);

    const validationDetails = validateExecution(result, inputHash, outputHash);
    const { error: validationError } = await supabaseAdmin.from("iris_validation_results").insert({
      run_id: run.id,
      execution_id: execution.id,
      user_id: userId,
      rule_id: "iris.execution.integrity",
      rule_version: "1",
      status: validationDetails.status,
      severity: validationDetails.status === "PASS" ? "INFO" : "CRITICAL",
      expected: { output_present: true, input_hash_present: true, output_hash_present: true },
      actual: validationDetails.actual,
      details: validationDetails.details,
    });
    if (validationError) {
      await failExecution(run.id, execution.id, userId, "VALIDATION_PERSIST_FAILED", validationError.message);
      throw new Error(`Unable to persist Iris validation: ${validationError.message}`);
    }

    if (validationDetails.status !== "PASS") {
      await supabaseAdmin.from("iris_execution_records").update({ validation_status: "FAIL", certification_status: "NOT_CERTIFIED" }).eq("id", execution.id).eq("user_id", userId);
      await supabaseAdmin.from("iris_runs").update({ status: "VALIDATION_FAILED", failure_code: "VALIDATION_FAILED", failure_message: validationDetails.details, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);
      return { ...run, id: run.id, status: "VALIDATION_FAILED", execution_id: execution.id, result, certified: false };
    }

    const certificationHash = hash({ run_id: run.id, execution_id: execution.id, input_hash: inputHash, output_hash: outputHash, policy: CERTIFICATION_POLICY_VERSION });
    const { error: certificationError } = await supabaseAdmin.from("iris_certifications").insert({
      run_id: run.id,
      execution_id: execution.id,
      user_id: userId,
      result_id: execution.id,
      policy_version: CERTIFICATION_POLICY_VERSION,
      status: "CERTIFIED",
      validation_snapshot: { status: "PASS", rule_id: "iris.execution.integrity", rule_version: "1" },
      reconciliation_snapshot: { status: "NOT_RUN", reason: "Execution integrity gate only; domain reconciliation remains a separate certification gate." },
      evidence_snapshot: { evidence_state: "CALCULATED", evidence_manifest_hash: run.evidence_manifest_hash },
      certification_hash: certificationHash,
      certified_at: new Date().toISOString(),
    });
    if (certificationError) {
      await failExecution(run.id, execution.id, userId, "CERTIFICATION_PERSIST_FAILED", certificationError.message);
      throw new Error(`Unable to persist Iris certification: ${certificationError.message}`);
    }

    const certifiedAt = new Date().toISOString();
    await supabaseAdmin.from("iris_execution_records").update({ validation_status: "PASS", certification_status: "CERTIFIED" }).eq("id", execution.id).eq("user_id", userId);
    await supabaseAdmin.from("iris_runs").update({ status: "CERTIFIED", completed_at: certifiedAt, updated_at: certifiedAt }).eq("id", run.id).eq("user_id", userId);

    return { ...run, id: run.id, status: "CERTIFIED", execution_id: execution.id, result, certified: true, certification_hash: certificationHash };
  } catch (error) {
    await failExecution(run.id, execution.id, userId, "INTELLIGENCE_EXECUTION_FAILED", errorText(error));
    throw error;
  }
}

function validateExecution(result: unknown, inputHash: string, outputHash: string) {
  const outputPresent = result !== null && result !== undefined;
  const hashesPresent = inputHash.length === 64 && outputHash.length === 64;
  return {
    status: outputPresent && hashesPresent ? "PASS" as const : "FAIL" as const,
    actual: { output_present: outputPresent, input_hash_present: inputHash.length === 64, output_hash_present: outputHash.length === 64 },
    details: outputPresent && hashesPresent ? "Execution output and integrity hashes are present." : "Execution output or integrity hashes are missing.",
  };
}

async function failExecution(runId: string, executionId: string, userId: string, code: string, message: string) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("iris_execution_records").update({ execution_state: "FAILED", completed_at: now, validation_status: "FAIL", certification_status: "NOT_CERTIFIED", error_code: code, error_message: message }).eq("id", executionId).eq("user_id", userId);
  await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: code, failure_message: message, completed_at: now, updated_at: now }).eq("id", runId).eq("user_id", userId);
}

async function failRun(runId: string, message: string) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: "EXECUTION_SETUP_FAILED", failure_message: message, completed_at: now, updated_at: now }).eq("id", runId);
}
