import crypto from "node:crypto";
import { supabaseAdmin } from "../db.js";

export const LEARNING_OPERATOR_VERSION = "1.0.0";

export type LearningOperatorResult = {
  capability_id: "learning";
  operator_id: "learning";
  version: string;
  evidence_state: "INFERRED" | "INSUFFICIENT_EVIDENCE";
  validated_outcome_count: number;
  experience_count: number;
  experiences: Array<{
    outcome_id: string;
    outcome_type: string;
    observed_at: string;
    rule_type: "validated_outcome_presence";
    rule_key: string;
    input_fingerprint: string;
    learned_value: { observed: true };
    evidence_hash: string;
  }>;
  output_hash: string;
};

export async function executeLearningOperator(userId: string): Promise<LearningOperatorResult> {
  const { data, error } = await supabaseAdmin
    .from("iris_outcome_observations")
    .select("id,outcome_type,observed_at,evidence_hash,outcome_state")
    .eq("user_id", userId)
    .eq("outcome_state", "VALIDATED")
    .order("observed_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Learning evidence query failed: ${error.message}`);

  const rows = data ?? [];
  const experiences = rows.map(row => {
    const input = `${row.outcome_type}:${row.id}:${row.evidence_hash}`;
    return {
      outcome_id: row.id,
      outcome_type: row.outcome_type,
      observed_at: row.observed_at,
      rule_type: "validated_outcome_presence" as const,
      rule_key: row.outcome_type,
      input_fingerprint: crypto.createHash("sha256").update(input).digest("hex"),
      learned_value: { observed: true as const },
      evidence_hash: row.evidence_hash,
    };
  });

  const payload = JSON.stringify({ userId, experiences });
  return {
    capability_id: "learning",
    operator_id: "learning",
    version: LEARNING_OPERATOR_VERSION,
    evidence_state: rows.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE",
    validated_outcome_count: rows.length,
    experience_count: experiences.length,
    experiences,
    output_hash: crypto.createHash("sha256").update(payload).digest("hex"),
  };
}
