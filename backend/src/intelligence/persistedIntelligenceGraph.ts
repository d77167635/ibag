import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export const PERSISTED_INTELLIGENCE_GRAPH_VERSION = "iris-persisted-intelligence-graph-v3" as const;

type PersistedNode = {
  id: string;
  capability_id: string | null;
  intelligence_key: string | null;
  node_hash: string;
  evidence_state: CapabilityOperatorResult["evidence_state"];
};

type UpstreamNodeReference = {
  nodeId: string;
  role: string;
  sourceFieldPath?: string | null;
};

export type ArbitraryDerivedIntelligenceDefinition = {
  /** Stable semantic identity, independent of the finite capability registry. */
  intelligenceKey: string;
  /** Human-readable semantic name; metadata only, never evidence. */
  intelligenceName: string;
  /** Optional registry association. Arbitrary nodes do not require one. */
  capabilityId?: string | null;
  /** Operator/transformation identity that produced the node. */
  derivationOperator: string;
  derivationVersion: string;
  evidenceState: CapabilityOperatorResult["evidence_state"];
  value: Record<string, unknown>;
  asOf?: string | null;
  evidenceBoundary?: string | null;
  provenance?: Record<string, unknown>;
  upstream: UpstreamNodeReference[];
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function graphEvidenceState(state: CapabilityOperatorResult["evidence_state"]): CapabilityOperatorResult["evidence_state"] {
  return state;
}

function normalizeUpstream(upstream: UpstreamNodeReference[]): UpstreamNodeReference[] {
  const seen = new Set<string>();
  return upstream
    .filter((reference) => typeof reference.nodeId === "string" && reference.nodeId.length > 0)
    .filter((reference) => {
      if (seen.has(reference.nodeId)) return false;
      seen.add(reference.nodeId);
      return true;
    })
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

/**
 * Persists a derived intelligence node whose semantic identity is NOT required
 * to exist in the governed capability registry. This is the graph escape hatch
 * that allows recursive/cross-domain synthesis to create new derived intelligence
 * from already persisted intelligence nodes.
 *
 * Exact persisted upstream node UUIDs are mandatory. Ownership is verified before
 * persistence. Every upstream reference is retained on the destination node,
 * represented as a typed graph edge, and bound into execution lineage with the
 * supplied source field path. No provider observation, financial observation, or
 * money movement is created here.
 */
export async function persistArbitraryDerivedIntelligenceNode(input: {
  userId: string;
  runId: string;
  executionId: string;
  definition: ArbitraryDerivedIntelligenceDefinition;
}): Promise<PersistedNode> {
  const upstream = normalizeUpstream(input.definition.upstream);
  if (!input.definition.intelligenceKey.trim()) throw new Error("DERIVED_INTELLIGENCE_KEY_REQUIRED");
  if (!input.definition.intelligenceName.trim()) throw new Error("DERIVED_INTELLIGENCE_NAME_REQUIRED");
  if (!input.definition.derivationOperator.trim()) throw new Error("DERIVED_INTELLIGENCE_OPERATOR_REQUIRED");
  if (!input.definition.derivationVersion.trim()) throw new Error("DERIVED_INTELLIGENCE_VERSION_REQUIRED");
  if (!upstream.length) throw new Error("DERIVED_INTELLIGENCE_UPSTREAM_REQUIRED");

  const upstreamIds = upstream.map((reference) => reference.nodeId);
  const { data: upstreamRows, error: upstreamError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,node_hash,recursive_ancestry")
    .eq("user_id", input.userId)
    .in("id", upstreamIds);
  if (upstreamError) throw new Error(`DERIVED_INTELLIGENCE_UPSTREAM_LOOKUP_FAILED: ${upstreamError.message}`);
  if (!upstreamRows || upstreamRows.length !== upstreamIds.length) {
    throw new Error("DERIVED_INTELLIGENCE_UPSTREAM_NOT_FOUND_OR_NOT_OWNED");
  }

  const upstreamById = new Map(upstreamRows.map((row) => [row.id as string, row]));
  const recursiveAncestry = [...new Set([
    ...upstreamIds,
    ...upstreamRows.flatMap((row) => Array.isArray(row.recursive_ancestry) ? row.recursive_ancestry : []),
  ])].sort();

  const outputHash = hash({
    graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
    intelligence_key: input.definition.intelligenceKey,
    intelligence_name: input.definition.intelligenceName,
    capability_id: input.definition.capabilityId ?? null,
    derivation_operator: input.definition.derivationOperator,
    derivation_version: input.definition.derivationVersion,
    evidence_state: input.definition.evidenceState,
    value: input.definition.value,
    as_of: input.definition.asOf ?? null,
    evidence_boundary: input.definition.evidenceBoundary ?? null,
    upstream: upstream.map((reference) => ({
      node_id: reference.nodeId,
      role: reference.role,
      source_field_path: reference.sourceFieldPath ?? null,
      node_hash: upstreamById.get(reference.nodeId)?.node_hash ?? null,
    })),
  });

  const provenance = {
    ...(input.definition.provenance ?? {}),
    graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
    intelligence_key: input.definition.intelligenceKey,
    intelligence_name: input.definition.intelligenceName,
    capability_id: input.definition.capabilityId ?? null,
    derivation_operator: input.definition.derivationOperator,
    derivation_version: input.definition.derivationVersion,
    upstream_node_ids: upstreamIds,
    recursive_ancestry: recursiveAncestry,
    output_hash: outputHash,
    financial_values_created: false,
    provider_observations_created: false,
    money_movement_executed: false,
  };

  const nodePayload = {
    user_id: input.userId,
    run_id: input.runId,
    execution_id: input.executionId,
    node_type: "derived_intelligence",
    domain_key: null,
    capability_id: input.definition.capabilityId ?? null,
    intelligence_key: input.definition.intelligenceKey,
    intelligence_name: input.definition.intelligenceName,
    derivation_operator: input.definition.derivationOperator,
    derivation_version: input.definition.derivationVersion,
    evidence_state: graphEvidenceState(input.definition.evidenceState),
    value: input.definition.value,
    confidence: null,
    as_of: input.definition.asOf ?? null,
    evidence_boundary: input.definition.evidenceBoundary ?? null,
    provenance,
    node_hash: outputHash,
    upstream_node_ids: upstreamIds,
    recursive_ancestry: recursiveAncestry,
  };

  const { error: nodeInsertError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .upsert(nodePayload, { onConflict: "user_id,node_hash", ignoreDuplicates: true });
  if (nodeInsertError) throw new Error(`DERIVED_INTELLIGENCE_NODE_PERSIST_FAILED: ${nodeInsertError.message}`);

  const { data: node, error: nodeSelectError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,intelligence_key,node_hash,evidence_state")
    .eq("user_id", input.userId)
    .eq("node_hash", outputHash)
    .single();
  if (nodeSelectError || !node) throw new Error(`DERIVED_INTELLIGENCE_NODE_RESOLVE_FAILED: ${nodeSelectError?.message || "node not found after persistence"}`);

  const edgeRows = upstream.map((reference) => ({
    user_id: input.userId,
    run_id: input.runId,
    from_node_id: reference.nodeId,
    to_node_id: node.id,
    relation_type: "derives_from",
    evidence_state: graphEvidenceState(input.definition.evidenceState),
    weight: null,
    explanation: {
      graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
      role: reference.role,
      source_field_path: reference.sourceFieldPath ?? null,
      actual_dependency_consumed: true,
    },
    provenance: {
      source: "arbitrary_derived_intelligence",
      execution_id: input.executionId,
      upstream_node_hash: upstreamById.get(reference.nodeId)?.node_hash ?? null,
      destination_output_hash: outputHash,
    },
  }));

  const { error: edgeError } = await supabaseAdmin
    .from("iris_user_intelligence_edges")
    .upsert(edgeRows, { onConflict: "user_id,from_node_id,to_node_id,relation_type,run_id", ignoreDuplicates: true });
  if (edgeError) throw new Error(`DERIVED_INTELLIGENCE_EDGE_PERSIST_FAILED: ${edgeError.message}`);

  const compositionHash = hash({
    graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
    user_id: input.userId,
    run_id: input.runId,
    intelligence_key: input.definition.intelligenceKey,
    input_node_ids: upstreamIds,
    output_node_id: node.id,
    output_hash: outputHash,
  });

  const { error: compositionError } = await supabaseAdmin
    .from("iris_user_intelligence_compositions")
    .upsert({
      user_id: input.userId,
      run_id: input.runId,
      capability_id: `derived:${input.definition.intelligenceKey}`,
      composition_depth: 1,
      input_node_ids: upstreamIds,
      output_node_id: node.id,
      dependency_capability_ids: input.definition.capabilityId ? [input.definition.capabilityId] : [],
      evidence_state: graphEvidenceState(input.definition.evidenceState),
      contract_version: input.definition.derivationVersion,
      composition_hash: compositionHash,
    }, { onConflict: "user_id,run_id,composition_hash", ignoreDuplicates: true });
  if (compositionError) throw new Error(`DERIVED_INTELLIGENCE_COMPOSITION_PERSIST_FAILED: ${compositionError.message}`);

  const lineageRows = upstream.map((reference) => {
    const sourceNode = upstreamById.get(reference.nodeId);
    const sourceFieldPath = reference.sourceFieldPath ?? null;
    return {
      user_id: input.userId,
      run_id: input.runId,
      execution_id: input.executionId,
      lineage_role: "DEPENDENCY_INPUT",
      source_type: "intelligence_node",
      source_id: reference.nodeId,
      source_field_path: sourceFieldPath,
      destination_type: "intelligence_node",
      destination_id: node.id,
      destination_field_path: "value",
      evidence_state: graphEvidenceState(input.definition.evidenceState),
      transformation: input.definition.derivationOperator,
      source_hash: sourceNode?.node_hash ?? null,
      lineage_hash: hash({
        graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
        source_node_id: reference.nodeId,
        source_field_path: sourceFieldPath,
        destination_node_id: node.id,
        destination_field_path: "value",
        transformation: input.definition.derivationOperator,
        output_hash: outputHash,
      }),
      metadata: {
        graph_version: PERSISTED_INTELLIGENCE_GRAPH_VERSION,
        role: reference.role,
        derivation_version: input.definition.derivationVersion,
        actual_dependency_consumed: true,
        upstream_node_ids: upstreamIds,
        recursive_ancestry: recursiveAncestry,
      },
    };
  });

  const { error: lineageError } = await supabaseAdmin
    .from("iris_execution_lineage")
    .upsert(lineageRows, { onConflict: "user_id,execution_id,lineage_role,source_type,source_id,source_field_path,destination_type,destination_id,destination_field_path,lineage_hash", ignoreDuplicates: true });
  if (lineageError) throw new Error(`DERIVED_INTELLIGENCE_LINEAGE_PERSIST_FAILED: ${lineageError.message}`);

  return {
    id: node.id,
    capability_id: node.capability_id,
    intelligence_key: node.intelligence_key,
    node_hash: node.node_hash,
    evidence_state: node.evidence_state,
  };
}

/**
 * Materializes registry-backed intelligence through the same graph layer while
 * retaining its capability identity. The arbitrary API above remains available
 * for future derived intelligence that has no registry entry at all.
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
  const upstream = Object.entries(input.dependencyResults)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dependencyId]) => {
      const nodeId = input.dependencyNodeIds[dependencyId];
      if (!nodeId) throw new Error(`INTELLIGENCE_GRAPH_DEPENDENCY_NODE_MISSING: ${input.capabilityId} requires ${dependencyId}`);
      return { nodeId, role: dependencyId, sourceFieldPath: null };
    });

  return persistArbitraryDerivedIntelligenceNode({
    userId: input.userId,
    runId: input.runId,
    executionId: input.executionId,
    definition: {
      intelligenceKey: `capability:${input.capabilityId}`,
      intelligenceName: input.capabilityId,
      capabilityId: input.capabilityId,
      derivationOperator: input.result.operator_id,
      derivationVersion: input.result.operator_version,
      evidenceState: input.result.evidence_state,
      value: input.result.result,
      evidenceBoundary: input.result.result.evidence_boundary ?? null,
      provenance: {
        source: "governed_capability_execution",
        capability_id: input.capabilityId,
        dependency_capability_ids: Object.keys(input.dependencyResults).sort(),
      },
      upstream,
    },
  });
}
