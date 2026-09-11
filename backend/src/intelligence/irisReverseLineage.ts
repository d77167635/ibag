import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

export type IrisReverseLineageResult = {
  resolution_state: "resolved" | "unresolved";
  evidence_id: string;
  run_id: string;
  execution_id: string;
  intelligence_node_ids: string[];
  capability_ids: string[];
  report_ids: string[];
  limitation: string | null;
};

/**
 * Traverse one exact run-bound evidence record in the reverse direction:
 * evidence -> executed capability -> persisted intelligence node -> report.
 * No catalog identifier is treated as a runtime observation or node.
 */
export async function resolveIrisEvidenceReverseLineage(input: {
  userId: string;
  runId: string;
  executionId: string;
  evidenceId: string;
  dependencies: IrisReportDependency[];
}): Promise<IrisReverseLineageResult> {
  const { data: lineage, error: lineageError } = await supabaseAdmin
    .from("iris_execution_lineage")
    .select("source_id,destination_type,destination_id")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId)
    .eq("lineage_role", "SOURCE_EVIDENCE")
    .eq("source_type", "run_evidence")
    .eq("source_id", input.evidenceId);
  if (lineageError) throw new Error(`IRIS_REVERSE_EVIDENCE_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);

  const prefix = `${input.runId}:`;
  const capabilityIds = [...new Set((lineage ?? [])
    .filter((row) => row.destination_type === "capability_output" && typeof row.destination_id === "string" && row.destination_id.startsWith(prefix))
    .map((row) => row.destination_id.slice(prefix.length)))] .sort();

  if (!capabilityIds.length) {
    return {
      resolution_state: "unresolved",
      evidence_id: input.evidenceId,
      run_id: input.runId,
      execution_id: input.executionId,
      intelligence_node_ids: [],
      capability_ids: [],
      report_ids: [],
      limitation: "No run-bound capability lineage was resolved from this evidence record for the supplied execution.",
    };
  }

  const { data: nodes, error: nodeError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId)
    .in("capability_id", capabilityIds);
  if (nodeError) throw new Error(`IRIS_REVERSE_INTELLIGENCE_NODE_LOOKUP_FAILED: ${nodeError.message}`);

  const nodeIds = [...new Set((nodes ?? []).map((node) => node.id as string))].sort();
  const nodeCapabilityIds = [...new Set((nodes ?? []).map((node) => node.capability_id).filter((id): id is string => typeof id === "string"))].sort();
  const reportIds = [...new Set(input.dependencies
    .filter((dependency) => dependency.feature_ids.some((featureId) => {
      const feature = IRIS_FEATURE_REGISTRY.find((candidate) => candidate.featureId === featureId);
      return !!feature?.capabilityId && nodeCapabilityIds.includes(feature.capabilityId);
    }))
    .map((dependency) => dependency.report_id))].sort();

  return {
    resolution_state: nodeIds.length && reportIds.length ? "resolved" : "unresolved",
    evidence_id: input.evidenceId,
    run_id: input.runId,
    execution_id: input.executionId,
    intelligence_node_ids: nodeIds,
    capability_ids: nodeCapabilityIds,
    report_ids: reportIds,
    limitation: nodeIds.length && reportIds.length ? null : "The evidence is run-bound, but the reverse traversal did not resolve both a persisted intelligence node and a mapped report product.",
  };
}
