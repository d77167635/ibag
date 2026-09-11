import type { IrisIntelligenceOutput } from "./irisIntelligenceOutputRuntime.js";
import type { IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";

export type IrisHeadlineIntelligence = {
  headline_intelligence_node_id: string | null;
  headline_reason: string | null;
};

/**
 * Conservative headline binding. A report headline must reference an actual
 * persisted runtime intelligence node; an analytical definition ID is never
 * promoted into a node ID.
 */
export function selectHeadlineIntelligence(
  output: Pick<IrisIntelligenceOutput, "analysis_id" | "analysis_name" | "state" | "evidence_coverage" | "evidence_publication_state">,
  runtimeLineage: IrisReportRuntimeLineage | null = null,
): IrisHeadlineIntelligence {
  if (output.state === "suppressed" || output.evidence_publication_state === "insufficient_evidence" || output.evidence_publication_state === "unknown") {
    return { headline_intelligence_node_id: null, headline_reason: null };
  }
  const nodeId = runtimeLineage?.intelligence_node_ids[0] ?? null;
  if (!nodeId) return { headline_intelligence_node_id: null, headline_reason: null };
  return {
    headline_intelligence_node_id: nodeId,
    headline_reason: output.state === "limited"
      ? "Primary resolved runtime intelligence node for this report; publication remains explicitly evidence-limited."
      : "Primary resolved runtime intelligence node for this report; no competing report-level intelligence node was supplied to the publication runtime.",
  };
}
