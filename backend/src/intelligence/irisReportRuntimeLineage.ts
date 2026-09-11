import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type RuntimeNodeRow = { id: string; capability_id: string | null; intelligence_key: string | null; intelligence_name: string | null; node_hash: string; recursive_depth: number | null; recursive_ancestry: string[] | null; upstream_node_ids: string[] | null; evidence_state: string };
type LineageRow = { lineage_role: string; source_type: string; source_id: string; source_field_path?: string | null; destination_type: string; destination_id: string; destination_field_path?: string | null; evidence_state?: string | null };
type TransformationEdgeRow = { id: string; downstream_node_id: string; upstream_node_id: string; capability_id: string; upstream_capability_id: string; input_paths: unknown; output_paths: unknown; source_hash: string | null; output_hash: string | null };
type RunEvidenceRow = { id: string };

export type IrisReportRuntimeLineage = {
  resolution_state: "resolved" | "partially_resolved" | "unresolved";
  report_id: string; analysis_definition_id: string; feature_ids: string[]; capability_ids: string[];
  intelligence_node_ids: string[]; upstream_intelligence_node_ids: string[]; transformation_edge_ids: string[]; run_evidence_ids: string[];
  evidence_lineage_present: boolean; run_id: string; execution_id: string; limitation: string | null;
};

