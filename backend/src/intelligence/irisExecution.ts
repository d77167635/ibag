import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { dispatchGovernedCapability, GOVERNED_AGGREGATE_CAPABILITY, GOVERNED_AGGREGATE_OPERATOR, GOVERNED_AGGREGATE_OPERATOR_VERSION } from "./capabilityDispatcher.js";
import { getCapabilityOperator } from "./capabilityOperators.js";
import { planCapabilities } from "./capabilityPlanner.js";
import { evaluateCertificationGate } from "./certificationGate.js";
import { resolveCanonicalProviderItem, IRIS_CANONICAL_PROVIDER_DOMAINS, type IrisEvidenceScope } from "./evidenceScope.js";
import { getEvidenceObservationBoundary } from "./transactionSemantics.js";

const PLANNER_VERSION = "iris-planner-v8";
const ORCHESTRATOR_VERSION = "iris-orchestrator-v1";
const CERTIFICATION_POLICY_VERSION = "iris-certification-v2";
const DEFAULT_REQUESTED_CAPABILITIES = [GOVERNED_AGGREGATE_CAPABILITY];
const RESOURCE_BUDGET = { max_execution_time_ms: 120000, max_graph_nodes: 10000, max_graph_edges: 30000, max_compositions: 5000, max_investigations: 500 };

type RunRequest = { userId: string; requestId?: string; surface?: string; mode?: string; requestedCapabilities?: string[] };
type DispatchResult = { capability_id: string; operator_id: string; operator_version: string; result: any };

function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function operatorFor(capabilityId: string) {
  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) return { operator_id: GOVERNED_AGGREGATE_OPERATOR, version: GOVERNED_AGGREGATE_OPERATOR_VERSION };
  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  return { operator_id: operator.operator_id, version: operator.version };
}

/**
 * Single governed execution boundary.
 *
 * The planner resolves a dependency-ordered capability graph. Every planned
 * capability receives its own durable execution/input/output records, and the
 * aggregate supervisory capability is executed last. Dependency output hashes
 * are recorded in downstream input manifests so the execution graph is durable
 * and auditable; operators remain server-authoritative and evidence-bound.
 */
