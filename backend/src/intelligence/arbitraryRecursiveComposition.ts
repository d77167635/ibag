import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { persistArbitraryDerivedIntelligenceNode, type ArbitraryDerivedIntelligenceDefinition } from "./persistedIntelligenceGraph.js";
import type { RecursiveSynthesis } from "./recursiveIntelligenceSynthesis.js";

export const ARBITRARY_RECURSIVE_COMPOSITION_VERSION = "iris-arbitrary-recursive-composition-v1" as const;

type GraphNodeRow = { id: string; capability_id: string | null; node_hash: string };
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
 * Only findings whose complete upstream path resolves to exactly one persisted
 * graph node for the same execution are materialized. Ambiguous lineage is
 * skipped rather than guessing which node was the intended upstream result.
 */
export async function materializeArbitraryRecursiveCompositions(input: {
  userId: string;
  runId: string;
  executionId: string;
  evidenceBoundary?: string | null;
  evidenceManifestHash?: string | null;
  runEvidenceIds?: string[];
  synthesis: RecursiveSynthesis;
}): Promise<{ materializedNodeIds: string[]; skippedFindingIds: string[] }> {
  const findings = input.synthesis.higher_order_findings.filter((finding) => finding.kind !== "evidence_gap");
  if (!findings.length) return { materializedNodeIds: [], skippedFindingIds: [] };

  const capabilityIds = [...new Set(findings.flatMap((finding) => finding.capabilities))];
  if (!capabilityIds.length) return { materializedNodeIds: [], skippedFindingIds: findings.map((finding) => finding.id) };

  const { data: rows, error } = await supabaseAdmin
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,node_hash")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId)
    .in("capability_id", capabilityIds);
  if (error) throw new Error(`ARBITRARY_RECURSIVE_GRAPH_LOOKUP_FAILED: ${error.message}`);

  const nodesByCapability = new Map<string, GraphNodeRow>();
  const ambiguousCapabilities = new Set<string>();
  for (const row of (rows ?? []) as GraphNodeRow[]) {
    if (!row.capability_id) continue;
    if (nodesByCapability.has(row.capability_id)) {
      ambiguousCapabilities.add(row.capability_id);
      nodesByCapability.delete(row.capability_id);
      continue;
    }
    nodesByCapability.set(row.capability_id, row);
  }

  const materializedNodeIds: string[] = [];
  const skippedFindingIds: string[] = [];

  for (const finding of findings) {
    const upstream = finding.capabilities.map((capabilityId) => {
      const node = nodesByCapability.get(capabilityId);
      if (!node || ambiguousCapabilities.has(capabilityId)) return null;
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
        }),
      },
      evidenceBoundary: input.evidenceBoundary ?? null,
      provenance: {
        source: "recursive_intelligence_synthesis",
        composition_version: ARBITRARY_RECURSIVE_COMPOSITION_VERSION,
        finding_id: finding.id,
        finding_kind: finding.kind,
        upstream_capability_ids: [...finding.capabilities],
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
