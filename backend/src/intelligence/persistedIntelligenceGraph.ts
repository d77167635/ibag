import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export const PERSISTED_INTELLIGENCE_GRAPH_VERSION = "iris-persisted-intelligence-graph-v1" as const;

type PersistedNode = {
  id: string;
  capability_id: string;
  node_hash: string;
  evidence_state: CapabilityOperatorResult["evidence_state"];
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nodeHash(capabilityId: string, result: CapabilityOperatorResult): string {
  return hash({
    version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
    capability_id: capabilityId,
    operator_id: result.operator_id,
    operator_version: result.operator_version,
    evidence_state: result.evidence_state,
    result: result.result,
  });
}

function graphEvidenceState(state: CapabilityOperatorResult["evidence_state"]): CapabilityOperatorResult["evidence_state"] {
  return state;
}

/**
 * Materializes the intelligence actually produced by one execution into the
 * user-scoped graph. The graph is not limited to the capability registry:
 * every produced output has a durable node identity, and every dependency is
 * represented as a typed edge. Existing identical nodes may be reused across
 * executions; the current run remains attached through its edges/composition.
 * No financial observation is created here.
 */
export async function persistUserIntelligenceGraph(input: {
  userId: string;
  runId: string;
  executionId: string;
  capabilityId: string;
  result: CapabilityOperatorResult;
  dependencyResults: Record<string, CapabilityOperatorResult>;
  dependencyNodeIds: Record<string, string>;
}): Promise<PersistedNode> {
  const outputHash = nodeHash(input.capabilityId, input.result);
  const nodeType = input.capabilityId === "emergent" ? "cross_domain" : "intelligence";
  const nodePayload = {
    user_id: input.userId,
    run_id: input.runId,
    execution_id: input.executionId,
    node_type: nodeType,
    domain_key: null,
    capability_id: input.capabilityId,
    evidence_state: graphEvidenceState(input.result.evidence_state),
    value: input.result.result,
    confidence: null,
    as_of: input.result.result.evidence_boundary ?? null,
    evidence_boundary: input.result.result.evidence_boundary ?? null,
    provenance: {
      graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
      operator_id: input.result.operator_id,
      operator_version: input.result.operator_version,
      output_hash: outputHash,
      dependency_capability_ids: Object.keys(input.dependencyResults).sort(),
      dependency_node_ids: Object.fromEntries(Object.entries(input.dependencyNodeIds).sort(([a], [b]) => a.localeCompare(b))),
      financial_values_created: false,
      provider_observations_created: false,
      money_movement_executed: false,
    },
    node_hash: outputHash,
  };

  const { error: nodeInsertError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .upsert(nodePayload, { onConflict: "user_id,node_hash", ignoreDuplicates: true });
  if (nodeInsertError) throw new Error(`INTELLIGENCE_GRAPH_NODE_PERSIST_FAILED: ${nodeInsertError.message}`);

  const { data: node, error: nodeSelectError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,node_hash,evidence_state")
    .eq("user_id", input.userId)
    .eq("node_hash", outputHash)
    .single();
  if (nodeSelectError || !node) throw new Error(`INTELLIGENCE_GRAPH_NODE_RESOLVE_FAILED: ${nodeSelectError?.message || "node not found after persistence"}`);

  const dependencyRows = Object.entries(input.dependencyResults)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dependencyId, dependency]) => {
      const fromNodeId = input.dependencyNodeIds[dependencyId];
      if (!fromNodeId) throw new Error(`INTELLIGENCE_GRAPH_DEPENDENCY_NODE_MISSING: ${input.capabilityId} requires ${dependencyId}`);
      return {
        user_id: input.userId,
        run_id: input.runId,
        from_node_id: fromNodeId,
        to_node_id: node.id,
        relation_type: "derives_from",
        evidence_state: graphEvidenceState(input.result.evidence_state),
        weight: null,
        explanation: {
          graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
          dependency_capability_id: dependencyId,
          dependency_output_hash: hash(dependency.result),
          actual_dependency_consumed: true,
        },
        provenance: {
          source: "governed_execution_dependency",
          execution_id: input.executionId,
          dependency_evidence_state: dependency.evidence_state,
          destination_output_hash: outputHash,
        },
      };
    });

  if (dependencyRows.length) {
    const { error: edgeError } = await supabaseAdmin
      .from("iris_user_intelligence_edges")
      .upsert(dependencyRows, { onConflict: "user_id,from_node_id,to_node_id,relation_type,run_id", ignoreDuplicates: true });
    if (edgeError) throw new Error(`INTELLIGENCE_GRAPH_EDGE_PERSIST_FAILED: ${edgeError.message}`);
  }

  const inputNodeIds = Object.values(input.dependencyNodeIds).filter((id): id is string => typeof id === "string");
  if (inputNodeIds.length) {
    const compositionHash = hash({
      version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
      user_id: input.userId,
      run_id: input.runId,
      capability_id: input.capabilityId,
      input_node_ids: [...inputNodeIds].sort(),
      output_node_id: node.id,
      output_hash: outputHash,
    });
    const compositionDepth = 1 + Math.max(
      0,
      ...Object.keys(input.dependencyResults).map((dependencyId) => {
        const dependency = input.dependencyResults[dependencyId];
        const declared = dependency.result.provenance;
        const depth = declared && typeof declared === "object" && typeof (declared as { composition_depth?: unknown }).composition_depth === "number"
          ? (declared as { composition_depth: number }).composition_depth
          : 0;
        return depth;
      }),
    );
    const { error: compositionError } = await supabaseAdmin.from("iris_user_intelligence_compositions").upsert({
      user_id: input.userId,
      run_id: input.runId,
      capability_id: input.capabilityId,
      composition_depth: compositionDepth,
      input_node_ids: [...new Set(inputNodeIds)].sort(),
      output_node_id: node.id,
      dependency_capability_ids: Object.keys(input.dependencyResults).sort(),
      evidence_state: graphEvidenceState(input.result.evidence_state),
      contract_version: input.result.operator_version,
      composition_hash: compositionHash,
    }, { onConflict: "user_id,run_id,composition_hash", ignoreDuplicates: true });
    if (compositionError) throw new Error(`INTELLIGENCE_GRAPH_COMPOSITION_PERSIST_FAILED: ${compositionError.message}`);
  }

  return {
    id: node.id,
    capability_id: node.capability_id,
    node_hash: node.node_hash,
    evidence_state: node.evidence_state,
  };
}
