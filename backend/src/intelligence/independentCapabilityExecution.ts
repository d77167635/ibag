import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { dispatchGovernedCapability } from "./capabilityDispatcher.js";
import { planCapabilities } from "./capabilityPlanner.js";
import { evaluateIndependentCapabilityCertification } from "./independentCapabilityCertification.js";
import { resolveCanonicalProviderItem, IRIS_CANONICAL_PROVIDER_DOMAINS, type IrisEvidenceScope } from "./evidenceScope.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

const PLANNER_VERSION = "iris-planner-v2";
const ORCHESTRATOR_VERSION = "iris-orchestrator-v1";
const CERTIFICATION_POLICY_VERSION = "iris-certification-v2";
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function errorText(error: unknown): string { return error instanceof Error ? error.message : String(error); }

async function persistRunEvidence(runId: string, userId: string, selectedItemId: string | null) {
  let evidenceQuery = supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,effective_at,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed");
  if (selectedItemId) evidenceQuery = evidenceQuery.eq("item_id", selectedItemId);
  const { data: rawEvidence, error: evidenceReadError } = await evidenceQuery;
  if (evidenceReadError) throw new Error(`RUN_EVIDENCE_READ_FAILED: ${evidenceReadError.message}`);
  const { data: existingEvidence, error: existingError } = await supabaseAdmin.from("iris_run_evidence").select("raw_observation_id,evidence_hash,effective_at,acquired_at,product").eq("run_id", runId).eq("user_id", userId);
  if (existingError) throw new Error(`RUN_EVIDENCE_EXISTING_READ_FAILED: ${existingError.message}`);
  const existingIds = new Set((existingEvidence ?? []).map((row) => row.raw_observation_id).filter((id): id is string => typeof id === "string"));
  const rows = (rawEvidence ?? []).filter((e) => !existingIds.has(e.id)).map((e) => ({ run_id: runId, user_id: userId, evidence_type: "provider_raw_observation", provider: "plaid", product: e.product, raw_observation_id: e.id, effective_at: e.effective_at ?? e.acquired_at, acquired_at: e.acquired_at, evidence_hash: hash(e.raw_response) }));
  if (rows.length) {
    const { error: evidenceInsertError } = await supabaseAdmin.from("iris_run_evidence").insert(rows);
    if (evidenceInsertError) throw new Error(`RUN_EVIDENCE_PERSIST_FAILED: ${evidenceInsertError.message}`);
  }
  const allEvidence = [...(existingEvidence ?? []), ...rows];
  return { count: allEvidence.length, manifest: allEvidence.map((e) => ({ raw_observation_id: e.raw_observation_id, product: e.product, effective_at: e.effective_at, acquired_at: e.acquired_at, evidence_hash: e.evidence_hash })).sort((a, b) => String(a.raw_observation_id).localeCompare(String(b.raw_observation_id))) };
}

