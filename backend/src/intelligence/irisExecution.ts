import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { planCapabilities } from "./capabilityPlanner.js";
import { executeRecursiveCapabilityPlan } from "./recursiveCapabilityExecutor.js";
import { persistRecursiveLineage } from "./recursiveLineage.js";
import { persistUserIntelligenceGraph } from "./persistedIntelligenceGraph.js";
import { materializeArbitraryRecursiveCompositions } from "./arbitraryRecursiveComposition.js";
import { evaluateCertificationGate } from "./certificationGate.js";
import { resolveCanonicalProviderItem, IRIS_CANONICAL_PROVIDER_DOMAINS, type IrisEvidenceScope } from "./evidenceScope.js";

const PLANNER_VERSION = "iris-capability-planner-v6";
const ORCHESTRATOR_VERSION = "iris-recursive-orchestrator-v2";
const CERTIFICATION_POLICY_VERSION = "iris-certification-v3";
const CAPABILITY_ID = "iris.full_intelligence";
const EXECUTOR_OPERATOR_ID = "recursiveCapabilityExecutor";
const EXECUTOR_OPERATOR_VERSION = "iris-recursive-capability-executor-v11";
const DEFAULT_REQUESTED_CAPABILITIES = [CAPABILITY_ID];

type RunRequest = { userId: string; requestId?: string; surface?: string; mode?: string; requestedCapabilities?: string[] };
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }

