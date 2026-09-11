import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type RuntimeNodeRow = { id: string; capability_id: string | null; intelligence_key: string | null; intelligence_name: string | null; node_hash: string; recursive_depth: number | null; recursive_ancestry: string[] | null; evidence_state: string };
type LineageRow = { lineage_role: string; source_type: string; source_id: string; destination_type: string; destination_id: string };

export type IrisReportRuntimeLineage = {
  resolution_state: "resolved" | "partially_resolved" | "unresolved";
  report_id: string; analysis_definition_id: string; feature_ids: string[]; capability_ids: string[];
  intelligence_node_ids: string[]; upstream_intelligence_node_ids: string[]; run_evidence_ids: string[];
  evidence_lineage_present: boolean; run_id: string; execution_id: string; limitation: string | null;
};

/** Resolve a report definition against one exact executed graph/evidence boundary. */
export async function resolveIrisReportRuntimeLineage(input: { userId: string; runId: string; executionId: string; dependencies: IrisReportDependency[] }): Promise<Record<string, IrisReportRuntimeLineage>> {
  const result: Record<string, IrisReportRuntimeLineage> = {};
  const dependenciesByReport = new Map(input.dependencies.map((item) => [item.report_id, item]));
  const { data: nodes, error: nodeError } = await supabaseAdmin.from("iris_user_intelligence_nodes").select("id,capability_id,intelligence_key,intelligence_name,node_hash,recursive_depth,recursive_ancestry,evidence_state").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (nodeError) throw new Error(`IRIS_REPORT_RUNTIME_NODE_LOOKUP_FAILED: ${nodeError.message}`);
  const capabilityNodes = new Map<string, RuntimeNodeRow[]>();
  for (const node of (nodes ?? []) as RuntimeNodeRow[]) if (node.capability_id) capabilityNodes.set(node.capability_id, [...(capabilityNodes.get(node.capability_id) ?? []), node]);

  const { data: lineage, error: lineageError } = await supabaseAdmin.from("iris_execution_lineage").select("lineage_role,source_type,source_id,destination_type,destination_id").eq("user_id", input.userId).eq("run_id", input.runId).eq("execution_id", input.executionId);
  if (lineageError) throw new Error(`IRIS_REPORT_RUNTIME_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);
  const evidenceByCapability = new Map<string, Set<string>>();
  const prefix = `${input.runId}:`;
  for (const row of (lineage ?? []) as LineageRow[]) {
    if (row.lineage_role !== "SOURCE_EVIDENCE" || row.source_type !== "run_evidence" || row.destination_type !== "capability_output" || !row.destination_id.startsWith(prefix)) continue;
    const capabilityId = row.destination_id.slice(prefix.length);
    evidenceByCapability.set(capabilityId, new Set([...(evidenceByCapability.get(capabilityId) ?? []), row.source_id]));
  }

  for (const dependency of input.dependencies) {
    const featureIds = [...dependency.feature_ids];
    const capabilityIds = [...new Set(featureIds.flatMap((featureId) => { const feature = IRIS_FEATURE_REGISTRY.find((candidate) => candidate.featureId === featureId); return feature?.capabilityId ? [feature.capabilityId] : []; }))].sort();
    const matchedNodes = capabilityIds.flatMap((capabilityId) => capabilityNodes.get(capabilityId) ?? []);
    const nodeIds = [...new Set(matchedNodes.map((node) => node.id))].sort();
    const upstreamNodeIds = [...new Set(matchedNodes.flatMap((node) => Array.isArray(node.recursive_ancestry) ? node.recursive_ancestry : []))].filter((id) => !nodeIds.includes(id)).sort();
    const evidenceIds = [...new Set(capabilityIds.flatMap((capabilityId) => [...(evidenceByCapability.get(capabilityId) ?? [])]))].sort();
    const resolution_state = nodeIds.length === 0 ? "unresolved" : (nodeIds.length < capabilityIds.length || evidenceIds.length === 0 ? "partially_resolved" : "resolved");
    const limitation = resolution_state === "resolved" ? null : evidenceIds.length === 0 ? "No run-bound SOURCE_EVIDENCE lineage was resolved for the mapped runtime capability nodes." : "Only part of the report definition's mapped runtime capability graph was resolved for this execution.";
    result[dependency.report_id] = { resolution_state, report_id: dependency.report_id, analysis_definition_id: dependency.analysis_definition_id, feature_ids: featureIds, capability_ids: capabilityIds, intelligence_node_ids: nodeIds, upstream_intelligence_node_ids: upstreamNodeIds, run_evidence_ids: evidenceIds, evidence_lineage_present: evidenceIds.length > 0, run_id: input.runId, execution_id: input.executionId, limitation };
  }
  return result;
}
