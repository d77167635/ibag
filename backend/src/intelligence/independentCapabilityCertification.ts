import { supabaseAdmin } from "../config/supabase.js";

type CapabilityContract = {
  capability_id: string;
  version: string;
  evidence_requirements: unknown;
  validation_rules: unknown;
  output_type: string;
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
    supabaseAdmin
      .from("iris_runs")
      .select("id,user_id,as_of,evidence_boundary,evidence_manifest_hash,resource_budget")
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("iris_execution_records")
      .select("run_id,user_id,execution_state,input_hash,output_hash,resource_usage")
      .eq("id", executionId)
      .eq("run_id", runId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("iris_run_evidence")
      .select("id,user_id,raw_observation_id,evidence_hash,effective_at,acquired_at")
      .eq("run_id", runId)
      .eq("user_id", userId),
    supabaseAdmin
      .from("iris_execution_outputs")
      .select("hash,value,evidence_state")
      .eq("execution_id", executionId),
  ]);

  check(
    "execution.integrity",
    !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash,
    "Execution state and hashes match.",
    "Execution state or hashes do not match.",
  );
  check(
    "run.boundary",
    !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash,
    "Evidence boundary and manifest hash are persisted.",
    "Evidence boundary or manifest hash is incomplete.",
  );

  const providerEvidencePresent =
    (evidence?.length ?? 0) > 0 &&
    evidence!.every((entry) =>
      entry.user_id === userId &&
      !!entry.raw_observation_id &&
      !!entry.evidence_hash &&
      entry.effective_at != null &&
      entry.acquired_at != null,
    );

  const rawIds = (evidence ?? [])
    .map((entry) => entry.raw_observation_id)
    .filter((id): id is string => typeof id === "string");

  const { data: lineage } = rawIds.length
    ? await supabaseAdmin
        .from("iris_data_lineage")
        .select("id,user_id,source_id,evidence_state")
        .eq("user_id", userId)
        .in("source_id", rawIds.slice(0, 5000))
        .limit(5000)
    : { data: [] as Array<{ id: string; user_id: string; source_id: string; evidence_state: string }> };

  const { count: canonicalTransactionCount, error: canonicalError } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("pending", false)
    .in("classification_evidence", ["observed", "calculated"]);

  const requirements = stringList(contract.evidence_requirements);
  const validationRules = stringList(contract.validation_rules);

  if (canonicalError) {
    check("contract.canonical_financial_model", false, "Canonical financial model is readable.", `Canonical financial model could not be verified: ${canonicalError.message}`);
  } else if (requirements.includes("canonical_financial_model")) {
    check(
      "contract.canonical_financial_model",
      (canonicalTransactionCount ?? 0) > 0,
      "Persisted capability contract requires canonical financial evidence and it is present.",
      "Persisted capability contract requires canonical financial evidence, but no qualifying canonical transactions are available.",
    );
  }

  if (requirements.includes("authorized_plaid_evidence")) {
    check(
      "contract.authorized_plaid_evidence",
      providerEvidencePresent,
      "Persisted capability contract requires provider evidence and the run has dated, hashed evidence.",
      "Persisted capability contract requires provider evidence, but the run does not contain qualifying provider observations.",
    );
  }

  if (validationRules.includes("user_isolation")) {
    check(
      "contract.user_isolation",
      !!run && run.user_id === userId && !!execution && execution.user_id === userId && (evidence ?? []).every((entry) => entry.user_id === userId),
      "All certification inputs are constrained to the requested user.",
      "A certification input failed the persisted user-isolation rule.",
    );
  }

  if (validationRules.includes("lineage_present")) {
    check(
      "contract.lineage_present",
      (lineage?.length ?? 0) > 0 && lineage!.every((entry) => entry.user_id === userId),
      "Provider evidence has user-owned lineage.",
      "Persisted capability contract requires lineage, but no user-owned provider lineage is attached to this execution.",
    );
  }

  if (validationRules.includes("evidence_state_valid")) {
    const output = outputs?.find((entry) => entry.hash === outputHash);
    check(
      "contract.evidence_state_valid",
      providerEvidencePresent && !!output && output.value != null && output.evidence_state !== "OBSERVED",
      "Provider inputs remain observed evidence while derived output remains non-observed.",
      "Evidence-state semantics do not satisfy the persisted capability contract.",
    );
  }

  const output = outputs?.find((entry) => entry.hash === outputHash);
  check(
    "output.integrity",
    !!output && output.value != null && output.evidence_state !== "OBSERVED",
    "Derived capability output is persisted with the expected hash and semantic state.",
    "Capability output is missing, hash-mismatched, or marked as observed evidence.",
  );

  const usage = execution?.resource_usage as { duration_ms?: number } | null | undefined;
  const budget = run?.resource_budget as { max_execution_time_ms?: number } | null | undefined;
  check(
    "resource_budget",
    !!usage && (!budget?.max_execution_time_ms || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= budget.max_execution_time_ms),
    "Execution is within the configured resource budget.",
    "Execution resource usage is missing or exceeds its configured budget.",
  );

  return {
    eligible: failures.length === 0,
    status: failures.length === 0 ? "PASS" : "FAIL",
    critical_failures: failures,
    checks,
    evidence_snapshot: {
      evidence_state: "CALCULATED",
      run_id: runId,
      execution_id: executionId,
      capability_id: contract.capability_id,
      contract_version: contract.version,
      evidence_count: evidence?.length ?? 0,
      lineage_count: lineage?.length ?? 0,
      canonical_transaction_count: canonicalTransactionCount ?? 0,
    },
    reconciliation_snapshot: {
      status: failures.length === 0 ? "PASS" : "FAIL",
      scope: "independent_capability_evidence_lineage_contract",
      contract_version: contract.version,
      evidence_requirements: contract.evidence_requirements,
      validation_rules: contract.validation_rules,
      recursive: contract.recursive,
      cross_domain: contract.cross_domain,
    },
  };
}
