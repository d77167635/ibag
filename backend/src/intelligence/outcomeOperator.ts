import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";

export const OUTCOME_OPERATOR_VERSION = "1.0.0";

export type OutcomeOperatorResult = {
  capability_id: "outcome";
  operator_id: "outcome";
  version: string;
  evidence_state: "CALCULATED" | "INSUFFICIENT_EVIDENCE";
  outcome_count: number;
  validated_count: number;
  observations: Array<{ id: string; outcome_type: string; observed_at: string; effective_at: string | null; value: unknown; evidence_hash: string }>;
  upstream_intelligence_hashes: string[];
  output_hash: string;
};

export async function executeOutcomeOperator(userId: string, context?: CapabilityExecutionContext): Promise<OutcomeOperatorResult> {
  const { data, error } = await supabaseAdmin
    .from("iris_outcome_observations")
    .select("id,outcome_type,outcome_state,observed_at,effective_at,value,evidence_hash")
    .eq("user_id", userId)
    .in("outcome_state", ["OBSERVED", "VALIDATED"])
    .order("observed_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Outcome evidence query failed: ${error.message}`);

  const rows = data ?? [];
  const observations = rows.map(row => ({ id: row.id, outcome_type: row.outcome_type, observed_at: row.observed_at, effective_at: row.effective_at ?? null, value: row.value, evidence_hash: row.evidence_hash }));
  const upstream_intelligence_hashes = Object.values(context?.dependencyOutputs ?? {}).map(output => output.output_hash).sort();
  const payload = JSON.stringify({ userId, observations, upstream_intelligence_hashes });
  return {
    capability_id: "outcome",
    operator_id: "outcome",
    version: OUTCOME_OPERATOR_VERSION,
    evidence_state: rows.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE",
    outcome_count: rows.length,
    validated_count: rows.filter(row => row.outcome_state === "VALIDATED").length,
    observations,
    upstream_intelligence_hashes,
    output_hash: crypto.createHash("sha256").update(payload).digest("hex"),
  };
}