export async function executeIndependentCapabilities(request: { userId: string; requestId?: string; surface?: string; mode?: string; requestedCapabilities: string[] }) {
  const userId = request.userId;
  const requestId = request.requestId?.trim() || randomUUID();
  const surface = request.surface || "iris";
  const mode = request.mode || "capability";
  const requestedCapabilities = [...new Set(request.requestedCapabilities.filter(Boolean))];
  const asOf = new Date().toISOString();
  const { data: existing } = await supabaseAdmin.from("iris_runs").select("*").eq("user_id", userId).eq("request_id", requestId).maybeSingle();
  if (existing?.id) {
    const { data: executions } = await supabaseAdmin.from("iris_execution_records").select("id,capability_id,operator_id,operator_version,execution_state,validation_status,certification_status,output_hash").eq("run_id", existing.id).eq("user_id", userId);
    const results = [];
    for (const execution of executions ?? []) { const { data: output } = await supabaseAdmin.from("iris_execution_outputs").select("value,hash,evidence_state").eq("execution_id", execution.id).maybeSingle(); results.push({ execution, result: output?.value ?? null, output_hash: output?.hash ?? null }); }
    return { ...existing, execution_ids: results.map((x) => x.execution.id), results, certified: existing.status === "CERTIFIED" };
  }
  const selectedItemId = await resolveCanonicalProviderItem(userId);
  const evidenceScope: IrisEvidenceScope = { kind: selectedItemId ? "provider_item" : "user_aggregate", selectedItemId, canonicalProviderDomains: IRIS_CANONICAL_PROVIDER_DOMAINS };
  const plan = await planCapabilities(userId, requestedCapabilities);
  if (plan.status === "BLOCKED") throw new Error(`CAPABILITY_PLAN_BLOCKED: ${plan.limitations.join(" | ")}`);
  const initialManifest = { user_id: userId, request_id: requestId, surface, mode, requested_capabilities: requestedCapabilities, capability_plan: plan, evidence_scope: evidenceScope, as_of: asOf, planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION };
  const { data: run, error: runError } = await supabaseAdmin.from("iris_runs").insert({ request_id: requestId, user_id: userId, request_surface: surface, request_mode: mode, requested_capabilities: requestedCapabilities, status: "PLANNED", as_of: asOf, evidence_boundary: asOf, evidence_version: "provider-observation-boundary-v2", resource_budget: { max_execution_time_ms: 120000, max_graph_nodes: 10000, max_graph_edges: 30000, max_compositions: 5000, max_investigations: 500 }, execution_policy: { evidence_gated: true, certify_only_after_validation: true, server_authoritative: true, capability_plan_status: plan.status, evidence_scope_kind: evidenceScope.kind, selected_item_id: selectedItemId, canonical_provider_domains: [...IRIS_CANONICAL_PROVIDER_DOMAINS], certification_profile: "independent_capability" }, planner_version: PLANNER_VERSION, orchestrator_version: ORCHESTRATOR_VERSION, certification_policy_version: CERTIFICATION_POLICY_VERSION, financial_context_hash: hash({ user_id: userId, as_of: asOf, evidence_scope: evidenceScope }), evidence_manifest_hash: hash(initialManifest), started_at: asOf, updated_at: asOf }).select("*").single();
  if (runError || !run) throw new Error(`Unable to create Iris run: ${runError?.message || "unknown error"}`);
  const results: Array<Record<string, unknown>> = [];
  let allCertified = true;
  const dependencyResults: Record<string, CapabilityOperatorResult> = {};
  let evidenceManifestHash = hash(initialManifest);
  try {
    const persistedEvidence = await persistRunEvidence(run.id, userId, selectedItemId);
    const runEvidenceIds = persistedEvidence.manifest.map((e) => e.raw_observation_id).filter((id): id is string => typeof id === "string").sort();
    evidenceManifestHash = hash({ run_id: run.id, ...initialManifest, evidence: persistedEvidence.manifest });
    const { error: manifestUpdateError } = await supabaseAdmin.from("iris_runs").update({ evidence_manifest_hash: evidenceManifestHash, execution_policy: { ...(run.execution_policy ?? {}), evidence_count: persistedEvidence.count, evidence_manifest_bound: true, run_evidence_ids: runEvidenceIds }, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);
    if (manifestUpdateError) throw new Error(`RUN_EVIDENCE_MANIFEST_UPDATE_FAILED: ${manifestUpdateError.message}`);
    const executionOrder = plan.ordered_capabilities;
    if (!executionOrder.length) throw new Error("CAPABILITY_PLAN_EMPTY: no requested capability was executable in the planned order");
    for (const capabilityId of executionOrder) {
      const contract = plan.contracts.find((candidate) => candidate.capability_id === capabilityId);
      if (!contract) throw new Error(`CAPABILITY_CONTRACT_UNAVAILABLE: ${capabilityId}`);
      const operator = await import("./capabilityOperators.js").then((module) => module.getCapabilityOperator(capabilityId));
      if (!operator?.execute || operator.status !== "implemented") throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);
      const declaredDependencies = Array.isArray((contract as Record<string, unknown>).dependencies) ? ((contract as Record<string, unknown>).dependencies as unknown[]).filter((x): x is string => typeof x === "string") : [];
      const resolvedDependencies = declaredDependencies.map((id) => ({ capability_id: id, output_hash: dependencyResults[id] ? hash(dependencyResults[id].result) : null, evidence_state: dependencyResults[id]?.evidence_state ?? null }));
      const executionStarted = new Date().toISOString();
      const executionManifest = { ...initialManifest, evidence_manifest_hash: evidenceManifestHash, capability_id: capabilityId, contract, operator_id: operator.operator_id, operator_version: operator.version, execution_context: { as_of: asOf, evidence_boundary: asOf, run_id: run.id, evidence_manifest_hash: evidenceManifestHash, run_evidence_ids: runEvidenceIds, dependencies: resolvedDependencies } };
      const executionInputHash = hash(executionManifest);
      const { data: execution, error: executionError } = await supabaseAdmin.from("iris_execution_records").insert({ run_id: run.id, user_id: userId, capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, execution_state: "EXECUTING", started_at: executionStarted, evidence_state: "CALCULATED", validation_status: "UNKNOWN", certification_status: "PENDING", input_manifest: executionManifest }).select("*").single();
      if (executionError || !execution) throw new Error(`EXECUTION_RECORD_CREATE_FAILED: ${executionError?.message || "unknown error"}`);
      try {
        const inputRows: Array<Record<string, unknown>> = [{ execution_id: execution.id, input_type: "execution_manifest", reference_type: "iris_run", reference_id: run.id, role: "primary", hash: executionInputHash }];
        for (const dependencyId of declaredDependencies) {
          const upstream = dependencyResults[dependencyId];
          if (!upstream) throw new Error(`DEPENDENCY_OUTPUT_UNAVAILABLE: ${capabilityId} requires ${dependencyId}`);
          const upstreamExecutionId = results.find((x) => x.capability_id === dependencyId)?.execution_id;
          if (typeof upstreamExecutionId !== "string") throw new Error(`DEPENDENCY_EXECUTION_REFERENCE_UNAVAILABLE: ${capabilityId} requires ${dependencyId}`);
          inputRows.push({ execution_id: execution.id, input_type: "dependency_output", reference_type: "iris_execution", reference_id: upstreamExecutionId, role: "dependency", hash: hash(upstream.result) });
        }
        const { error: inputError } = await supabaseAdmin.from("iris_execution_inputs").insert(inputRows);
        if (inputError) throw new Error(`EXECUTION_INPUT_PERSIST_FAILED: ${inputError.message}`);
        const dispatched = await dispatchGovernedCapability({ userId, capabilityId, context: { asOf, evidenceBoundary: asOf, runId: run.id, evidenceManifestHash, runEvidenceIds, dependencyResults } });
        const result = dispatched.result;
        const outputHash = hash(result);
        const finishedAt = new Date().toISOString();
        const { error: outputError } = await supabaseAdmin.from("iris_execution_outputs").insert({ execution_id: execution.id, output_key: capabilityId, output_type: contract.output_type, value: result, hash: outputHash, evidence_state: dispatched.evidence_state, uncertainty: result.uncertainty ?? null });
        if (outputError) throw new Error(`EXECUTION_OUTPUT_PERSIST_FAILED: ${outputError.message}`);
        const durationMs = Date.parse(finishedAt) - Date.parse(executionStarted);
        const { error: executionUpdateError } = await supabaseAdmin.from("iris_execution_records").update({ execution_state: "EXECUTED", completed_at: finishedAt, input_hash: executionInputHash, output_hash: outputHash, output_snapshot: { output_key: capabilityId, output_hash: outputHash, evidence_scope: evidenceScope, dispatched_capability: dispatched.capability_id, dispatched_operator: dispatched.operator_id, dispatched_operator_version: dispatched.operator_version, dependency_capabilities: declaredDependencies, run_id: run.id, evidence_manifest_hash: evidenceManifestHash, run_evidence_ids: runEvidenceIds }, resource_usage: { duration_ms: durationMs } }).eq("id", execution.id).eq("user_id", userId);
        if (executionUpdateError) throw new Error(`EXECUTION_RECORD_FINALIZE_FAILED: ${executionUpdateError.message}`);
        const gate = await evaluateIndependentCapabilityCertification({ runId: run.id, executionId: execution.id, userId, inputHash: executionInputHash, outputHash, contract });
        const validationRows = Object.entries(gate.checks).map(([ruleId, gateCheck]) => ({ run_id: run.id, execution_id: execution.id, user_id: userId, rule_id: ruleId, rule_version: contract.version, status: gateCheck.status, severity: gateCheck.status === "PASS" ? "INFO" : "CRITICAL", expected: { status: "PASS" }, actual: { status: gateCheck.status }, details: { message: gateCheck.details, gate_version: CERTIFICATION_POLICY_VERSION, capability_id: capabilityId, contract_version: contract.version } }));
        const { error: validationError } = await supabaseAdmin.from("iris_validation_results").insert(validationRows);
        if (validationError) throw new Error(`VALIDATION_PERSIST_FAILED: ${validationError.message}`);
        if (gate.eligible) {
          const certificationHash = hash({ run_id: run.id, execution_id: execution.id, input_hash: executionInputHash, output_hash: outputHash, policy: CERTIFICATION_POLICY_VERSION, capability_id: capabilityId, contract_version: contract.version, evidence: gate.evidence_snapshot, evidence_manifest_hash: evidenceManifestHash, run_evidence_ids: runEvidenceIds });
          const { error: certificationError } = await supabaseAdmin.rpc("finalize_iris_capability_certification", { p_run_id: run.id, p_execution_id: execution.id, p_user_id: userId, p_policy_version: CERTIFICATION_POLICY_VERSION, p_validation_snapshot: { status: "PASS", checks: gate.checks, contract_version: contract.version, evidence_manifest_hash: evidenceManifestHash, run_evidence_ids: runEvidenceIds }, p_reconciliation_snapshot: gate.reconciliation_snapshot, p_evidence_snapshot: { ...gate.evidence_snapshot, evidence_manifest_hash: evidenceManifestHash, run_evidence_ids: runEvidenceIds }, p_certification_hash: certificationHash, p_certified_at: new Date().toISOString() });
          if (certificationError) throw new Error(`CERTIFICATION_FINALIZE_FAILED: ${certificationError.message}`);
          results.push({ capability_id: capabilityId, execution_id: execution.id, result, certified: true, certification_gate: gate });
        } else {
          allCertified = false;
          const { error: validationUpdateError } = await supabaseAdmin.from("iris_execution_records").update({ validation_status: "FAIL", certification_status: "NOT_CERTIFIED" }).eq("id", execution.id).eq("user_id", userId);
          if (validationUpdateError) throw new Error(`CERTIFICATION_STATUS_UPDATE_FAILED: ${validationUpdateError.message}`);
          results.push({ capability_id: capabilityId, execution_id: execution.id, result, certified: false, certification_gate: gate });
        }
        dependencyResults[capabilityId] = dispatched;
      } catch (error) {
        allCertified = false;
        const now = new Date().toISOString();
        await supabaseAdmin.from("iris_execution_records").update({ execution_state: "FAILED", completed_at: now, validation_status: "FAIL", certification_status: "NOT_CERTIFIED", error_code: "INTELLIGENCE_EXECUTION_FAILED", error_message: errorText(error) }).eq("id", execution.id).eq("user_id", userId);
        throw error;
      }
    }
    const finalStatus = allCertified ? "CERTIFIED" : "VALIDATION_FAILED";
    const now = new Date().toISOString();
    const { error: runFinalizeError } = await supabaseAdmin.from("iris_runs").update({ status: finalStatus, completed_at: now, updated_at: now }).eq("id", run.id).eq("user_id", userId);
    if (runFinalizeError) throw new Error(`IRIS_RUN_FINALIZE_FAILED: ${runFinalizeError.message}`);
    return { ...run, id: run.id, status: finalStatus, evidence_manifest_hash: evidenceManifestHash, execution_ids: results.map((x) => x.execution_id), results, certified: allCertified };
  } catch (error) {
    const now = new Date().toISOString();
    await supabaseAdmin.from("iris_runs").update({ status: "FAILED", failure_code: "INTELLIGENCE_EXECUTION_FAILED", failure_message: errorText(error), completed_at: now, updated_at: now }).eq("id", run.id).eq("user_id", userId);
    throw error;
  }
}
