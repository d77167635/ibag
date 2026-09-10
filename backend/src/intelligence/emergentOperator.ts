import crypto from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";

export const EMERGENT_OPERATOR_VERSION = "1.0.0";

export type EmergentOperatorResult = {
  capability_id: "emergent";
  operator_id: "emergent";
  version: string;
  evidence_state: "INFERRED" | "INSUFFICIENT_EVIDENCE";
  learning_count: number;
  discovery_count: number;
  discoveries: Array<{ discovery_type: "repeated_validated_outcome_type"; discovery_key: string; source_fingerprints: string[]; support_count: number; discovery: { repeated: true; outcome_type: string } }>;
  consumed_learning_output_hash: string | null;
  output_hash: string;
};

export async function executeEmergentOperator(userId: string, context?: CapabilityExecutionContext): Promise<EmergentOperatorResult> {
  const { data, error } = await supabaseAdmin
    .from("iris_learning_experiences")
    .select("id,rule_type,rule_key,input_fingerprint,learning_state,learned_value")
    .eq("user_id", userId)
    .eq("learning_state", "VALIDATED")
    .order("learned_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`Emergent evidence query failed: ${error.message}`);

  const rows = data ?? [];
  const consumedLearning = context?.dependencyOutputs.learning;
  const consumed_learning_output_hash = consumedLearning?.output_hash ?? null;
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.rule_type}:${row.rule_key}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const discoveries = [...grouped.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([key, group]) => ({
      discovery_type: "repeated_validated_outcome_type" as const,
      discovery_key: key,
      source_fingerprints: group.map(row => row.input_fingerprint),
      support_count: group.length,
      discovery: { repeated: true as const, outcome_type: group[0].rule_key },
    }));

  const payload = JSON.stringify({ userId, discoveries, consumed_learning_output_hash });
  return {
    capability_id: "emergent",
    operator_id: "emergent",
    version: EMERGENT_OPERATOR_VERSION,
    evidence_state: discoveries.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE",
    learning_count: rows.length,
    discovery_count: discoveries.length,
    discoveries,
    consumed_learning_output_hash,
    output_hash: crypto.createHash("sha256").update(payload).digest("hex"),
  };
}
