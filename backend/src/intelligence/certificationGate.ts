import { supabaseAdmin } from "../config/supabase.js";

export type CertificationGateResult = {
  eligible: boolean;
  status: "PASS" | "FAIL";
  critical_failures: string[];
  checks: Record<string, { status: "PASS" | "FAIL"; details: string }>;
};

const REQUIRED_VALIDATION_RULES = [
  "iris.execution.integrity",
  "iris.evidence.ownership",
  "iris.evidence.boundary",
  "iris.lineage.present",
  "iris.output.semantic_state",
  "iris.reconciliation",
];

export async function evaluateCertificationGate({
  runId,
  executionId,
  userId,
  inputHash,
  outputHash,
}: {
  runId: string;
  executionId: string;
  userId: string;
  inputHash: string;
  outputHash: string;
}): Promise<CertificationGateResult> {
  const checks: CertificationGateResult["checks"] = {};
  const critical_failures: string[] = [];

  const { data: execution } = await supabaseAdmin
    .from("iris_execution_records")
    .select("run_id,user_id,execution_state,input_hash,output_hash")
    .eq("id", executionId)
    .maybeSingle();
  const executionOk = !!execution && execution.run_id === runId && execution.user_id === userId && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash;
  checks.execution = { status: executionOk ? "PASS" : "FAIL", details: executionOk ? "Execution identity, state, and hashes match the run." : "Execution identity, state, or hashes do not match the requested certification." };
  if (!executionOk) critical_failures.push("execution");

  const { data: run } = await supabaseAdmin
    .from("iris_runs")
    .select("id,user_id,as_of,evidence_boundary,evidence_manifest_hash")
    .eq("id", runId)
    .maybeSingle();
  const runOk = !!run && run.user_id === userId && !!run.as_of && !!run.evidence_manifest_hash;
  checks.run_ownership = { status: runOk ? "PASS" : "FAIL", details: runOk ? "Run ownership and evidence manifest boundary are present." : "Run ownership or evidence boundary metadata is missing." };
  if (!runOk) critical_failures.push("run_ownership");

  const { data: evidence, error: evidenceError } = await supabaseAdmin
    .from("iris_run_evidence")
    .select("id,user_id,effective_at,acquired_at,evidence_hash")
    .eq("run_id", runId);
  const evidenceOk = !evidenceError && Array.isArray(evidence) && evidence.length > 0 && evidence.every(e => e.user_id === userId && !!e.evidence_hash && e.effective_at != null && e.acquired_at != null);
  checks.evidence = { status: evidenceOk ? "PASS" : "FAIL", details: evidenceOk ? `${evidence.length} run evidence records are owned by the run user and hashed.` : "No complete run evidence boundary is attached to this execution." };
  if (!evidenceOk) critical_failures.push("evidence");

  const { data: inputs } = await supabaseAdmin
    .from("iris_execution_inputs")
    .select("reference_id,hash")
    .eq("execution_id", executionId);
  const inputOk = Array.isArray(inputs) && inputs.some(i => i.reference_id === runId && i.hash === inputHash);
  checks.input_integrity = { status: inputOk ? "PASS" : "FAIL", details: inputOk ? "Execution input manifest is durably persisted and hashed." : "Execution input manifest is absent or hash-mismatched." };
  if (!inputOk) critical_failures.push("input_integrity");

  const { data: outputs } = await supabaseAdmin
    .from("iris_execution_outputs")
    .select("hash,evidence_state,value")
    .eq("execution_id", executionId);
  const output = outputs?.find(o => o.hash === outputHash);
  const outputOk = !!output && output.value != null && output.evidence_state !== "OBSERVED";
  checks.output_integrity = { status: outputOk ? "PASS" : "FAIL", details: outputOk ? "Output is persisted, hash-addressed, and is not misclassified as provider observation." : "Output is missing, hash-mismatched, or incorrectly classified as observed evidence." };
  if (!outputOk) critical_failures.push("output_integrity");

  const { data: lineage } = await supabaseAdmin
    .from("iris_data_lineage")
    .select("id,user_id")
    .eq("user_id", userId)
    .limit(1);
  const lineageOk = Array.isArray(lineage) && lineage.length > 0 && lineage.every(l => l.user_id === userId);
  checks.lineage = { status: lineageOk ? "PASS" : "FAIL", details: lineageOk ? "User-owned lineage exists for the certification boundary." : "No user-owned lineage is available for certification." };
  if (!lineageOk) critical_failures.push("lineage");

  const { data: validations } = await supabaseAdmin
    .from("iris_validation_results")
    .select("rule_id,status,severity")
    .eq("run_id", runId)
    .eq("execution_id", executionId)
    .eq("user_id", userId);
  const validationMap = new Map((validations ?? []).map(v => [v.rule_id, v]));
  for (const rule of REQUIRED_VALIDATION_RULES) {
    const v = validationMap.get(rule);
    const ok = !!v && v.status === "PASS" && v.severity !== "CRITICAL";
    checks[rule] = { status: ok ? "PASS" : "FAIL", details: ok ? "Required validation gate passed." : `Required validation gate ${rule} is missing or not passed.` };
    if (!ok) critical_failures.push(rule);
  }

  return { eligible: critical_failures.length === 0, status: critical_failures.length === 0 ? "PASS" : "FAIL", critical_failures, checks };
}
