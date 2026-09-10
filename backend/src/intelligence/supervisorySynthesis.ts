import type { CapabilityDependencyOutput } from "./capabilityExecutionContext.js";

const EVIDENCE_RANK: Record<string, number> = {
  INSUFFICIENT_EVIDENCE: 0,
  CALCULATED: 3,
  INFERRED: 2,
  PREDICTED: 1,
  SCENARIO: 1,
};

export type SupervisorySynthesis = {
  synthesis_version: "1.0.0";
  graph_complete: boolean;
  dependency_count: number;
  consumed_capabilities: string[];
  missing_capabilities: string[];
  evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE";
  strongest_evidence_state: string | null;
  evidence_state_distribution: Record<string, number>;
  uncertainty_present: boolean;
  output_hashes: Record<string, string>;
  dependency_lineage: Array<{ capability_id: string; execution_id: string; output_hash: string; evidence_state: string | null }>;
  synthesis_basis: string[];
};

/**
 * Supervisory composition is deliberately value-driven: it consumes the
 * durable child outputs already produced by the execution graph rather than
 * treating the graph as metadata. It produces graph-wide intelligence about
 * evidence coverage, uncertainty, and lineage without manufacturing a
 * financial fact when a child output is unavailable.
 *
 * Evidence state is conservative: the aggregate state cannot be stronger than
 * the weakest consumed child state. A single insufficient-evidence dependency
 * therefore prevents the supervisory result from being represented as fully
 * calculated, inferred, predicted, or scenario-ready.
 */
export function synthesizeCapabilityGraph(
  dependencyIds: readonly string[],
  dependencyOutputs: Readonly<Record<string, CapabilityDependencyOutput>>,
): SupervisorySynthesis {
  const consumed = dependencyIds.filter(id => dependencyOutputs[id] != null);
  const missing = dependencyIds.filter(id => dependencyOutputs[id] == null);
  const states = consumed.map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE");
  const distribution: Record<string, number> = {};
  for (const state of states) distribution[state] = (distribution[state] ?? 0) + 1;

  const strongest = consumed
    .map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE")
    .sort((a, b) => (EVIDENCE_RANK[b] ?? 0) - (EVIDENCE_RANK[a] ?? 0))[0] ?? null;

  const weakest = consumed.length
    ? consumed
      .map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE")
      .sort((a, b) => (EVIDENCE_RANK[a] ?? 0) - (EVIDENCE_RANK[b] ?? 0))[0]
    : "INSUFFICIENT_EVIDENCE";

  const evidenceState = missing.length
    ? "INSUFFICIENT_EVIDENCE"
    : (weakest === "CALCULATED" || weakest === "INFERRED" || weakest === "PREDICTED" || weakest === "SCENARIO"
      ? weakest
      : "INSUFFICIENT_EVIDENCE");

  return {
    synthesis_version: "1.0.0",
    graph_complete: missing.length === 0,
    dependency_count: dependencyIds.length,
    consumed_capabilities: consumed,
    missing_capabilities: missing,
    evidence_state: evidenceState,
    strongest_evidence_state: strongest,
    evidence_state_distribution: distribution,
    uncertainty_present: consumed.some(id => dependencyOutputs[id].uncertainty != null),
    output_hashes: Object.fromEntries(consumed.map(id => [id, dependencyOutputs[id].output_hash])),
    dependency_lineage: consumed.map(id => ({
      capability_id: id,
      execution_id: dependencyOutputs[id].execution_id,
      output_hash: dependencyOutputs[id].output_hash,
      evidence_state: dependencyOutputs[id].evidence_state,
    })),
    synthesis_basis: [
      "Persisted child capability outputs are the primary supervisory inputs.",
      "Dependency output hashes are preserved as lineage identity.",
      "Missing child outputs force an explicitly incomplete supervisory state.",
      "Aggregate evidence state cannot exceed the weakest consumed child evidence state.",
      "Uncertainty is propagated when present in child outputs.",
    ],
  };
}
