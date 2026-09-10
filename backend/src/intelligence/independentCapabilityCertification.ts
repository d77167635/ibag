import { supabaseAdmin } from "../config/supabase.js";

type CapabilityContract = {
  capability_id: string;
  version: string;
  operator_id: string;
  operator_version: string;
  evidence_requirements: unknown;
  validation_rules: unknown;
  output_type: string;
  output_contract: unknown;
  lineage_requirements: unknown;
  resource_limits: unknown;
  user_control: unknown;
  recursive: boolean;
  cross_domain: boolean;
};

export type IndependentCertification = {
  eligible: boolean;
  status: "PASS" | "FAIL";
  critical_failures: string[];
  checks: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  evidence_snapshot: Record<string, unknown>;
  reconciliation_snapshot: Record<string, unknown>;
};

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function sortedStrings(value: unknown): string[] { return [...new Set(stringList(value))].sort(); }

export async function evaluateIndependentCapabilityCertification(input: {
  runId: string;
  executionId: string;
  userId: string;
  inputHash: string;
  outputHash: string;
  contract: CapabilityContract;
}): Promise<IndependentCertification> {
  const { runId, executionId, userId, inputHash, outputHash, contract } = input;
  const checks: IndependentCertification["checks"] = {};
  const failures: string[] = [];
  const check = (key: string, ok: boolean, pass: string, fail: string) => {
    checks[key] = { status: ok ? "PASS" : "FAIL", details: ok ? pass : fail };
    if (!ok) failures.push(key);
  };

  const [{ data: run }, { data: execution }, { data: evidence }, { data: outputs }] = await Promise.all([
    supabaseAdmin.from("iris_runs").select("id,user_id,as_of,evidence_boundary,evidence_manifest_hash,execution_policy,resource_budget").eq("id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("run_id,user_id,input_hash,output_hash,execution_state,resource_usage,operator_id,operator_version,capability_id").eq("id", executionId).eq("run_id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_run_evidence").select("id,user_id,raw_observation_id,evidence_hash,effective_at,acquired_at,provider,product,evidence_type").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_execution_outputs").select("hash,value,evidence_state,output_type").eq("execution_id", executionId),
  ]);

  check("execution.integrity", !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash, "Execution state and hashes match.", "Execution state or hashes do not match.");
  check("execution.contract_identity", !!execution && execution.capability_id === contract.capability_id && execution.operator_id === contract.operator_id && execution.operator_version === contract.operator_version, "Execution identity exactly matches the persisted capability contract.", "Execution capability/operator identity or version does not match the persisted capability contract.");
  check("run.boundary", !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash, "Evidence boundary and manifest hash are persisted.", "Evidence boundary or manifest hash is incomplete.");
  check("contract.governance", !!contract.operator_id && !!contract.operator_version && !!contract.version && !!contract.capability_id, "Operator identity and capability contract identity are present.", "Capability contract identity is incomplete.");

  const boundary = run?.evidence_boundary ? new Date(run.evidence_boundary) : null;
  const validBoundary = !!boundary && Number.isFinite(boundary.getTime());
  const runEvidence = (evidence ?? []).filter((entry) => entry.evidence_type === "provider_raw_observation" && entry.provider === "plaid");
  const providerEvidencePresent = runEvidence.length > 0 && runEvidence.every((entry) => entry.user_id === userId && !!entry.raw_observation_id && !!entry.evidence_hash && entry.effective_at != null && entry.acquired_at != null && validBoundary && new Date(entry.acquired_at).getTime() <= boundary!.getTime());
  const rawIds = sortedStrings(runEvidence.map((entry) => entry.raw_observation_id));
  const runEvidenceRecordIds = sortedStrings(runEvidence.map((entry) => entry.id));
  const persistedManifestIds = sortedStrings(objectValue(run?.execution_policy).run_evidence_ids);
  check("run.evidence_manifest_identity", !!run?.evidence_manifest_hash && rawIds.length > 0 && persistedManifestIds.length > 0 && JSON.stringify(rawIds) === JSON.stringify(persistedManifestIds), "The run's persisted evidence identity matches the exact provider raw observations bound to the run.", "The run's persisted evidence identity does not match the provider raw observations available for certification.");

  const { data: lineage } = rawIds.length ? await supabaseAdmin.from("iris_data_lineage").select("id,user_id,source_id,evidence_state").eq("user_id", userId).in("source_id", rawIds.slice(0, 5000)).limit(5000) : { data: [] as Array<{ id: string; user_id: string; source_id: string; evidence_state: string }> };

  let canonicalQuery = supabaseAdmin.from("transactions").select("id,raw_transaction_id,plaid_raw_transactions!inner(acquired_at,is_current,evidence_state)", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true).eq("pending", false).in("classification_evidence", ["observed", "calculated"]).eq("plaid_raw_transactions.is_current", true).eq("plaid_raw_transactions.evidence_state", "observed");
  if (rawIds.length) canonicalQuery = canonicalQuery.in("raw_transaction_id", rawIds.slice(0, 5000));
  else canonicalQuery = canonicalQuery.in("raw_transaction_id", ["00000000-0000-0000-0000-000000000000"]);
  if (validBoundary) canonicalQuery = canonicalQuery.lte("plaid_raw_transactions.acquired_at", boundary!.toISOString());
  const { count: canonicalTransactionCount, error: canonicalError } = await canonicalQuery;

  const requirements = stringList(contract.evidence_requirements);
  const validationRules = stringList(contract.validation_rules);
  const lineageRequirements = stringList(contract.lineage_requirements);
  const outputContract = objectValue(contract.output_contract);
  const resourceLimits = objectValue(contract.resource_limits);
  const userControl = objectValue(contract.user_control);

  check("contract.output_contract", Object.keys(outputContract).length > 0 && outputContract.type === contract.output_type, "Persisted output contract declares the same output type used by the capability contract.", "Persisted output contract is missing or does not match the declared output type.");
  check("contract.lineage_requirements", lineageRequirements.length > 0, "Persisted contract declares explicit lineage requirements.", "Persisted contract does not declare lineage requirements.");
  check("contract.resource_limits", Object.keys(resourceLimits).length > 0, "Persisted contract declares execution resource limits.", "Persisted contract does not declare execution resource limits.");
  check("contract.user_control", Object.keys(userControl).length > 0, "Persisted contract declares user-control semantics.", "Persisted contract does not declare user-control semantics.");
  if (canonicalError) check("contract.canonical_financial_model", false, "Canonical financial model is readable.", `Canonical financial model could not be verified: ${canonicalError.message}`);
  else if (requirements.includes("canonical_financial_model")) check("contract.canonical_financial_model", (canonicalTransactionCount ?? 0) > 0, "Persisted capability contract requires canonical financial evidence and it is present within the exact run evidence boundary.", "Persisted capability contract requires canonical financial evidence, but no qualifying exact-run canonical transactions are available.");
  if (requirements.includes("authorized_plaid_evidence")) check("contract.authorized_plaid_evidence", providerEvidencePresent, "Persisted capability contract requires provider evidence and the run has dated, hashed, boundary-valid evidence.", "Persisted capability contract requires provider evidence, but the run does not contain qualifying boundary-valid provider observations.");
  if (validationRules.includes("user_isolation")) check("contract.user_isolation", !!run && run.user_id === userId && !!execution && execution.user_id === userId && (evidence ?? []).every((entry) => entry.user_id === userId), "All certification inputs are constrained to the requested user.", "A certification input failed the persisted user-isolation rule.");
  if (validationRules.includes("lineage_present") || lineageRequirements.includes("source_lineage")) check("contract.lineage_present", (lineage?.length ?? 0) > 0 && lineage!.every((entry) => entry.user_id === userId), "Provider evidence has user-owned lineage.", "The persisted contract requires source lineage, but no user-owned provider lineage is attached to this execution.");
  if (lineageRequirements.includes("run_evidence")) check("contract.run_evidence", providerEvidencePresent, "The persisted lineage contract is backed by dated run evidence within the run boundary.", "The persisted lineage contract requires run evidence, but the run evidence boundary is empty, incomplete, or contains post-boundary evidence.");

  const output = outputs?.find((entry) => entry.hash === outputHash);
  const allowedEvidenceStates = stringList(outputContract.evidence_state_policy);
  const outputStateAllowed = allowedEvidenceStates.length === 0 || (!!output && allowedEvidenceStates.includes(output.evidence_state));
  const observedOutputForbidden = outputContract.observed_output_forbidden !== false;
  const outputTypeMatches = !!output && output.output_type === contract.output_type;
  if (validationRules.includes("evidence_state_valid")) check("contract.evidence_state_valid", providerEvidencePresent && !!output && output.value != null && outputStateAllowed && outputTypeMatches && (!observedOutputForbidden || output.evidence_state !== "OBSERVED"), "Provider inputs remain observed evidence while derived output follows the persisted evidence-state and type policy.", "Evidence-state or output-type semantics do not satisfy the persisted capability contract.");
  check("output.integrity", !!output && output.value != null && output.hash === outputHash && outputTypeMatches && (!observedOutputForbidden || output.evidence_state !== "OBSERVED") && outputStateAllowed, "Derived capability output is persisted with the expected hash, type, and semantic state.", "Capability output is missing, hash-mismatched, type-incompatible, or violates the persisted evidence-state policy.");

  const outputProvenance = objectValue(objectValue(output?.value).provenance);
  const outputRunId = typeof outputProvenance.run_id === "string" ? outputProvenance.run_id : null;
  const outputManifestHash = typeof outputProvenance.evidence_manifest_hash === "string" ? outputProvenance.evidence_manifest_hash : null;
  const outputEvidenceIds = sortedStrings(outputProvenance.run_evidence_ids);
  check("output.run_evidence_provenance", !!run?.evidence_manifest_hash && outputRunId === runId && outputManifestHash === run.evidence_manifest_hash && JSON.stringify(outputEvidenceIds) === JSON.stringify(rawIds), "Capability output provenance identifies the exact Iris run and exact run-evidence manifest used for the output.", "Capability output provenance does not identify the exact Iris run and evidence manifest used for the output.");

  const usage = execution?.resource_usage as { duration_ms?: number } | null | undefined;
  const maxExecutionTime = typeof resourceLimits.max_execution_time_ms === "number" ? resourceLimits.max_execution_time_ms : null;
  check("resource_budget", !!usage && (!maxExecutionTime || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= maxExecutionTime), "Execution is within the persisted capability resource budget.", "Execution resource usage is missing or exceeds the persisted capability resource budget.");

  return {
    eligible: failures.length === 0,
    status: failures.length === 0 ? "PASS" : "FAIL",
    critical_failures: failures,
    checks,
    evidence_snapshot: { evidence_state: "CALCULATED", run_id: runId, execution_id: executionId, capability_id: contract.capability_id, contract_version: contract.version, operator_id: execution?.operator_id ?? null, operator_version: execution?.operator_version ?? null, evidence_count: runEvidence.length, run_evidence_record_ids: runEvidenceRecordIds, run_evidence_raw_observation_ids: rawIds, lineage_count: lineage?.length ?? 0, canonical_transaction_count: canonicalTransactionCount ?? 0, evidence_boundary: run?.evidence_boundary ?? null, evidence_manifest_hash: run?.evidence_manifest_hash ?? null },
    reconciliation_snapshot: { status: failures.length === 0 ? "PASS" : "FAIL", scope: "independent_capability_evidence_lineage_contract", contract_version: contract.version, evidence_requirements: contract.evidence_requirements, validation_rules: contract.validation_rules, output_contract: contract.output_contract, lineage_requirements: contract.lineage_requirements, resource_limits: contract.resource_limits, user_control: contract.user_control, recursive: contract.recursive, cross_domain: contract.cross_domain },
  };
}