export async function executeIrisRun(request: RunRequest) {
  const userId = request.userId;
  const requestId = request.requestId?.trim() || randomUUID();
  const surface = request.surface || "iris";
  const mode = request.mode || "full_intelligence";
  const requestedCapabilities = request.requestedCapabilities?.length ? request.requestedCapabilities : DEFAULT_REQUESTED_CAPABILITIES;
  const startedAt = new Date().toISOString();
  const evidenceObservationBoundary = await getEvidenceObservationBoundary(userId);
  const asOf = evidenceObservationBoundary ?? startedAt;

  const { data: existing } = await supabaseAdmin.from("iris_runs").select("*").eq("user_id", userId).eq("request_id", requestId).maybeSingle();
  if (existing?.id) {
    const { data: executions } = await supabaseAdmin.from("iris_execution_records").select("id,capability_id,execution_state,output_hash").eq("run_id", existing.id).eq("user_id", userId).order("started_at", { ascending: true });
    const aggregateExecution = (executions ?? []).find(row => row.capability_id === GOVERNED_AGGREGATE_CAPABILITY);
    const { data: output } = aggregateExecution ? await supabaseAdmin.from("iris_execution_outputs").select("value,hash,evidence_state").eq("execution_id", aggregateExecution.id).maybeSingle() : { data: null };
    return { ...existing, execution_id: aggregateExecution?.id ?? null, result: output?.value ?? null, output_hash: output?.hash ?? null, certified: existing.status === "CERTIFIED", capability_executions: executions ?? [] };
  }

  const selectedItemId = await resolveCanonicalProviderItem(userId);
  const evidenceScope: IrisEvidenceScope = { kind: selectedItemId ? "provider_item" : "user_aggregate", selectedItemId, canonicalProviderDomains: IRIS_CANONICAL_PROVIDER_DOMAINS };

  const plan = await planCapabilities(userId, requestedCapabilities);
  if (plan.status === "BLOCKED") throw new Error(`CAPABILITY_PLAN_BLOCKED: ${plan.limitations.join(" | ")}`);

  const initialManifest = {
    user_id: userId,
    request_id: requestId,
    surface,
    mode,
    requested_capabilities: requestedCapabilities,
    capability_plan: plan,
    evidence_scope: evidenceScope,
    as_of: asOf,
    evidence_boundary: evidenceObservationBoundary,
    planner_version: PLANNER_VERSION,
    orchestrator_version: ORCHESTRATOR_VERSION,
    certification_policy_version: CERTIFICATION_POLICY_VERSION,
  };

  const { data: run, error: runError } = await supabaseAdmin.from("iris_runs").insert({
    request_id: requestId,
    user_id: userId,
    request_surface: surface,
    request_mode: mode,
    requested_capabilities: requestedCapabilities,
    status: "PLANNED",
    as_of: asOf,
    evidence_boundary: evidenceObservationBoundary,
    evidence_version: "provider-observation-boundary-v2",
    resource_budget: RESOURCE_BUDGET,
    execution_policy: {
      evidence_gated: true,
      certify_only_after_validation: true,
      server_authoritative: true,
      capability_plan_status: plan.status,
      ordered_capabilities: plan.ordered_capabilities,
      evidence_scope_kind: evidenceScope.kind,
      selected_item_id: selectedItemId,
      canonical_provider_domains: [...IRIS_CANONICAL_PROVIDER_DOMAINS],
    },
    planner_version: PLANNER_VERSION,
    orchestrator_version: ORCHESTRATOR_VERSION,
    certification_policy_version: CERTIFICATION_POLICY_VERSION,
    financial_context_hash: hash({ user_id: userId, as_of: asOf, evidence_scope: evidenceScope }),
    evidence_manifest_hash: hash(initialManifest),
    started_at: startedAt,
    updated_at: startedAt,
  }).select("*").single();
  if (runError || !run) throw new Error(`Unable to create Iris run: ${runError?.message || "unknown error"}`);

  await supabaseAdmin.from("iris_runs").update({ status: "EXECUTING", updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);

  const completedCapabilities = new Map<string, { executionId: string; outputHash: string; result: any }>();
  let aggregateExecution: any = null;
  let aggregateResult: any = null;
  let aggregateOutputHash: string | null = null;
  let aggregateInputHash: string | null = null;

  try {
    for (const capabilityId of plan.ordered_capabilities) {
      const operator = operatorFor(capabilityId);
      const contract = plan.contracts.find(item => item.capability_id === capabilityId);
      const dependencyOutputs = Object.fromEntries(asDependencyIds(contract?.dependencies).map(dependencyId => {
        const dependency = completedCapabilities.get(dependencyId);
        return [dependencyId, dependency ? { execution_id: dependency.executionId, output_hash: dependency.outputHash } : null];
      }));

      const capabilityManifest = {
        ...initialManifest,
        capability_id: capabilityId,
        operator_id: operator.operator_id,
        operator_version: operator.version,
        dependencies: asDependencyIds(contract?.dependencies),
        dependency_outputs: dependencyOutputs,
      };
      const inputHash = hash(capabilityManifest);
      const executionInsert = await supabaseAdmin.from("iris_execution_records").insert({
        run_id: run.id,
        user_id: userId,
        capability_id: capabilityId,
        operator_id: operator.operator_id,
        operator_version: operator.version,
        execution_state: "EXECUTING",
        started_at: new Date().toISOString(),
        evidence_state: capabilityId === GOVERNED_AGGREGATE_CAPABILITY ? "CALCULATED" : "CALCULATED",
        validation_status: "UNKNOWN",
        certification_status: capabilityId === GOVERNED_AGGREGATE_CAPABILITY ? "PENDING" : "NOT_CERTIFIED",
        input_manifest: capabilityManifest,
        input_hash: inputHash,
      }).select("*").single();
      if (executionInsert.error || !executionInsert.data) throw new Error(`EXECUTION_RECORD_CREATE_FAILED:${capabilityId}: ${executionInsert.error?.message || "unknown error"}`);
      const execution = executionInsert.data;

      const { error: inputError } = await supabaseAdmin.from("iris_execution_inputs").insert({
        execution_id: execution.id,
        input_type: "execution_manifest",
        reference_type: "iris_run",
        reference_id: run.id,
        role: capabilityId === GOVERNED_AGGREGATE_CAPABILITY ? "primary" : "dependency_composed",
        hash: inputHash,
      });
      if (inputError) throw new Error(`EXECUTION_INPUT_PERSIST_FAILED:${capabilityId}: ${inputError.message}`);

      const dispatched = await dispatchGovernedCapability({ userId, capabilityId, executionId: execution.id }) as DispatchResult;
      const result = dispatched.result;
      const providerSelectedItemId = result?.layer_metrics?.provider_domains?.selected_item_id ?? null;
      if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY && selectedItemId && providerSelectedItemId !== selectedItemId) {
        throw new Error(`EVIDENCE_SCOPE_MISMATCH: execution=${selectedItemId} provider_intelligence=${providerSelectedItemId ?? "null"}`);
      }

      const outputHash = hash(result);
      const outputInsert = await supabaseAdmin.from("iris_execution_outputs").insert({
        execution_id: execution.id,
        output_key: capabilityId,
        output_type: contract?.output_type ?? "intelligence",
        value: result,
        hash: outputHash,
        evidence_state: result?.evidence_state ?? (capabilityId === GOVERNED_AGGREGATE_CAPABILITY ? "CALCULATED" : "CALCULATED"),
        uncertainty: result?.uncertainty ?? null,
      });
      if (outputInsert.error) throw new Error(`EXECUTION_OUTPUT_PERSIST_FAILED:${capabilityId}: ${outputInsert.error.message}`);

      const finishedAt = new Date().toISOString();
      await supabaseAdmin.from("iris_execution_records").update({
        execution_state: "EXECUTED",
        completed_at: finishedAt,
        output_hash: outputHash,
        output_snapshot: {
          output_key: capabilityId,
          output_hash: outputHash,
          evidence_scope: evidenceScope,
          dispatched_capability: dispatched.capability_id,
          dispatched_operator: dispatched.operator_id,
          dispatched_operator_version: dispatched.operator_version,
          dependency_outputs: dependencyOutputs,
        },
        resource_usage: {
          duration_ms: Date.parse(finishedAt) - Date.parse(execution.started_at),
          planner_nodes: plan.resource_estimate.nodes,
          planner_edges: plan.resource_estimate.edges,
          planner_compositions: plan.resource_estimate.compositions,
        },
        validation_status: capabilityId === GOVERNED_AGGREGATE_CAPABILITY ? "UNKNOWN" : "PASS",
      }).eq("id", execution.id).eq("user_id", userId);

      completedCapabilities.set(capabilityId, { executionId: execution.id, outputHash, result });
      if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
        aggregateExecution = execution;
        aggregateResult = result;
        aggregateOutputHash = outputHash;
        aggregateInputHash = inputHash;
      }
    }

    if (!aggregateExecution || !aggregateResult || !aggregateOutputHash || !aggregateInputHash) {
      throw new Error("AGGREGATE_EXECUTION_MISSING: supervisory capability did not execute");
    }

    let evidenceQuery = supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,effective_at,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed");
    if (selectedItemId) evidenceQuery = evidenceQuery.eq("item_id", selectedItemId);
    const rawEvidence = (await evidenceQuery).data ?? [];
    if (rawEvidence.length) {
      const evidenceRows = rawEvidence.map(e => ({ run_id: run.id, user_id: userId, evidence_type: "provider_raw_observation", provider: "plaid", product: e.product, raw_observation_id: e.id, effective_at: e.effective_at ?? e.acquired_at, acquired_at: e.acquired_at, evidence_hash: hash(e.raw_response) }));
      const { error: evidenceInsertError } = await supabaseAdmin.from("iris_run_evidence").insert(evidenceRows);
      if (evidenceInsertError) throw new Error(`RUN_EVIDENCE_PERSIST_FAILED: ${evidenceInsertError.message}`);
    }

    const finishedAt = new Date().toISOString();
    const evidenceBoundary = aggregateResult?.evidence_boundary ?? evidenceObservationBoundary ?? null;
    await supabaseAdmin.from("iris_runs").update({ status: "EXECUTED", evidence_boundary: evidenceBoundary, evidence_version: "provider-observation-boundary-v2", completed_at: finishedAt, updated_at: finishedAt }).eq("id", run.id).eq("user_id", userId);

    const gate = await evaluateCertificationGate({ runId: run.id, executionId: aggregateExecution.id, userId, inputHash: aggregateInputHash, outputHash: aggregateOutputHash });
    const validationRows = Object.entries(gate.checks).map(([ruleId, gateCheck]) => ({ run_id: run.id, execution_id: aggregateExecution.id, user_id: userId, rule_id: ruleId, rule_version: CERTIFICATION_POLICY_VERSION, status: gateCheck.status, severity: gateCheck.status === "PASS" ? "INFO" : "CRITICAL", expected: { status: "PASS" }, actual: { status: gateCheck.status }, details: { message: gateCheck.details, gate_version: CERTIFICATION_POLICY_VERSION } }));
    const { error: validationError } = await supabaseAdmin.from("iris_validation_results").insert(validationRows);
    if (validationError) throw new Error(`VALIDATION_PERSIST_FAILED: ${validationError.message}`);

    if (!gate.eligible) {
      const message = `Certification blocked: ${gate.critical_failures.join(", ")}`;
      await supabaseAdmin.from("iris_execution_records").update({ validation_status: "FAIL", certification_status: "NOT_CERTIFIED" }).eq("id", aggregateExecution.id).eq("user_id", userId);
      await supabaseAdmin.from("iris_runs").update({ status: "VALIDATION_FAILED", failure_code: "CERTIFICATION_GATE_FAILED", failure_message: message, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);
      return { ...run, id: run.id, status: "VALIDATION_FAILED", execution_id: aggregateExecution.id, result: aggregateResult, certified: false, certification_gate: gate, capability_executions: [...completedCapabilities.entries()].map(([capability_id, value]) => ({ capability_id, execution_id: value.executionId, output_hash: value.outputHash })) };
    }

    const { error: validationStateError } = await supabaseAdmin.from("iris_execution_records").update({ validation_status: "PASS" }).eq("id", aggregateExecution.id).eq("user_id", userId);
    if (validationStateError) throw new Error(`VALIDATION_STATE_UPDATE_FAILED: ${validationStateError.message}`);

    const certificationHash = hash({ run_id: run.id, execution_id: aggregateExecution.id, input_hash: aggregateInputHash, output_hash: aggregateOutputHash, policy: CERTIFICATION_POLICY_VERSION, evidence: gate.evidence_snapshot, reconciliation: gate.reconciliation_snapshot });
    const { error: certificationError } = await supabaseAdmin.from("iris_certifications").insert({ run_id: run.id, execution_id: aggregateExecution.id, user_id: userId, result_id: aggregateExecution.id, policy_version: CERTIFICATION_POLICY_VERSION, status: "CERTIFIED", validation_snapshot: { status: "PASS", checks: gate.checks }, reconciliation_snapshot: gate.reconciliation_snapshot, evidence_snapshot: gate.evidence_snapshot, certification_hash: certificationHash, certified_at: new Date().toISOString() });
    if (certificationError) throw new Error(`CERTIFICATION_PERSIST_FAILED: ${certificationError.message}`);

    const certifiedAt = new Date().toISOString();
    await supabaseAdmin.from("iris_execution_records").update({ validation_status: "PASS", certification_status: "CERTIFIED" }).eq("id", aggregateExecution.id).eq("user_id", userId);
    await supabaseAdmin.from("iris_runs").update({ status: "CERTIFIED", completed_at: certifiedAt, updated_at: certifiedAt }).eq("id", run.id).eq("user_id", userId);
    return {
      ...run,
      id: run.id,
      status: "CERTIFIED",
      execution_id: aggregateExecution.id,
      result: aggregateResult,
      certified: true,
      certification_hash: certificationHash,
      certification_gate: gate,
      capability_executions: [...completedCapabilities.entries()].map(([capability_id, value]) => ({ capability_id, execution_id: value.executionId, output_hash: value.outputHash })),
    };
  } catch (error) {
    await failRunGraph(run.id, userId, completedCapabilities, errorText(error));
    throw error;
  }
}

function asDependencyIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function failRunGraph(runId: string, userId: string, completedCapabilities: Map<string, { executionId: string }>, message: string) {
  const now = new Date().toISOString();
  const completedIds = new Set([...completedCapabilities.values()].map(value => value.executionId));
  const { data: executions } = await supabaseAdmin.from("iris_execution_records").select("id").eq("run_id", runId).eq("user_id", userId);
  for (const execution of executions ?? []) {
    if (!completedIds.has(execution.id)) {
      await supabaseAdmin.from("iris_execution_records").update({ execution_state: "FAILED", completed_at: now, validation_status: "FAIL", certification_status: "NOT_CERTIFIED", error_code: "INTELLIGENCE_EXECUTION_FAILED", error_message: message }).eq("id", execution.id).eq("user_id", userId);
    }
  }
  await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: "INTELLIGENCE_EXECUTION_FAILED", failure_message: message, completed_at: now, updated_at: now }).eq("id", runId).eq("user_id", userId);
}