/** The single governed Iris execution boundary. A full-intelligence request expands through the persisted capability registry and executes the resulting dependency graph; produced outputs are also materialized as a durable user intelligence graph without imposing a semantic depth ceiling. */
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

  const initialManifest = { user_id: userId, request_id: requestId, surface, mode, requested_capabilities: requestedCapabilities, capability_plan: plan, evidence_scope: evidenceScope, as_of: asOf, planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION };
  const { data: run, error: runError } = await supabaseAdmin.from("iris_runs").insert({
    request_id: requestId, user_id: userId, request_surface: surface, request_mode: mode, requested_capabilities: requestedCapabilities,
    status: "PLANNED", as_of: asOf, evidence_boundary: asOf, evidence_version: "provider-observation-boundary-v3",
    resource_budget: { max_execution_time_ms: 120000, max_graph_nodes: 10000, max_graph_edges: 30000, max_compositions: 5000 },
    execution_policy: { evidence_gated: true, certify_only_after_validation: true, server_authoritative: true, capability_plan_status: plan.status, evidence_scope_kind: evidenceScope.kind, selected_item_id: selectedItemId, canonical_provider_domains: [...IRIS_CANONICAL_PROVIDER_DOMAINS], recursive_executor: EXECUTOR_OPERATOR_ID, recursive_executor_version: EXECUTOR_OPERATOR_VERSION },
    planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION,
    financial_context_hash: hash({ user_id: userId, as_of: asOf, evidence_scope: evidenceScope }), evidence_manifest_hash: hash(initialManifest), started_at: asOf, updated_at: asOf,
  }).select("*").single();
  if (runError || !run) throw new Error(`Unable to create Iris run: ${runError?.message || "unknown error"}`);

  const evidenceQuery = supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,effective_at,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed");
  const scopedEvidenceQuery = selectedItemId ? evidenceQuery.eq("item_id", selectedItemId) : evidenceQuery;
  const rawEvidence = (await scopedEvidenceQuery).data ?? [];
  const evidenceRows = rawEvidence.map(e => ({ run_id: run.id, user_id: userId, evidence_type: "provider_raw_observation", provider: "plaid", product: e.product, raw_observation_id: e.id, effective_at: e.effective_at ?? e.acquired_at, acquired_at: e.acquired_at, evidence_hash: hash(e.raw_response) }));
  let runEvidenceIds: string[] = [];
  if (evidenceRows.length) {
    const { data: insertedEvidence, error: evidenceInsertError } = await supabaseAdmin.from("iris_run_evidence").insert(evidenceRows).select("id");
    if (evidenceInsertError) { await failRun(run.id, userId, `RUN_EVIDENCE_PERSIST_FAILED: ${evidenceInsertError.message}`); throw new Error(`Unable to persist Iris run evidence: ${evidenceInsertError.message}`); }
    runEvidenceIds = (insertedEvidence ?? []).map(row => row.id).filter((id): id is string => typeof id === "string");
  }

  const executionManifest = { ...initialManifest, run_id: run.id, run_evidence_ids: [...runEvidenceIds].sort(), evidence_count: runEvidenceIds.length };
  const inputHash = hash(executionManifest);
  const { data: execution, error: executionError } = await supabaseAdmin.from("iris_execution_records").insert({
    run_id: run.id, user_id: userId, capability_id: CAPABILITY_ID, operator_id: EXECUTOR_OPERATOR_ID, operator_version: EXECUTOR_OPERATOR_VERSION,
    execution_state: "EXECUTING", started_at: asOf, evidence_state: "CALCULATED", validation_status: "UNKNOWN", certification_status: "PENDING", input_manifest: executionManifest, input_hash: inputHash,
  }).select("*").single();
  if (executionError || !execution) { await failRun(run.id, userId, `EXECUTION_RECORD_CREATE_FAILED: ${executionError?.message || "unknown error"}`); throw new Error(`Unable to create Iris execution record: ${executionError?.message || "unknown error"}`); }
  await supabaseAdmin.from("iris_runs").update({ status: "EXECUTING", evidence_version: "provider-observation-boundary-v3", updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);

  const { error: inputError } = await supabaseAdmin.from("iris_execution_inputs").insert({ execution_id: execution.id, input_type: "execution_manifest", reference_type: "iris_run", reference_id: run.id, role: "primary", hash: inputHash });
  if (inputError) { await failExecution(run.id, execution.id, userId, "EXECUTION_INPUT_PERSIST_FAILED", inputError.message); throw new Error(`Unable to persist Iris execution input: ${inputError.message}`); }

  try {
    const recursive = await executeRecursiveCapabilityPlan(userId, plan, {
      runId: run.id, executionId: execution.id, asOf, evidenceBoundary: run.evidence_boundary, evidenceManifestHash: run.evidence_manifest_hash, runEvidenceIds,
      persistGraphNode: ({ capabilityId, result, dependencyResults, dependencyNodeIds }) => persistUserIntelligenceGraph({ userId, runId: run.id, executionId: execution.id, capabilityId, result, dependencyResults, dependencyNodeIds }),
      persistLineage: ({ capabilityId, result, dependencyResults }) => persistRecursiveLineage({ userId, runId: run.id, executionId: execution.id, capabilityId, result, dependencyResults, runEvidenceIds }),
    }, { maxNodes: 10000, maxEdges: 30000, maxCompositions: 5000 });

    if (recursive.status !== "COMPLETED") {
      const code = recursive.status === "EXECUTION_BUDGET_EXCEEDED" ? "EXECUTION_BUDGET_EXCEEDED" : "RECURSIVE_CAPABILITY_EXECUTION_FAILED";
      const message = recursive.error || `Recursive capability execution ended with ${recursive.status}.`;
      await failExecution(run.id, execution.id, userId, code, message);
      return { ...run, id: run.id, status: "FAILED", execution_id: execution.id, result: recursive, certified: false };
    }

    const emergentResult = recursive.results.emergent?.result;
    const higherOrderFindings = emergentResult && typeof emergentResult === "object" && Array.isArray((emergentResult as Record<string, unknown>).higher_order_findings)
      ? (emergentResult as { higher_order_findings: Parameters<typeof materializeArbitraryRecursiveCompositions>[0]["synthesis"]["higher_order_findings"] }).higher_order_findings
      : null;
    const arbitraryRecursiveCompositions = higherOrderFindings
      ? await materializeArbitraryRecursiveCompositions({
          userId,
          runId: run.id,
          executionId: execution.id,
          capabilityNodeIds: recursive.graph_node_ids,
          evidenceBoundary: run.evidence_boundary,
          evidenceManifestHash: run.evidence_manifest_hash,
          runEvidenceIds,
          synthesis: { ...(emergentResult as object), higher_order_findings: higherOrderFindings } as Parameters<typeof materializeArbitraryRecursiveCompositions>[0]["synthesis"],
        })
      : { materializedNodeIds: [], skippedFindingIds: [] };

    const result = {
      architecture_version: "IRIS_RECURSIVE_CAPABILITY_GRAPH_V2", execution_status: recursive.status, requested_capabilities: requestedCapabilities,
      ordered_capabilities: recursive.ordered_capabilities, executed_capabilities: recursive.executed_capabilities, results: recursive.results, graph_node_ids: recursive.graph_node_ids, resource_usage: recursive.resource_usage, arbitrary_recursive_compositions: arbitraryRecursiveCompositions,
      evidence_scope: evidenceScope, evidence_boundary: run.evidence_boundary,
      provenance: { source: "governed_capability_registry_and_run_bound_evidence", run_id: run.id, run_evidence_ids: [...runEvidenceIds].sort(), evidence_manifest_hash: run.evidence_manifest_hash, planner_version: PLANNER_VERSION, executor_version: EXECUTOR_OPERATOR_VERSION, persisted_graph_version: "iris-persisted-intelligence-graph-v5", arbitrary_composition_version: "iris-arbitrary-recursive-composition-v2", financial_values_created: false, provider_observations_created: false, money_movement_executed: false },
    };
    const outputHash = hash(result); const finishedAt = new Date().toISOString();
    const { error: outputError } = await supabaseAdmin.from("iris_execution_outputs").insert({ execution_id: execution.id, output_key: "recursive_intelligence_graph", output_type: "recursive_intelligence_graph", value: result, hash: outputHash, evidence_state: "CALCULATED", uncertainty: null });
    if (outputError) { await failExecution(run.id, execution.id, userId, "EXECUTION_OUTPUT_PERSIST_FAILED", outputError.message); throw new Error(`Unable to persist Iris execution output: ${outputError.message}`); }

    await supabaseAdmin.from("iris_runs").update({ status: "EXECUTED", completed_at: finishedAt, updated_at: finishedAt }).eq("id", run.id).eq("user_id", userId);
    const { error: executionStateError } = await supabaseAdmin.from("iris_execution_records").update({ execution_state: "EXECUTED", completed_at: finishedAt, input_hash: inputHash, output_hash: outputHash, output_snapshot: { output_key: "recursive_intelligence_graph", output_hash: outputHash, executed_capabilities: recursive.executed_capabilities, resource_usage: recursive.resource_usage }, resource_usage: { duration_ms: Date.parse(finishedAt) - Date.parse(asOf), ...recursive.resource_usage }, validation_status: "UNKNOWN" }).eq("id", execution.id).eq("user_id", userId);
    if (executionStateError) { await failExecution(run.id, execution.id, userId, "EXECUTION_STATE_UPDATE_FAILED", executionStateError.message); throw new Error(`Unable to finalize Iris execution state: ${executionStateError.message}`); }

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
  } catch (error) {
    await failExecution(run.id, execution.id, userId, "INTELLIGENCE_EXECUTION_FAILED", errorText(error));
    throw error;
  }
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
