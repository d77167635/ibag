import type { IrisIntelligenceOutput } from "./irisIntelligenceOutputRuntime.js";

export type IrisHeadlineIntelligence = {
  headline_intelligence_node_id: string | null;
  headline_reason: string | null;
};

/**
 * Conservative headline binding for the current report-product runtime.
 *
 * The runtime currently exposes one analytical intelligence definition per
 * report output. Therefore IRIS binds that exact analysis node as the headline
 * rather than inventing a more compelling finding. A future multi-node report
 * may replace this with a governed ranking over its verified supporting nodes.
 */
export function selectHeadlineIntelligence(
  output: Pick<IrisIntelligenceOutput, "analysis_id" | "analysis_name" | "state" | "evidence_coverage" | "evidence_publication_state">,
): IrisHeadlineIntelligence {
  if (output.state === "suppressed" || output.evidence_publication_state === "insufficient_evidence" || output.evidence_publication_state === "unknown") {
    return {
      headline_intelligence_node_id: null,
      headline_reason: null,
    };
  }

  if (!output.analysis_id || !output.analysis_name.trim()) {
    return {
      headline_intelligence_node_id: null,
      headline_reason: null,
    };
  }

  return {
    headline_intelligence_node_id: output.analysis_id,
    headline_reason: output.state === "limited"
      ? "Primary supported analytical intelligence for this report; publication remains explicitly evidence-limited."
      : "Primary supported analytical intelligence for this report; no competing report-level intelligence node was supplied to the publication runtime.",
  };
}
