import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type EdgeRow = { id: string; downstream_node_id: string; upstream_node_id: string; capability_id: string; upstream_capability_id: string };
type NodeRow = { id: string; capability_id: string | null; upstream_node_ids: string[] | null; recursive_ancestry: string[] | null };

export type IrisReverseLineageResult = {
  resolution_state: "resolved" | "partially_resolved" | "unresolved";
  evidence_id: string;
  run_id: string;
  execution_id: string;
  intelligence_node_ids: string[];
  capability_ids: string[];
  transformation_edge_ids: string[];
  report_ids: string[];
  limitation: string | null;
};

/**
 * Exact reverse traversal: evidence -> SOURCE_EVIDENCE capability outputs ->
 * persisted intelligence nodes -> downstream transformation edges -> every
 * reachable descendant node/capability -> affected report products. Traversal
 * is cycle-safe and bounded to one user/run/execution; no catalog metadata is
 * treated as runtime evidence.
 */
export async function resolveIrisEvidenceReverseLineage(input: {
  userId: string;
  runId: string;
  executionId: string;
  evidenceId: string;
  dependencies: IrisReportDependency[];
}): Promise<IrisReverseLineageResult> {
  const { data: lineage, error: lineageError } = await supabaseAdmin.from("iris_execution_lineage").select("source_id,destination_type,destination_id").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId).eq("lineage_role", "SOURCE_EVIDENCE").eq("source_type", "run_evidence").eq("source_id", input.evidenceId);
  if (lineageError) throw new Error(`IRIS_REVERSE_EVIDENCE_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);
  const prefix = `${input.runId}:`;
  const capabilityIds = [...new Set((lineage ?? []).filter((row) => row.destination_type === "capability_output" && typeof row.destination_id === "string" && row.destination_id.startsWith(prefix)).map((row) => row.destination_id.slice(prefix.length)))].sort();

  const { data: nodes, error: nodeError } = await supabaseAdmin.from("iris_user_intelligence_nodes").select("id,capability_id,upstream_node_ids,recursive_ancestry").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (nodeError) throw new Error(`IRIS_REVERSE_INTELLIGENCE_NODE_LOOKUP_FAILED: ${nodeError.message}`);
  const runtimeNodes = (nodes ?? []) as NodeRow[];
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));
  const capabilityNodeIds = new Map<string, string[]>();
  for (const node of runtimeNodes) if (node.capability_id) capabilityNodeIds.set(node.capability_id, [...(capabilityNodeIds.get(node.capability_id) ?? []), node.id]);

  const { data: edges, error: edgeError } = await supabaseAdmin.from("iris_semantic_transformation_edges").select("id,downstream_node_id,upstream_node_id,capability_id,upstream_capability_id").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (edgeError) throw new Error(`IRIS_REVERSE_TRANSFORMATION_LOOKUP_FAILED: ${edgeError.message}`);
  const downstreamEdges = new Map<string, EdgeRow[]>();
  for (const edge of (edges ?? []) as EdgeRow[]) downstreamEdges.set(edge.upstream_node_id, [...(downstreamEdges.get(edge.upstream_node_id) ?? []), edge]);

  const startingNodeIds = [...new Set(capabilityIds.flatMap((capabilityId) => capabilityNodeIds.get(capabilityId) ?? []))];
  const visited = new Set<string>();
  const visitedEdges = new Set<string>();
  const stack = [...startingNodeIds];
  while (stack.length) {
    const nodeId = stack.pop()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const edge of downstreamEdges.get(nodeId) ?? []) {
      visitedEdges.add(edge.id);
      if (!visited.has(edge.downstream_node_id) && nodeById.has(edge.downstream_node_id)) stack.push(edge.downstream_node_id);
    }
  }

  const reachedNodeIds = [...visited].sort();
  const reachedCapabilityIds = [...new Set(reachedNodeIds.map((id) => nodeById.get(id)?.capability_id).filter((id): id is string => typeof id === "string").concat(capabilityIds))].sort();
  const reachedCapabilitySet = new Set(reachedCapabilityIds);
  const reportIds = [...new Set(input.dependencies.filter((dependency) => dependency.feature_ids.some((featureId) => {
    const feature = IRIS_FEATURE_REGISTRY.find((candidate) => candidate.featureId === featureId);
    return !!feature?.capabilityId && reachedCapabilitySet.has(feature.capabilityId);
  })).map((dependency) => dependency.report_id))].sort();

  const startingNodesResolved = startingNodeIds.length > 0;
  const downstreamTraversalResolved = startingNodesResolved && (visitedEdges.size === 0 || reachedNodeIds.length >= startingNodeIds.length);
  const resolution_state = !startingNodesResolved ? "unresolved" : reportIds.length && downstreamTraversalResolved ? "resolved" : "partially_resolved";
  const limitation = resolution_state === "resolved" ? null : !startingNodesResolved ? "No run-bound capability output or persisted intelligence node was resolved from this evidence record." : !reportIds.length ? "The evidence reaches runtime intelligence, but no affected report product is mapped to the reached capabilities." : "The evidence reaches runtime intelligence and reports, but recursive downstream traversal could not fully establish the affected graph.";

  return { resolution_state, evidence_id: input.evidenceId, run_id: input.runId, execution_id: input.executionId, intelligence_node_ids: reachedNodeIds, capability_ids: reachedCapabilityIds, transformation_edge_ids: [...visitedEdges].sort(), report_ids: reportIds, limitation };
}
