import { supabaseAdmin } from "../config/supabase.js";
import type { ReportEvidenceBoundary, ReportEvidenceObservation } from "./irisReportEvidenceBoundary.js";
import { evaluateReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";

type RuntimeNodeRow = {
  id: string;
  capability_id: string | null;
  intelligence_key: string | null;
  recursive_ancestry: string[] | null;
  upstream_node_ids: string[] | null;
  evidence_state: string;
};

type LineageRow = {
  lineage_role: string;
  source_type: string;
  source_id: string;
  destination_type: string;
  destination_id: string;
  evidence_state: string | null;
};

type RunEvidenceRow = {
  id: string;
  evidence_type: string;
  provider: string | null;
  product: string | null;
  receipt_id: string | null;
  product_observation_id: string | null;
  raw_observation_id: string | null;
  source_field_id: string | null;
  effective_at: string | null;
  acquired_at: string | null;
  evidence_hash: string | null;
};

type SourceFieldRow = {
  id: string;
  raw_observation_id: string | null;
  field_path: string;
  field_type: string;
  value_hash: string | null;
  evidence_state: string;
};

export type IrisResolvedReportEvidence = {
  boundary: ReportEvidenceBoundary;
  observations: ReportEvidenceObservation[];
  evidence_ids: string[];
  raw_observation_ids: string[];
  source_field_ids: string[];
  source_observations: Array<{
    evidence_id: string;
    raw_observation_id: string | null;
    source_field_id: string | null;
    evidence_type: string;
    provider: string | null;
    product: string | null;
    effective_at: string | null;
    acquired_at: string | null;
    evidence_hash: string | null;
  }>;
  limitation: string | null;
};

/**
 * Resolve report evidence requirements only from the exact executed runtime graph.
 * A required key is authoritative when an executed runtime node represents that
 * key (capability_id or capability:<key> intelligence_key) and that node can be
 * traced to exact run_evidence through persisted lineage/upstream references.
 * Catalog names, analysis definitions, provider availability, and unbound current
 * observations are never promoted to evidence.
 */
export async function resolveIrisReportEvidence(input: {
  userId: string;
  runId: string;
  executionId: string;
  requiredKeys: string[];
}): Promise<IrisResolvedReportEvidence> {
  const requiredKeys = [...new Set(input.requiredKeys)].sort();
  if (!requiredKeys.length) {
    return { boundary: evaluateReportEvidenceBoundary([], []), observations: [], evidence_ids: [], raw_observation_ids: [], source_field_ids: [], source_observations: [], limitation: null };
  }

  const { data: nodes, error: nodeError } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,intelligence_key,recursive_ancestry,upstream_node_ids,evidence_state")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (nodeError) throw new Error(`IRIS_REPORT_EVIDENCE_NODE_LOOKUP_FAILED: ${nodeError.message}`);
  const runtimeNodes = (nodes ?? []) as RuntimeNodeRow[];
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));

  const { data: lineageRows, error: lineageError } = await supabaseAdmin
    .from("iris_execution_lineage")
    .select("lineage_role,source_type,source_id,destination_type,destination_id,evidence_state")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (lineageError) throw new Error(`IRIS_REPORT_EVIDENCE_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);
  const lineage = (lineageRows ?? []) as LineageRow[];

  const upstreamByNode = new Map<string, Set<string>>();
  for (const row of lineage) {
    if (row.lineage_role !== "DEPENDENCY_INPUT" || row.destination_type !== "intelligence_node" || row.source_type !== "intelligence_node") continue;
    upstreamByNode.set(row.destination_id, new Set([...(upstreamByNode.get(row.destination_id) ?? []), row.source_id]));
  }

  const evidenceByCapabilityOutput = new Map<string, Set<string>>();
  const evidenceByNode = new Map<string, Set<string>>();
  for (const row of lineage) {
    if (row.lineage_role !== "SOURCE_EVIDENCE" || row.source_type !== "run_evidence") continue;
    if (row.destination_type === "intelligence_node" && nodeById.has(row.destination_id)) {
      evidenceByNode.set(row.destination_id, new Set([...(evidenceByNode.get(row.destination_id) ?? []), row.source_id]));
    }
    if (row.destination_type === "capability_output") {
      evidenceByCapabilityOutput.set(row.destination_id, new Set([...(evidenceByCapabilityOutput.get(row.destination_id) ?? []), row.source_id]));
    }
  }

  const sourceNodeIdsByKey = new Map<string, string[]>();
  for (const key of requiredKeys) {
    const matches = runtimeNodes
      .filter((node) => node.capability_id === key || node.intelligence_key === key || node.intelligence_key === `capability:${key}`)
      .map((node) => node.id)
      .sort();
    sourceNodeIdsByKey.set(key, matches);
  }

  const evidenceIdsByKey = new Map<string, Set<string>>();
  for (const key of requiredKeys) {
    const startingNodes = sourceNodeIdsByKey.get(key) ?? [];
    const visited = new Set<string>();
    const evidenceIds = new Set<string>();
    const stack = [...startingNodes];
    while (stack.length) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      for (const evidenceId of evidenceByNode.get(nodeId) ?? []) evidenceIds.add(evidenceId);
      const node = nodeById.get(nodeId);
      for (const ancestorId of node?.recursive_ancestry ?? []) if (nodeById.has(ancestorId) && !visited.has(ancestorId)) stack.push(ancestorId);
      for (const upstreamId of node?.upstream_node_ids ?? []) if (nodeById.has(upstreamId) && !visited.has(upstreamId)) stack.push(upstreamId);
      for (const upstreamId of upstreamByNode.get(nodeId) ?? []) if (nodeById.has(upstreamId) && !visited.has(upstreamId)) stack.push(upstreamId);
    }
    const prefix = `${input.runId}:`;
    for (const nodeId of visited) {
      const node = nodeById.get(nodeId);
      if (!node?.capability_id) continue;
      for (const evidenceId of evidenceByCapabilityOutput.get(`${prefix}${node.capability_id}`) ?? []) evidenceIds.add(evidenceId);
    }
    evidenceIdsByKey.set(key, evidenceIds);
  }

  const allEvidenceIds = [...new Set([...evidenceIdsByKey.values()].flatMap((ids) => [...ids]))].sort();
  let evidenceRows: RunEvidenceRow[] = [];
  if (allEvidenceIds.length) {
    const { data, error } = await supabaseAdmin
      .from("iris_run_evidence")
      .select("id,evidence_type,provider,product,receipt_id,product_observation_id,raw_observation_id,source_field_id,effective_at,acquired_at,evidence_hash")
      .eq("user_id", input.userId)
      .eq("run_id", input.runId)
      .in("id", allEvidenceIds);
    if (error) throw new Error(`IRIS_REPORT_EVIDENCE_RECORD_LOOKUP_FAILED: ${error.message}`);
    evidenceRows = (data ?? []) as RunEvidenceRow[];
  }
  const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));

  const sourceFieldIds = [...new Set(evidenceRows.map((row) => row.source_field_id).filter((id): id is string => typeof id === "string"))].sort();
  let sourceFieldRows: SourceFieldRow[] = [];
  if (sourceFieldIds.length) {
    const { data, error } = await supabaseAdmin
      .from("iris_source_field_observations")
      .select("id,raw_observation_id,field_path,field_type,value_hash,evidence_state")
      .eq("user_id", input.userId)
      .in("id", sourceFieldIds);
    if (error) throw new Error(`IRIS_REPORT_SOURCE_FIELD_LOOKUP_FAILED: ${error.message}`);
    sourceFieldRows = (data ?? []) as SourceFieldRow[];
  }
  const sourceFieldById = new Map(sourceFieldRows.map((row) => [row.id, row]));

  const observations: ReportEvidenceObservation[] = [];
  for (const key of requiredKeys) {
    for (const evidenceId of evidenceIdsByKey.get(key) ?? []) {
      const row = evidenceById.get(evidenceId);
      if (!row) continue;
      const sourceField = row.source_field_id ? sourceFieldById.get(row.source_field_id) : null;
      const state = sourceField?.evidence_state === "observed" || row.evidence_type.startsWith("provider_raw_") ? "observed" : "derived";
      observations.push({ evidence_id: evidenceId, evidence_key: key, state });
    }
  }

  const boundary = evaluateReportEvidenceBoundary(requiredKeys, observations);
  const sourceObservationRows = evidenceRows.map((row) => ({
    evidence_id: row.id,
    raw_observation_id: row.raw_observation_id,
    source_field_id: row.source_field_id,
    evidence_type: row.evidence_type,
    provider: row.provider,
    product: row.product,
    effective_at: row.effective_at,
    acquired_at: row.acquired_at,
    evidence_hash: row.evidence_hash,
  })).sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));

  return {
    boundary,
    observations,
    evidence_ids: evidenceRows.map((row) => row.id).sort(),
    raw_observation_ids: [...new Set(evidenceRows.map((row) => row.raw_observation_id).filter((id): id is string => typeof id === "string"))].sort(),
    source_field_ids: sourceFieldIds,
    source_observations: sourceObservationRows,
    limitation: boundary.state === "satisfied" ? null : "One or more required evidence keys could not be resolved to an exact executed runtime node and run-bound source observation within the supplied user/run/execution boundary.",
  };
}
