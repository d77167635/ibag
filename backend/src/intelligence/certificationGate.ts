import { supabaseAdmin } from "../config/supabase.js";

export type CertificationGateResult = {
  eligible: boolean;
  status: "PASS" | "FAIL";
  critical_failures: string[];
  checks: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  evidence_snapshot: Record<string, unknown>;
  reconciliation_snapshot: Record<string, unknown>;
};

export async function evaluateCertificationGate({ runId, executionId, userId, inputHash, outputHash }: {
  runId: string; executionId: string; userId: string; inputHash: string; outputHash: string;
}): Promise<CertificationGateResult> {
  const checks: CertificationGateResult["checks"] = {};
  const critical_failures: string[] = [];
  const check = (key: string, ok: boolean, pass: string, fail: string) => {
    checks[key] = { status: ok ? "PASS" : "FAIL", details: ok ? pass : fail };
    if (!ok) critical_failures.push(key);
  };

  const [{ data: run }, { data: execution }, { data: evidence, error: evidenceError }, { data: outputs }, { data: lineage }, { count: rawCount }, { count: canonicalCount }, { count: roundupCount }, { count: productCount }] = await Promise.all([
    supabaseAdmin.from("iris_runs").select("id,user_id,as_of,evidence_boundary,evidence_version,evidence_manifest_hash,resource_budget").eq("id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("run_id,user_id,execution_state,input_hash,output_hash,resource_usage").eq("id", executionId).eq("run_id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_run_evidence").select("id,user_id,provider,product,raw_observation_id,evidence_hash,effective_at,acquired_at").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_execution_outputs").select("hash,evidence_state,value").eq("execution_id", executionId),
    supabaseAdmin.from("iris_data_lineage").select("id,user_id,source_id,destination_id,evidence_state").eq("user_id", userId).or(`source_id.eq.${executionId},destination_id.eq.${executionId}`).limit(5000),
    supabaseAdmin.from("plaid_raw_transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true),
    supabaseAdmin.from("roundup_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_product_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);

  check("iris.execution.integrity", !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash && inputHash.length === 64 && outputHash.length === 64, "Execution identity, state, and hashes match.", "Execution identity, state, or hashes are invalid.");
  check("iris.evidence.ownership", !evidenceError && (evidence?.length ?? 0) > 0 && evidence!.every(e => e.user_id === userId && !!e.evidence_hash && e.effective_at != null && e.acquired_at != null), "Run evidence is present, hashed, dated, and user-owned.", "Run evidence is missing, incomplete, unhashed, or ownership-invalid.");
  check("iris.evidence.boundary", !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash, "Explicit evidence boundary and manifest hash are persisted.", "Evidence boundary or manifest hash is missing.");
  check("iris.lineage.present", (lineage?.length ?? 0) > 0 && lineage!.every(l => l.user_id === userId), "User-owned lineage reaches the execution boundary.", "No valid user-owned lineage reaches the execution boundary.");
  const output = outputs?.find(o => o.hash === outputHash);
  check("iris.output.semantic_state", !!output && output.value != null && output.evidence_state !== "OBSERVED", "Output is persisted as derived intelligence and is not misclassified as provider observation.", "Output is missing, hash-mismatched, or incorrectly classified as observed evidence.");

  const raw = rawCount ?? 0;
  const canonical = canonicalCount ?? 0;
  const reconciliationOk = raw === canonical;
  check("iris.reconciliation", reconciliationOk, `Core transaction reconciliation passed: ${raw} current raw observations = ${canonical} current canonical transactions.`, `Core transaction reconciliation failed: ${raw} current raw observations != ${canonical} current canonical transactions.`);

  const usage = execution?.resource_usage as { duration_ms?: number } | null | undefined;
  const budget = run?.resource_budget as { max_execution_time_ms?: number } | null | undefined;
  check("iris.resource_budget", !!usage && (!budget?.max_execution_time_ms || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= budget.max_execution_time_ms), "Execution completed within the configured time budget.", "Execution resource usage is missing or exceeds the configured time budget.");

  return {
    eligible: critical_failures.length === 0,
    status: critical_failures.length === 0 ? "PASS" : "FAIL",
    critical_failures,
    checks,
    evidence_snapshot: {
      user_id: userId, run_id: runId, execution_id: executionId,
      evidence_boundary: run?.evidence_boundary ?? null,
      evidence_version: run?.evidence_version ?? null,
      evidence_manifest_hash: run?.evidence_manifest_hash ?? null,
      run_evidence_count: evidence?.length ?? 0,
      current_observed_product_count: productCount ?? 0,
    },
    reconciliation_snapshot: {
      status: reconciliationOk ? "PASS" : "FAIL",
      raw_current_transactions: raw,
      canonical_current_transactions: canonical,
      roundup_event_count: roundupCount ?? 0,
      current_product_observation_count: productCount ?? 0,
      scope: "core_transaction_reconciliation",
    },
  };
}
