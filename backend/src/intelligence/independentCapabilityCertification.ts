import { supabaseAdmin } from "../config/supabase.js";

export type IndependentCertification = {
  eligible: boolean;
  status: "PASS" | "FAIL";
  critical_failures: string[];
  checks: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  evidence_snapshot: Record<string, unknown>;
  reconciliation_snapshot: Record<string, unknown>;
};

export async function evaluateIndependentCapabilityCertification(input: { runId: string; executionId: string; userId: string; inputHash: string; outputHash: string }): Promise<IndependentCertification> {
  const { runId, executionId, userId, inputHash, outputHash } = input;
  const checks: IndependentCertification["checks"] = {};
  const failures: string[] = [];
  const check = (key: string, ok: boolean, pass: string, fail: string) => { checks[key] = { status: ok ? "PASS" : "FAIL", details: ok ? pass : fail }; if (!ok) failures.push(key); };
  const [{ data: run }, { data: execution }, { data: evidence }, { data: outputs }] = await Promise.all([
    supabaseAdmin.from("iris_runs").select("id,user_id,as_of,evidence_boundary,evidence_manifest_hash,resource_budget").eq("id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("run_id,user_id,execution_state,input_hash,output_hash,resource_usage").eq("id", executionId).eq("run_id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_run_evidence").select("id,user_id,raw_observation_id,evidence_hash,effective_at,acquired_at").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_execution_outputs").select("hash,value,evidence_state").eq("execution_id", executionId),
  ]);
  check("execution.integrity", !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash, "Execution state and hashes match.", "Execution state or hashes do not match.");
  check("run.boundary", !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash, "Evidence boundary and manifest hash are persisted.", "Evidence boundary or manifest hash is incomplete.");
  check("evidence.present", (evidence?.length ?? 0) > 0 && evidence!.every(e => e.user_id === userId && !!e.raw_observation_id && !!e.evidence_hash && e.effective_at != null && e.acquired_at != null), "Provider evidence is present, dated, hashed, and user-owned.", "Independent certification requires dated, hashed, user-owned provider evidence.");
  const rawIds = (evidence ?? []).map(e => e.raw_observation_id).filter((id): id is string => typeof id === "string");
  const { data: lineage } = rawIds.length ? await supabaseAdmin.from("iris_data_lineage").select("id,user_id,source_id,evidence_state").eq("user_id", userId).in("source_id", rawIds.slice(0, 5000)).limit(5000) : { data: [] as any[] };
  check("lineage.present", (lineage?.length ?? 0) > 0 && lineage!.every(l => l.user_id === userId), "Provider evidence has user-owned lineage.", "No user-owned provider lineage is attached to this capability execution.");
  const output = outputs?.find(o => o.hash === outputHash);
  check("output.integrity", !!output && output.value != null && output.evidence_state !== "OBSERVED", "Derived capability output is persisted with the expected hash and semantic state.", "Capability output is missing, hash-mismatched, or marked as observed evidence.");
  const usage = execution?.resource_usage as { duration_ms?: number } | null | undefined;
  const budget = run?.resource_budget as { max_execution_time_ms?: number } | null | undefined;
  check("resource_budget", !!usage && (!budget?.max_execution_time_ms || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= budget.max_execution_time_ms), "Execution is within the configured resource budget.", "Execution resource usage is missing or exceeds its configured budget.");
  return { eligible: failures.length === 0, status: failures.length === 0 ? "PASS" : "FAIL", critical_failures: failures, checks, evidence_snapshot: { evidence_state: "CALCULATED", run_id: runId, execution_id: executionId, evidence_count: evidence?.length ?? 0, lineage_count: lineage?.length ?? 0 }, reconciliation_snapshot: { status: failures.length === 0 ? "PASS" : "FAIL", scope: "independent_capability_evidence_lineage" } };
}
