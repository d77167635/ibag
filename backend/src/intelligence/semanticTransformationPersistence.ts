import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";

export async function persistSemanticTransformationEdges(input: {
  userId: string;
  runId: string;
  executionId: string;
  capabilityId: string;
  downstreamNodeId: string;
  dependencyNodeIds: Record<string, string>;
  dependencyResults: Record<string, CapabilityOperatorResult>;
  consumedDependencyIds: string[];
  consumedDependencyPaths: Record<string, Set<string>>;
  result: CapabilityOperatorResult;
  proof: SemanticDependencyProof;
}): Promise<void> {
  for (const upstreamCapabilityId of [...new Set(input.consumedDependencyIds)].sort()) {
    const dependency = input.dependencyResults[upstreamCapabilityId];
    const upstreamNodeId = input.dependencyNodeIds[upstreamCapabilityId];
    if (!dependency || !upstreamNodeId) throw new Error(`SEMANTIC_TRANSFORMATION_INPUT_MISSING: ${input.capabilityId}<-${upstreamCapabilityId}`);
    const inputPaths = [...(input.consumedDependencyPaths[upstreamCapabilityId] ?? new Set<string>())].sort();
    const outputPaths = Object.keys(input.result.result).sort().map((key) => `root.result.${key}`);
    const { error } = await supabaseAdmin.from("iris_semantic_transformation_edges").insert({
      user_id: input.userId,
      run_id: input.runId,
      execution_id: input.executionId,
      downstream_node_id: input.downstreamNodeId,
      upstream_node_id: upstreamNodeId,
      capability_id: input.capabilityId,
      upstream_capability_id: upstreamCapabilityId,
      transformation_key: `capability:${input.capabilityId}:depends_on:${upstreamCapabilityId}`,
      transformation_version: input.proof.proof_version,
      input_paths: inputPaths,
      output_paths: outputPaths,
      source_hash: input.proof.consumed_dependency_hashes[upstreamCapabilityId] ?? null,
      output_hash: input.proof.output_hash,
      metadata: {
        semantic_contract_paths: inputPaths,
        output_surface: outputPaths,
        note: "Explicit runtime dependency transformation evidence; output-path listing is not an independent claim of semantic sufficiency or causation.",
      },
    });
    if (error) throw new Error(`SEMANTIC_TRANSFORMATION_EDGE_PERSIST_FAILED: ${error.message}`);
  }
}
