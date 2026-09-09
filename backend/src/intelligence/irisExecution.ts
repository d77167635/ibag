import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { dispatchGovernedCapability } from "./capabilityDispatcher.js";
import { planCapabilities } from "./capabilityPlanner.js";
import { evaluateCertificationGate } from "./certificationGate.js";
import { resolveCanonicalProviderItem, IRIS_CANONICAL_PROVIDER_DOMAINS, type IrisEvidenceScope } from "./evidenceScope.js";

const PLANNER_VERSION = "iris-planner-v2";
const ORCHESTRATOR_VERSION = "iris-orchestrator-v1";
const CERTIFICATION_POLICY_VERSION = "iris-certification-v2";
const CAPABILITY_ID = "iris.full_intelligence";
const OPERATOR_ID = "computeFullIntelligence";
const OPERATOR_VERSION = "1";
const DEFAULT_REQUESTED_CAPABILITIES = [CAPABILITY_ID];

type RunRequest = { userId: string; requestId?: string; surface?: string; mode?: string; requestedCapabilities?: string[] };
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }

/** Single governed execution boundary. AI never supplies financial evidence; every financial result originates from authorized persisted observations or deterministic derived calculations. */
export async function executeIrisRun(request: RunRequest) {
  const userId = request.userId;
  const requestId = request.requestId?.trim() || randomUUID();
  const surface = request.surface || "iris";
  const mode = request.mode || "full_intelligence";
  const requestedCapabilities = request.requestedCapabilities?.length ? request.requestedCapabilities : DEFAULT_REQUESTED_CAPABILITIES;
  const asOf = new Date().toISOString();

  const { data: existing } = await supabaseAdmin.from("iris_runs").select("*").eq("user_id", userId).eq("request_id", requestId).maybeSingle();
  if (existing?.id) {
    const { data: existingExecution } = await supabaseAdmin.from("iris_execution_records").select("id").eq("run_id", existing.id).eq("user_id", userId).maybeSingle();
    const { data: output } = existingExecution ? await supabaseAdmin.from("iris_execution_outputs").select("value,hash,evidence_state").eq("execution_id", existingExecution.id).maybeSingle() : { data: null };
    return { ...existing, execution_id: existingExecution?.id ?? null, result: output?.value ?? null, output_hash: output?.hash ?? null, certified: existing.status === "CERTIFIED" };
  }

  const selectedItemId = await resolveCanonicalProviderItem(userId);
  const evidenceScope: IrisEvidenceScope = { kind: selectedItemId ? "provider_item" : "user_aggregate", selectedItemId, canonicalProviderDomains: IRIS_CANONICAL_PROVIDER_DOMAINS };
  const plan = await planCapabilities(userId, requestedCapabilities);
  if (plan.status === "BLOCKED") throw new Error(`CAPABILITY_PLAN_BLOCKED: ${plan.limitations.join(" | ")}`);

  const initialManifest = { user_id: userId, request_id: requestId, surface, mode, requested_capabilities: requestedCapabilities, capability_plan: plan, evidence_scope: evidenceScope, as_of: asOf, planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION, financial_evidence_policy: "NO_AI_GENERATED_FINANCIAL_EVIDENCE" };
  const { data: run, error: runError } = await supabaseAdmin.from("iris_runs").insert({ request_id: requestId, user_id: userId, request_surface: surface, request_mode: mode, requested_capabilities: requestedCapabilities, status: "PLANNED", as_of: asOf, evidence_boundary: asOf, evidence_version: "provider-observation-boundary-v2", resource_budget: { max_execution_time_ms: 120000, max_graph_nodes: 10000, max_graph_edges: 30000, max_compositions: 5000, max_investigations: 500 }, execution_policy: { evidence_gated: true, no_ai_generated_financial_evidence: true, certify_only_after_validation: true, server_authoritative: true, capability_plan_status: plan.status, evidence_scope_kind: evidenceScope.kind, selected_item_id: selectedItemId, canonical_provider_domains: [...IRIS_CANONICAL_PROVIDER_DOMAINS] }, planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION, financial_context_hash: hash({ user_id: userId, as_of: asOf, evidence_scope: evidenceScope }), evidence_manifest_hash: hash(initialManifest), started_at: asOf, updated_at: asOf }).select("*").single();
  if (runError || !run) throw new Error(`Unable to create Iris run: ${runError?.message || "unknown error"}`);

  const { data: execution, error: executionError } = await supabaseAdmin.from("iris_execution_records").insert({ run_id: run.id, user_id: userId, capability_id: CAPABILITY_ID, operator_id: OPERATOR_ID, operator_version: OPERATOR_VERSION, execution_state: "EXECUTING", started_at: asOf, evidence_state: "CALCULATED", validation_status: "UNKNOWN", certification_status: "PENDING", input_manifest: initialManifest }).select("*").single();
  if (executionError || !execution) { await failRun(run.id, userId, `EXECUTION_RECORD_CREATE_FAILED: ${executionError?.message || "unknown error"}`); throw new Error(`Unable to create Iris execution record: ${executionError?.message || "unknown error"}`); }
  await supabaseAdmin.from("iris_runs").update({ status: "EXECUTING", updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);

  const inputHash = hash(initialManifest);
  const { error: inputError } = await supabaseAdmin.from("iris_execution_inputs").insert({ execution_id: execution.id, input_type: "execution_manifest", reference_type: "iris_run", reference_id: run.id, role: "primary", hash: inputHash });
  if (inputError) { await failExecution(run.id, execution.id, userId, "EXECUTION_INPUT_PERSIST_FAILED", inputError.message); throw new Error(`Unable to persist Iris execution input: ${inputError.message}`); }

  try {
    const dispatchedResults: Record<string, unknown> = {};
    for (const capabilityId of plan.ordered_capabilities) {
      const dispatched = await dispatchGovernedCapability({ userId, capabilityId });
      dispatchedResults[capabilityId] = dispatched.result;
    }

    let result: any;
    if (requestedCapabilities.includes(CAPABILITY_ID)) {
      const aggregate = await dispatchGovernedCapability({ userId, capabilityId: CAPABILITY_ID });
      result = aggregate.result;
    } else {
      result = { capability_results: dispatchedResults, capability_plan: plan, evidence_policy: "NO_AI_GENERATED_FINANCIAL_EVIDENCE" };
    }

    const providerSelectedItemId = result?.layer_metrics?.provider_domains?.selected_item_id ?? null;
    if (selectedItemId && providerSelectedItemId !== selectedItemId) throw new Error(`EVIDENCE_SCOPE_MISMATCH: execution=${selectedItemId} provider_intelligence=${providerSelectedItemId ?? "null"}`);
    const outputHash = hash(result);
    const finishedAt = new Date().toISOString();
    const { error: outputError } = await supabaseAdmin.from("iris_execution_outputs").insert({ execution_id: execution.id, output_key: "full_intelligence", output_type: "intelligence_snapshot", value: result, hash: outputHash, evidence_state: "CALCULATED", uncertainty: result?.uncertainty ?? null });
    if (outputError) { await failExecution(run.id, execution.id, userId, "EXECUTION_OUTPUT_PERSIST_FAILED", outputError.message); throw new Error(`Unable to persist Iris execution output: ${outputError.message}`); }

    let evidenceQuery = supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,effective_at,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed");
    if (selectedItemId) evidenceQuery = evidenceQuery.eq("item_id", selectedItemId);
    const rawEvidence = (await evidenceQuery).data ?? [];
    if (rawEvidence.length) {
      const evidenceRows = rawEvidence.map(e => ({ run_id: run.id, user_id: userId, evidence_type: "provider_raw_observation", provider: "plaid", product: e.product, raw_observation_id: e.id, effective_at: e.effective_at ?? e.acquired_at, acquired_at: e.acquired_at, evidence_hash: hash(e.raw_response) }));
      const { error: evidenceInsertError } = await supabaseAdmin.from("iris_run_evidence").insert(evidenceRows);
      if (evidenceInsertError) { await failExecution(run.id, execution.id, userId, "RUN_EVIDENCE_PERSIST_FAILED", evidenceInsertError.message); throw new Error(`Unable to persist Iris run evidence: ${evidenceInsertError.message}`); }
    }
    const evidenceBoundary = result?.evidence_boundary || finishedAt;
    await supabaseAdmin.from("iris_runs").update({ evidence_boundary: evidenceBoundary, evidence_version: "provider-observation-boundary-v2", status: "EXECUTED", completed_at: finishedAt, updated_at: finishedAt }).eq("id", run.id).eq("user_id", userId);
    await supabaseAdmin.from("iris_execution_records").update({ execution_state: "EXECUTED", completed_at: finishedAt, input_hash: inputHash, output_hash: outputHash, output_snapshot: { output_key: "full_intelligence", output_hash: outputHash, evidence_scope: evidenceScope, dispatched_capability: requestedCapabilities, plan_order: plan.ordered_capabilities }, resource_usage: { duration_ms: Date.parse(finishedAt) - Date.parse(asOf), planner_nodes: plan.resource_estimate.nodes, planner_edges: plan.resource_estimate.edges, planner_compositions: plan.resource_estimate.compositions }, validation_status: "UNKNOWN" }).eq("id", execution.id).eq("user_id", userId);

    const gate = await evaluateCertificationGate({ runId: run.id, executionId: execution.id, userId, inputHash, outputHash });
    const validationRows = Object.entries(gate.checks).map(([ruleId, gateCheck]) => ({ run_id: run.id, execution_id: execution.id, user_id: userId, rule_id: ruleId, rule_version: CERTIFICATION_POLICY_VERSION, status: gateCheck.status, severity: gateCheck.status === "PASS" ? "INFO" : "CRITICAL", expected: { status: "PASS" }, actual: { status: gateCheck.status }, details: { message: gateCheck.details, gate_version: CERTIFICATION_POLICY_VERSION } }));
    const { error: validationError } = await supabaseAdmin.from("iris_validation_results").insert(validationRows);
    if (validationError) { await failExecution(run.id, execution.id, userId, "VALIDATION_PERSIST_FAILED", validationError.message); throw new Error(`Unable to persist Iris validation: ${validationError.message}`); }

    if (!gate.eligible) {
      const message = `Certification blocked: ${gate.critical_failures.join(", ")}`;
      await supabaseAdmin.from("iris_execution_records").update({ validation_status: "FAIL", certification_status: "NOT_CERTIFIED" }).eq("id", execution.id).eq("user_id", userId);
      await supabaseAdmin.from("iris_runs").update({ status: "VALIDATION_FAILED", failure_code: "CERTIFICATION_GATE_FAILED", failure_message: message, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);
      return { ...run, id: run.id, status: "VALIDATION_FAILED", execution_id: execution.id, result, certified: false, certification_gate: gate };
    }

    const { error: validationStateError } = await supabaseAdmin.from("iris_execution_records").update({ validation_status: "PASS" }).eq("id", execution.id).eq("user_id", userId);
    if (validationStateError) { await failExecution(run.id, execution.id, userId, "VALIDATION_STATE_UPDATE_FAILED", validationStateError.message); throw new Error(`Unable to finalize Iris validation state: ${validationStateError.message}`); }

    const certificationHash = hash({ run_id: run.id, execution_id: execution.id, input_hash: inputHash, output_hash: outputHash, policy: CERTIFICATION_POLICY_VERSION, evidence: gate.evidence_snapshot, reconciliation: gate.reconciliation_snapshot });
    const { error: certificationError } = await supabaseAdmin.from("iris_certifications").insert({ run_id: run.id, execution_id: execution.id, user_id: userId, result_id: execution.id, policy_version: CERTIFICATION_POLICY_VERSION, status: "CERTIFIED", validation_snapshot: { status: "PASS", checks: gate.checks }, reconciliation_snapshot: gate.reconciliation_snapshot, evidence_snapshot: gate.evidence_snapshot, certification_hash: certificationHash, certified_at: new Date().toISOString() });
    if (certificationError) { await failExecution(run.id, execution.id, userId, "CERTIFICATION_PERSIST_FAILED", certificationError.message); throw new Error(`Unable to persist Iris certification: ${certificationError.message}`); }

    const certifiedAt = new Date().toISOString();
    await supabaseAdmin.from("iris_execution_records").update({ validation_status: "PASS", certification_status: "CERTIFIED" }).eq("id", execution.id).eq("user_id", userId);
    await supabaseAdmin.from("iris_runs").update({ status: "CERTIFIED", completed_at: certifiedAt, updated_at: certifiedAt }).eq("id", run.id).eq("user_id", userId);
    return { ...run, id: run.id, status: "CERTIFIED", execution_id: execution.id, result, certified: true, certification_hash: certificationHash, certification_gate: gate };
  } catch (error) { await failExecution(run.id, execution.id, userId, "INTELLIGENCE_EXECUTION_FAILED", errorText(error)); throw error; }
}

async function failExecution(runId: string, executionId: string, userId: string, code: string, message: string) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("iris_execution_records").update({ execution_state: "FAILED", completed_at: now, validation_status: "FAIL", certification_status: "NOT_CERTIFIED", error_code: code, error_message: message }).eq("id", executionId).eq("user_id", userId);
  await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: code, failure_message: message, completed_at: now, updated_at: now }).eq("id", runId).eq("user_id", userId);
}
async function failRun(runId: string, userId: string, message: string) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: "EXECUTION_SETUP_FAILED", failure_message: message, completed_at: now, updated_at: now }).eq("id", runId).eq("user_id", userId);
}
