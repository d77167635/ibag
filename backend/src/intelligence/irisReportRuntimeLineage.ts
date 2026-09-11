import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type RuntimeNodeRow = { id: string; capability_id: string | null; intelligence_key: string | null; intelligence_name: string | null; node_hash: string; recursive_depth: number | null; recursive_ancestry: string[] | null; upstream_node_ids: string[] | null; evidence_state: string };
type LineageRow = { lineage_role: string; source_type: string; source_id: string; source_field_path?: string | null; destination_type: string; destination_id: string; destination_field_path?: string | null; evidence_state?: string | null };
type TransformationEdgeRow = { id: string; downstream_node_id: string; upstream_node_id: string; capability_id: string; upstream_capability_id: string; input_paths: unknown; output_paths: unknown; source_hash: string | null; output_hash: string | null };

export type IrisReportRuntimeLineage = {
  resolution_state: "resolved" | "partially_resolved" | "unresolved";
  report_id: string; analysis_definition_id: string; feature_ids: string[]; capability_ids: string[];
  intelligence_node_ids: string[]; upstream_intelligence_node_ids: string[]; transformation_edge_ids: string[]; run_evidence_ids: string[];
  evidence_lineage_present: boolean; run_id: string; execution_id: string; limitation: string | null;
};

/**
 * Resolve one report against one exact execution. Traversal is recursive and
 * bidirectionally grounded: report -> mapped capability nodes -> transformation
 * edges -> every reachable upstream node -> SOURCE_EVIDENCE. Catalog identifiers
 * are never promoted to runtime evidence or intelligence nodes.
 */
export async function resolveIrisReportRuntimeLineage(input: { userId: string; runId: string; executionId: string; dependencies: IrisReportDependency[] }): Promise<Record<string, IrisReportRuntimeLineage>> {
  const result: Record<string, IrisReportRuntimeLineage> = {};
  const { data: nodes, error: nodeError } = await supabaseAdmin.from("iris_user_intelligence_nodes").select("id,capability_id,intelligence_key,intelligence_name,node_hash,recursive_depth,recursive_ancestry,upstream_node_ids,evidence_state").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (nodeError) throw new Error(`IRIS_REPORT_RUNTIME_NODE_LOOKUP_FAILED: ${nodeError.message}`);
  const runtimeNodes = (nodes ?? []) as RuntimeNodeRow[];
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));
  const capabilityNodes = new Map<string, RuntimeNodeRow[]>();
  for (const node of runtimeNodes) if (node.capability_id) capabilityNodes.set(node.capability_id, [...(capabilityNodes.get(node.capability_id) ?? []), node]);

  const { data: edges, error: edgeError } = await supabaseAdmin.from("iris_semantic_transformation_edges").select("id,downstream_node_id,upstream_node_id,capability_id,upstream_capability_id,input_paths,output_paths,source_hash,output_hash").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (edgeError) throw new Error(`IRIS_REPORT_RUNTIME_TRANSFORMATION_LOOKUP_FAILED: ${edgeError.message}`);
  const transformationEdges = (edges ?? []) as TransformationEdgeRow[];
  const upstreamEdges = new Map<string, TransformationEdgeRow[]>();
  for (const edge of transformationEdges) upstreamEdges.set(edge.downstream_node_id, [...(upstreamEdges.get(edge.downstream_node_id) ?? []), edge]);

  const { data: lineage, error: lineageError } = await supabaseAdmin.from("iris_execution_lineage").select("lineage_role,source_type,source_id,source_field_path,destination_type,destination_id,destination_field_path,evidence_state").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (lineageError) throw new Error(`IRIS_REPORT_RUNTIME_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);
  const evidenceByNode = new Map<string, Set<string>>();
  const evidenceByCapability = new Map<string, Set<string>>();
  const prefix = `${input.runId}:`;
  for (const row of (lineage ?? []) as LineageRow[]) {
    if (row.lineage_role !== "SOURCE_EVIDENCE" || row.source_type !== "run_evidence") continue;
    if (row.destination_type === "intelligence_node" && nodeById.has(row.destination_id)) evidenceByNode.set(row.destination_id, new Set([...(evidenceByNode.get(row.destination_id) ?? []), row.source_id]));
    if (row.destination_type === "capability_output" && row.destination_id.startsWith(prefix)) {
      const capabilityId = row.destination_id.slice(prefix.length);
      evidenceByCapability.set(capabilityId, new Set([...(evidenceByCapability.get(capabilityId) ?? []), row.source_id]));
    }
  }

  for (const dependency of input.dependencies) {
    const featureIds = [...dependency.feature_ids];
    const capabilityIds = [...new Set(featureIds.flatMap((featureId) => { const feature = IRIS_FEATURE_REGISTRY.find((candidate) => candidate.featureId === featureId); return feature?.capabilityId ? [feature.capabilityId] : []; }))].sort();
    const roots = capabilityIds.flatMap((capabilityId) => capabilityNodes.get(capabilityId) ?? []);
    const visited = new Set<string>();
    const visitedEdges = new Set<string>();
    const stack = roots.map((node) => node.id);
    while (stack.length) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      for (const edge of upstreamEdges.get(nodeId) ?? []) {
        visitedEdges.add(edge.id);
        if (!visited.has(edge.upstream_node_id) && nodeById.has(edge.upstream_node_id)) stack.push(edge.upstream_node_id);
      }
      const node = nodeById.get(nodeId);
      for (const ancestorId of node?.recursive_ancestry ?? []) if (!visited.has(ancestorId) && nodeById.has(ancestorId)) stack.push(ancestorId);
      for (const upstreamId of node?.upstream_node_ids ?? []) if (!visited.has(upstreamId) && nodeById.has(upstreamId)) stack.push(upstreamId);
    }
    const nodeIds = [...visited].sort();
    const upstreamNodeIds = nodeIds.filter((id) => !roots.some((node) => node.id === id)).sort();
    const evidenceIds = [...new Set(nodeIds.flatMap((nodeId) => [...(evidenceByNode.get(nodeId) ?? [])]).concat(capabilityIds.flatMap((capabilityId) => [...(evidenceByCapability.get(capabilityId) ?? [])])))].sort();
    const allRootsResolved = capabilityIds.length > 0 && capabilityIds.every((capabilityId) => (capabilityNodes.get(capabilityId) ?? []).length > 0);
    const resolution_state = !nodeIds.length ? "unresolved" : allRootsResolved && evidenceIds.length > 0 ? "resolved" : "partially_resolved";
    const limitation = resolution_state === "resolved" ? null : !nodeIds.length ? "No persisted runtime intelligence node was resolved for the report's mapped capabilities." : evidenceIds.length === 0 ? "Recursive runtime nodes were resolved, but no run-bound SOURCE_EVIDENCE lineage was resolved." : "Only part of the report's recursive runtime lineage or mapped capability set was resolved.";
    result[dependency.report_id] = { resolution_state, report_id: dependency.report_id, analysis_definition_id: dependency.analysis_definition_id, feature_ids: featureIds, capability_ids: capabilityIds, intelligence_node_ids: nodeIds, upstream_intelligence_node_ids: upstreamNodeIds, transformation_edge_ids: [...visitedEdges].sort(), run_evidence_ids: evidenceIds, evidence_lineage_present: evidenceIds.length > 0, run_id: input.runId, execution_id: input.executionId, limitation };
  }
  return result;
}
