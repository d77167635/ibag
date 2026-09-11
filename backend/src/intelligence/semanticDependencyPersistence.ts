import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";

export async function persistSemanticDependencyProof(input: {
  userId: string;
  runId: string;
  executionId: string;
  capabilityId: string;
  dependencyResults: Record<string, CapabilityOperatorResult>;
  consumedDependencyIds: string[];
  result: CapabilityOperatorResult;
  proof: SemanticDependencyProof;
}): Promise<void> {
  const dependencyIds = [...new Set(input.consumedDependencyIds)].sort();
  if (dependencyIds.some((id) => input.dependencyResults[id] === undefined)) throw new Error(`SEMANTIC_DEPENDENCY_PROOF_INPUT_MISSING: ${input.capabilityId}`);
  const { error } = await supabaseAdmin.from("iris_semantic_dependency_proofs").insert({
    user_id: input.userId,
    run_id: input.runId,
    execution_id: input.executionId,
    capability_id: input.capabilityId,
    consumed_dependency_ids: dependencyIds,
    consumed_dependency_hashes: input.proof.consumed_dependency_hashes,
    output_hash: input.proof.output_hash,
    proof_version: input.proof.proof_version,
  });
  if (error) throw new Error(`SEMANTIC_DEPENDENCY_PROOF_PERSIST_FAILED: ${error.message}`);
}
