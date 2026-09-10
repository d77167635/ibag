import type { IrisInvestigation } from "./investigationEngine.js";
import type { DecisionRobustness } from "./decisionRobustness.js";

export type InformationValueStatus = "high" | "medium" | "low" | "blocked";

export interface InformationValueCandidate {
  id: string;
  question: string;
  source: "investigation" | "robustness";
  evidence_gap: string;
  decision_impact: number;
  uncertainty_reduction: number;
  reversibility: number;
  evidence_quality: number;
  information_value: number;
  status: InformationValueStatus;
  limitation: string;
}

export interface ValueOfInformationResult {
  architecture_version: "IRIS_VALUE_OF_INFORMATION_V1";
  status: InformationValueStatus;
  candidates: InformationValueCandidate[];
  highest_value_question: string | null;
  methodology: string;
  limitations: string[];
}

type InvestigationResult = { investigations: IrisInvestigation[] };

/**
 * Value-of-information remains fail-closed until its scoring model is governed.
 *
 * The former implementation assigned fixed decision-impact, uncertainty-reduction,
 * reversibility, and evidence-quality numbers to evidence gaps. Those numbers were
 * analytical assumptions, not observations or calculations derived from authoritative
 * evidence. They therefore cannot be presented as Iris intelligence.
 */
export function buildValueOfInformation(
  investigations: InvestigationResult,
  robustness: DecisionRobustness,
): ValueOfInformationResult {
  const evidenceGaps = investigations.investigations
    .filter((investigation) => investigation.status !== "ready")
    .flatMap((investigation) => investigation.evidence_required);

  const assumptions = robustness.highest_leverage_assumptions;

  return {
    architecture_version: "IRIS_VALUE_OF_INFORMATION_V1",
    status: "blocked",
    candidates: [],
    highest_value_question: null,
    methodology:
      "Evidence-priority scoring is withheld until a versioned, provenance-backed value-of-information model defines its parameters and transformation. Evidence gaps and assumptions may be surfaced elsewhere, but Iris will not assign invented numerical value to them.",
    limitations: [
      evidenceGaps.length
        ? `${evidenceGaps.length} evidence gap(s) were identified but were not assigned synthetic information-value scores.`
        : "No unresolved investigation evidence gaps were available for scoring.",
      assumptions.length
        ? `${assumptions.length} modeled assumption(s) were identified but were not assigned synthetic information-value scores.`
        : "No leverage assumptions were available for scoring.",
      "No provider evidence, probability, causal effect, uncertainty reduction, reversibility value, or expected monetary value is manufactured.",
      "A governed value-of-information model must be versioned, auditable, evidence-bound, and independently reproducible before numeric candidates can be emitted.",
    ],
  };
}