/**
 * Resolve one report against one exact execution. Runtime resolution is fail-closed:
 * a capability must resolve to exactly one execution-bound node; every traversed
 * upstream reference must exist in that same boundary; transformation hashes must
 * match node hashes; and every root must recursively reach run-bound source evidence.
 * Catalog identifiers are never promoted to runtime evidence or intelligence nodes.
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

  const { data: runEvidence, error: runEvidenceError } = await supabaseAdmin.from("iris_run_evidence").select("id").eq("user_id", input.userId).eq("run_id", input.runId);
  if (runEvidenceError) throw new Error(`IRIS_REPORT_RUNTIME_EVIDENCE_LOOKUP_FAILED: ${runEvidenceError.message}`);
  const runEvidenceIds = new Set(((runEvidence ?? []) as RunEvidenceRow[]).map((row) => row.id));

  for (const dependency of input.dependencies) {
    const featureIds = [...dependency.feature_ids];
    const capabilityIds = [...new Set(featureIds.flatMap((featureId) => { const feature = IRIS_FEATURE_REGISTRY.find((candidate) => candidate.featureId === featureId); return feature?.capabilityId ? [feature.capabilityId] : []; }))].sort();
    const rootByCapability = new Map<string, RuntimeNodeRow>();
    const ambiguousCapabilities: string[] = [];
    const missingCapabilities: string[] = [];
    for (const capabilityId of capabilityIds) {
      const candidates = capabilityNodes.get(capabilityId) ?? [];
      if (candidates.length === 1) rootByCapability.set(capabilityId, candidates[0]);
      else if (!candidates.length) missingCapabilities.push(capabilityId);
      else ambiguousCapabilities.push(capabilityId);
    }
    const roots = [...rootByCapability.values()];
    const visited = new Set<string>();
    const visitedEdges = new Set<string>();
    const structuralFailures = new Set<string>();
    const stack = roots.map((node) => node.id);
    while (stack.length) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      const node = nodeById.get(nodeId);
      if (!node) { structuralFailures.add(`missing_node:${nodeId}`); continue; }
      visited.add(nodeId);
      const declaredUpstream = [...new Set(node.upstream_node_ids ?? [])];
      const outgoing = upstreamEdges.get(nodeId) ?? [];
      const outgoingByUpstream = new Map(outgoing.map((edge) => [edge.upstream_node_id, edge]));
      for (const upstreamId of declaredUpstream) {
        const upstream = nodeById.get(upstreamId);
        const edge = outgoingByUpstream.get(upstreamId);
        if (!upstream) { structuralFailures.add(`missing_upstream_node:${nodeId}->${upstreamId}`); continue; }
        if (!edge) { structuralFailures.add(`missing_transformation_edge:${nodeId}->${upstreamId}`); continue; }
        if (edge.source_hash !== null && edge.source_hash !== upstream.node_hash) structuralFailures.add(`source_hash_mismatch:${edge.id}`);
        if (edge.output_hash !== null && edge.output_hash !== node.node_hash) structuralFailures.add(`output_hash_mismatch:${edge.id}`);
        visitedEdges.add(edge.id);
        if (!visited.has(upstreamId)) stack.push(upstreamId);
      }
      for (const edge of outgoing) {
        if (!nodeById.has(edge.upstream_node_id)) { structuralFailures.add(`edge_upstream_missing:${edge.id}`); continue; }
        if (!declaredUpstream.includes(edge.upstream_node_id)) structuralFailures.add(`undeclared_transformation_edge:${edge.id}`);
      }
      for (const ancestorId of node.recursive_ancestry ?? []) if (!nodeById.has(ancestorId)) structuralFailures.add(`missing_recursive_ancestor:${nodeId}->${ancestorId}`);
    }

    const directEvidence = (nodeId: string): Set<string> => {
      const node = nodeById.get(nodeId);
      const ids = new Set([...(evidenceByNode.get(nodeId) ?? []), ...(node?.capability_id ? evidenceByCapability.get(node.capability_id) ?? [] : [])]);
      return new Set([...ids].filter((id) => runEvidenceIds.has(id)));
    };
    const grounding = new Map<string, boolean>();
    const groundingStack = new Set<string>();
    const isGrounded = (nodeId: string): boolean => {
      if (grounding.has(nodeId)) return grounding.get(nodeId)!;
      if (groundingStack.has(nodeId)) { structuralFailures.add(`lineage_cycle:${nodeId}`); return false; }
      const node = nodeById.get(nodeId);
      if (!node) return false;
      groundingStack.add(nodeId);
      const upstreamIds = [...new Set(node.upstream_node_ids ?? [])];
      const grounded = directEvidence(nodeId).size > 0 || (upstreamIds.length > 0 && upstreamIds.every(isGrounded));
      groundingStack.delete(nodeId);
      grounding.set(nodeId, grounded);
      return grounded;
    };
    const rootsGrounded = roots.length > 0 && roots.every((root) => isGrounded(root.id));
    const evidenceIds = [...new Set([...visited].flatMap((nodeId) => [...directEvidence(nodeId)]))].sort();
    const nodeIds = [...visited].sort();
    const rootIds = new Set(roots.map((node) => node.id));
    const upstreamNodeIds = nodeIds.filter((id) => !rootIds.has(id)).sort();
    const rootsComplete = capabilityIds.length > 0 && missingCapabilities.length === 0 && ambiguousCapabilities.length === 0;
    const structurallyResolved = structuralFailures.size === 0;
    const resolved = rootsComplete && structurallyResolved && rootsGrounded && evidenceIds.length > 0;
    const resolution_state = resolved ? "resolved" : nodeIds.length ? "partially_resolved" : "unresolved";
    const limitation = resolved ? null : [
      missingCapabilities.length ? `missing_capabilities:${missingCapabilities.join(",")}` : null,
      ambiguousCapabilities.length ? `ambiguous_capabilities:${ambiguousCapabilities.join(",")}` : null,
      structuralFailures.size ? `structural_lineage_failures:${[...structuralFailures].sort().join(",")}` : null,
      !rootsGrounded ? "one_or_more_runtime_roots_not_evidence_grounded" : null,
      evidenceIds.length === 0 ? "no_valid_run_bound_source_evidence" : null,
    ].filter((value): value is string => Boolean(value)).join(" | ") || "Recursive runtime lineage was not fully resolved.";
    result[dependency.report_id] = { resolution_state, report_id: dependency.report_id, analysis_definition_id: dependency.analysis_definition_id, feature_ids: featureIds, capability_ids: capabilityIds, intelligence_node_ids: nodeIds, upstream_intelligence_node_ids: upstreamNodeIds, transformation_edge_ids: [...visitedEdges].sort(), run_evidence_ids: evidenceIds, evidence_lineage_present: evidenceIds.length > 0, run_id: input.runId, execution_id: input.executionId, limitation };
  }
  return result;
}
