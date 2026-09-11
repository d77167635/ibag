import { supabaseAdmin } from "../config/supabase.js";
import { buildIrisReportDependencyGraph, type IrisReportDependency } from "./irisReportDependencyGraph.js";

type IrisDatabase = Pick<typeof supabaseAdmin, "from">;

type LineageRow = {
  lineage_role: string;
  source_type: string;
  source_id: string;
  destination_type: string;
  destination_id: string;
  evidence_state: string | null;
};

type RuntimeNodeRow = {
  id: string;
  capability_id: string | null;
  intelligence_key: string | null;
  recursive_ancestry: string[] | null;
  upstream_node_ids: string[] | null;
};

export type IrisEvidenceToReportResult = {
  evidence_ids: string[];
  intelligence_node_ids: string[];
  reachable_intelligence_node_ids: string[];
  represented_evidence_keys: string[];
  reports: Array<{
    report_id: string;
    analysis_definition_id: string;
    feature_ids: string[];
    required_evidence_keys: string[];
    missing_evidence_keys: string[];
    state: "satisfied" | "partial" | "unresolved";
    resolution_state: "definition_only";
    upstream_intelligence_node_ids: string[];
  }>;
};

function nodeKeys(node: RuntimeNodeRow): string[] {
  return [node.capability_id, node.intelligence_key, node.intelligence_key ? `capability:${node.intelligence_key}` : null]
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * Resolve the reverse product path from exact run-bound evidence into the
 * recursively reachable intelligence graph and then into report definitions.
 *
 * This function never treats provider availability, catalog metadata, or an
 * unbound current observation as evidence. The starting point is exclusively
 * SOURCE_EVIDENCE lineage inside the supplied user/run/execution boundary.
 *
 * The result distinguishes definition-level report matching from runtime
 * evidence resolution. It does not certify a report, prove mathematical
 * sufficiency, or publish a report.
 *
 * The database dependency is injectable only for deterministic read-only tests.
 * Production callers use the connected Supabase client by default.
 */
export async function resolveIrisEvidenceToReports(input: {
  userId: string;
  runId: string;
  executionId: string;
  evidenceIds: string[];
  reportDependencyGraph?: IrisReportDependency[];
  database?: IrisDatabase;
}): Promise<IrisEvidenceToReportResult> {
  const evidenceIds = uniqueSorted(input.evidenceIds);
  const reportDependencyGraph = input.reportDependencyGraph ?? buildIrisReportDependencyGraph();
  const database = input.database ?? supabaseAdmin;

  if (!evidenceIds.length) {
    return {
      evidence_ids: [],
      intelligence_node_ids: [],
      reachable_intelligence_node_ids: [],
      represented_evidence_keys: [],
      reports: reportDependencyGraph.map((report) => ({
        report_id: report.report_id,
        analysis_definition_id: report.analysis_definition_id,
        feature_ids: report.feature_ids,
        required_evidence_keys: report.required_evidence_keys,
        missing_evidence_keys: report.required_evidence_keys,
        state: "unresolved",
        resolution_state: report.resolution_state,
        upstream_intelligence_node_ids: [],
      })),
    };
  }

  const { data: lineageRows, error: lineageError } = await database
    .from("iris_execution_lineage")
    .select("lineage_role,source_type,source_id,destination_type,destination_id,evidence_state")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (lineageError) throw new Error(`IRIS_EVIDENCE_TO_REPORT_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);
  const lineage = (lineageRows ?? []) as LineageRow[];

  const sourceNodeIds = uniqueSorted(
    lineage
      .filter((row) => row.lineage_role === "SOURCE_EVIDENCE" && row.source_type === "run_evidence" && evidenceIds.includes(row.source_id) && row.destination_type === "intelligence_node")
      .map((row) => row.destination_id),
  );

  const { data: nodes, error: nodeError } = await database
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,intelligence_key,recursive_ancestry,upstream_node_ids")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (nodeError) throw new Error(`IRIS_EVIDENCE_TO_REPORT_NODE_LOOKUP_FAILED: ${nodeError.message}`);

  const runtimeNodes = (nodes ?? []) as RuntimeNodeRow[];
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));
  const downstreamByNode = new Map<string, Set<string>>();

  for (const row of lineage) {
    if (row.lineage_role !== "DEPENDENCY_INPUT" || row.source_type !== "intelligence_node" || row.destination_type !== "intelligence_node") continue;
    if (!nodeById.has(row.source_id) || !nodeById.has(row.destination_id)) continue;
    const destinations = downstreamByNode.get(row.source_id) ?? new Set<string>();
    destinations.add(row.destination_id);
    downstreamByNode.set(row.source_id, destinations);
  }

  for (const node of runtimeNodes) {
    for (const upstreamId of node.upstream_node_ids ?? []) {
      if (!nodeById.has(upstreamId)) continue;
      const destinations = downstreamByNode.get(upstreamId) ?? new Set<string>();
      destinations.add(node.id);
      downstreamByNode.set(upstreamId, destinations);
    }
  }

  const reachable = new Set<string>();
  const stack = [...sourceNodeIds];
  while (stack.length) {
    const nodeId = stack.pop()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    for (const downstreamId of downstreamByNode.get(nodeId) ?? []) {
      if (!reachable.has(downstreamId)) stack.push(downstreamId);
    }
  }

  const representedKeys = new Set<string>();
  for (const nodeId of reachable) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    for (const key of nodeKeys(node)) representedKeys.add(key);
  }

  const reports = reportDependencyGraph.map((report) => {
    const required = uniqueSorted(report.required_evidence_keys);
    const missing = required.filter((key) => !representedKeys.has(key));
    const state: "satisfied" | "partial" | "unresolved" = required.length === 0
      ? "unresolved"
      : missing.length === 0
        ? "satisfied"
        : missing.length < required.length
          ? "partial"
          : "unresolved";
    const upstream = uniqueSorted(
      [...reachable]
        .filter((nodeId) => {
          const node = nodeById.get(nodeId);
          return !!node && required.some((key) => node.capability_id === key || node.intelligence_key === key || node.intelligence_key === `capability:${key}`);
        }),
    );

    return {
      report_id: report.report_id,
      analysis_definition_id: report.analysis_definition_id,
      feature_ids: report.feature_ids,
      required_evidence_keys: required,
      missing_evidence_keys: missing,
      state,
      resolution_state: report.resolution_state,
      upstream_intelligence_node_ids: upstream,
    };
  });

  return {
    evidence_ids: evidenceIds,
    intelligence_node_ids: sourceNodeIds,
    reachable_intelligence_node_ids: uniqueSorted([...reachable]),
    represented_evidence_keys: uniqueSorted([...representedKeys]),
    reports,
  };
}
