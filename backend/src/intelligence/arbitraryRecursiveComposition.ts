import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { persistArbitraryDerivedIntelligenceNode, type ArbitraryDerivedIntelligenceDefinition } from "./persistedIntelligenceGraph.js";
import type { RecursiveSynthesis } from "./recursiveIntelligenceSynthesis.js";

export const ARBITRARY_RECURSIVE_COMPOSITION_VERSION = "iris-arbitrary-recursive-composition-v2" as const;

type GraphNodeRow = { id: string; capability_id: string | null; node_hash: string; run_id: string; execution_id: string };
type EvidenceState = ArbitraryDerivedIntelligenceDefinition["evidenceState"];

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function deriveEvidenceState(states: string[]): EvidenceState {
  if (states.includes("INSUFFICIENT_EVIDENCE")) return "INSUFFICIENT_EVIDENCE";
  if (states.includes("SCENARIO")) return "SCENARIO";
  if (states.includes("PREDICTED")) return "PREDICTED";
  if (states.includes("INFERRED")) return "INFERRED";
  return "CALCULATED";
}

/**
 * Turns recursively discovered higher-order findings into durable graph nodes
 * without requiring a capability-registry entry for each new composition.
 * Upstream references come only from the exact graph-node IDs produced by the
 * current governed execution. Missing IDs are skipped rather than guessed.
 */
export async function materializeArbitraryRecursiveCompositions(input: {
  userId: string;
  runId: string;
  executionId: string;
  capabilityNodeIds: Record<string, string>;
  evidenceBoundary?: string | null;
  evidenceManifestHash?: string | null;
  runEvidenceIds?: string[];
  synthesis: RecursiveSynthesis;
}): Promise<{ materializedNodeIds: string[]; skippedFindingIds: string[] }> {
  const findings = input.synthesis.higher_order_findings.filter((finding) => finding.kind !== "evidence_gap");
  if (!findings.length) return { materializedNodeIds: [], skippedFindingIds: [] };

  const referencedNodeIds = [...new Set(findings.flatMap((finding) => finding.capabilities.map((capabilityId) => input.capabilityNodeIds[capabilityId]).filter((id): id is string => typeof id === "string" && id.length > 0)))];
  if (!referencedNodeIds.length) return { materializedNodeIds: [], skippedFindingIds: findings.map((finding) => finding.id) };

  const { data: rows, error } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,node_hash,run_id,execution_id")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId)
    .in("id", referencedNodeIds);
  if (error) throw new Error(`ARBITRARY_RECURSIVE_GRAPH_LOOKUP_FAILED: ${error.message}`);

  const nodesById = new Map<string, GraphNodeRow>();
  for (const row of (rows ?? []) as GraphNodeRow[]) nodesById.set(row.id, row);

  const materializedNodeIds: string[] = [];
  const skippedFindingIds: string[] = [];

  for (const finding of findings) {
    const upstream = finding.capabilities.map((capabilityId) => {
      const nodeId = input.capabilityNodeIds[capabilityId];
      if (!nodeId) return null;
      const node = nodesById.get(nodeId);
      if (!node || node.run_id !== input.runId || node.execution_id !== input.executionId) return null;
      return { nodeId: node.id, role: capabilityId, sourceFieldPath: null };
    });

    if (upstream.some((reference) => reference === null)) {
      skippedFindingIds.push(finding.id);
      continue;
    }

    const resolvedUpstream = upstream.filter((reference): reference is NonNullable<typeof reference> => reference !== null);
    const evidenceState = deriveEvidenceState(finding.evidence_states);
    const intelligenceKey = `recursive-composition:${finding.id}`;
    const definition: ArbitraryDerivedIntelligenceDefinition = {
      intelligenceKey,
      intelligenceName: finding.statement,
      derivationOperator: ARBITRARY_RECURSIVE_COMPOSITION_VERSION,
      derivationVersion: ARBITRARY_RECURSIVE_COMPOSITION_VERSION,
      evidenceState,
      value: {
        kind: finding.kind,
        statement: finding.statement,
        capabilities: [...finding.capabilities],
        evidence_states: [...finding.evidence_states],
        limitation: finding.limitation,
        discovery_hash: hash({
          finding_id: finding.id,
          capabilities: finding.capabilities,
          evidence_states: finding.evidence_states,
          statement: finding.statement,
          limitation: finding.limitation,
          upstream_node_ids: resolvedUpstream.map((reference) => reference.nodeId),
        }),
      },
      evidenceBoundary: input.evidenceBoundary ?? null,
      provenance: {
        source: "governed_run_capability_outputs",
        composition_version: ARBITRARY_RECURSIVE_COMPOSITION_VERSION,
        finding_id: finding.id,
        finding_kind: finding.kind,
        upstream_capability_ids: [...finding.capabilities],
        upstream_node_ids: resolvedUpstream.map((reference) => reference.nodeId),
        upstream_node_hashes: resolvedUpstream.map((reference) => nodesById.get(reference.nodeId)?.node_hash ?? null),
        evidence_manifest_hash: input.evidenceManifestHash ?? null,
        run_evidence_ids: [...(input.runEvidenceIds ?? [])].sort(),
        evidence_boundary: input.evidenceBoundary ?? null,
      },
      upstream: resolvedUpstream,
    };

    const node = await persistArbitraryDerivedIntelligenceNode({
      userId: input.userId,
      runId: input.runId,
      executionId: input.executionId,
      definition,
    });
    materializedNodeIds.push(node.id);
  }

  return { materializedNodeIds, skippedFindingIds };
}
