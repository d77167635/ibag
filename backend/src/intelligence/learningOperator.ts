import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";

export const LEARNING_OPERATOR_VERSION = "1.1.0";

export type LearningOperatorResult = {
  capability_id: "learning";
  operator_id: "learning";
  version: string;
  evidence_state: "INFERRED" | "INSUFFICIENT_EVIDENCE";
  validated_outcome_count: number;
  experience_count: number;
  persisted_experience_count: number;
  validated_experience_count: number;
  experiences: Array<{ outcome_id: string; outcome_type: string; observed_at: string; rule_type: "validated_outcome_presence"; rule_key: string; input_fingerprint: string; learned_value: { observed: true }; evidence_hash: string }>;
  consumed_outcome_output_hash: string | null;
  output_hash: string;
};

export async function executeLearningOperator(userId: string, context?: CapabilityExecutionContext): Promise<LearningOperatorResult> {
  const { data, error } = await supabaseAdmin
    .from("iris_outcome_observations")
    .select("id,outcome_type,observed_at,evidence_hash,outcome_state")
    .eq("user_id", userId)
    .eq("outcome_state", "VALIDATED")
    .order("observed_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Learning evidence query failed: ${error.message}`);

  const rows = data ?? [];
  const consumedOutcome = context?.dependencyOutputs.outcome;
  const consumed_outcome_output_hash = consumedOutcome?.output_hash ?? null;
  const experiences = rows.map(row => {
    const input = `${row.outcome_type}:${row.id}:${row.evidence_hash}:${consumed_outcome_output_hash ?? "no-upstream-outcome"}`;
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

  let persisted_experience_count = 0;
  if (experiences.length) {
    const payload = experiences.map(experience => ({
      user_id: userId,
      outcome_id: experience.outcome_id,
      rule_type: experience.rule_type,
      rule_key: experience.rule_key,
      input_fingerprint: experience.input_fingerprint,
      evidence_hash: experience.evidence_hash,
      learning_state: "PROPOSED",
      learned_value: experience.learned_value,
      validation: {
        source: "validated_outcome_observation",
        outcome_id: experience.outcome_id,
        evidence_bound: true,
        upstream_outcome_output_hash: consumed_outcome_output_hash,
        operator_version: LEARNING_OPERATOR_VERSION,
      },
    }));
    const { data: persistedRows, error: persistError } = await supabaseAdmin
      .from("iris_learning_experiences")
      .upsert(payload, { onConflict: "user_id,rule_type,rule_key,input_fingerprint,evidence_hash", ignoreDuplicates: true })
      .select("id");
    if (persistError) throw new Error(`Learning experience persistence failed: ${persistError.message}`);
    persisted_experience_count = persistedRows?.length ?? 0;
  }

  let validated_experience_count = 0;
  for (const experience of experiences) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("iris_learning_experiences")
      .select("id,learning_state")
      .eq("user_id", userId)
      .eq("rule_type", experience.rule_type)
      .eq("rule_key", experience.rule_key)
      .eq("input_fingerprint", experience.input_fingerprint)
      .eq("evidence_hash", experience.evidence_hash)
      .maybeSingle();
    if (existingError) throw new Error(`Learning experience lookup failed: ${existingError.message}`);
    if (!existing?.id) continue;
    if (existing.learning_state === "VALIDATED") {
      validated_experience_count += 1;
      continue;
    }
    if (existing.learning_state !== "PROPOSED") continue;

    const { data: validated, error: validationError } = await supabaseAdmin
      .rpc("validate_iris_learning_experience", { p_experience_id: existing.id });
    if (validationError) throw new Error(`Learning experience validation failed: ${validationError.message}`);
    if (validated === true) validated_experience_count += 1;
  }

  const outputPayload = { userId, experiences, consumed_outcome_output_hash, persisted_experience_count, validated_experience_count };
  return {
    capability_id: "learning",
    operator_id: "learning",
    version: LEARNING_OPERATOR_VERSION,
    evidence_state: rows.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE",
    validated_outcome_count: rows.length,
    experience_count: experiences.length,
    persisted_experience_count,
    validated_experience_count,
    experiences,
    consumed_outcome_output_hash,
    output_hash: crypto.createHash("sha256").update(JSON.stringify(outputPayload)).digest("hex"),
  };
}
