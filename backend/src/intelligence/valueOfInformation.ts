import type { InvestigationEngineResult } from "./investigationEngine.js";
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

/**
 * Ranks missing evidence by its potential analytical leverage.
 * This is a deterministic prioritization heuristic, not a probability,
 * expected monetary value, or claim that the evidence will exist.
 */
export function buildValueOfInformation(
  investigations: InvestigationEngineResult,
  robustness: DecisionRobustness,
): ValueOfInformationResult {
  const candidates: InformationValueCandidate[] = [];

  for (const investigation of investigations.investigations ?? []) {
    const missing = investigation.missing_evidence ?? [];
    const status = investigation.status === "ready" ? "low" : "medium";
    for (const gap of missing.slice(0, 4)) {
      const decisionImpact = robustness.status === "sensitive" ? 0.9 : robustness.status === "robust" ? 0.35 : 0.2;
      const uncertaintyReduction = missing.length ? Math.max(0.1, 1 / missing.length) : 0;
      const reversibility = robustness.status === "sensitive" ? 0.85 : 0.55;
      const evidenceQuality = 0.8;
      const informationValue = Number((decisionImpact * uncertaintyReduction * reversibility * evidenceQuality).toFixed(3));
      candidates.push({
        id: `voi:${investigation.id}:${gap}`,
        question: investigation.question,
        source: "investigation",
        evidence_gap: gap,
        decision_impact: decisionImpact,
        uncertainty_reduction: Number(uncertaintyReduction.toFixed(3)),
        reversibility,
        evidence_quality: evidenceQuality,
        information_value: informationValue,
        status: informationValue >= 0.45 ? "high" : informationValue >= 0.2 ? status : "low",
        limitation: "Information value is a deterministic prioritization heuristic; it is not probability, causal effect, or guaranteed information gain.",
      });
    }
  }

  for (const assumption of robustness.highest_leverage_assumptions.slice(0, 6)) {
    const sensitive = robustness.status === "sensitive";
    candidates.push({
      id: `voi:robustness:${assumption}`,
      question: `What evidence could validate or falsify the assumption: ${assumption}?`,
      source: "robustness",
      evidence_gap: assumption,
      decision_impact: sensitive ? 1 : 0.45,
      uncertainty_reduction: sensitive ? 0.8 : 0.35,
      reversibility: sensitive ? 0.9 : 0.6,
      evidence_quality: 0.8,
      information_value: Number(((sensitive ? 1 : 0.45) * (sensitive ? 0.8 : 0.35) * (sensitive ? 0.9 : 0.6) * 0.8).toFixed(3)),
      status: sensitive ? "high" : "medium",
      limitation: "The engine identifies leverage in a modeled assumption; it does not assert that validating evidence is available from the provider.",
    });
  }

  candidates.sort((a, b) => b.information_value - a.information_value);
  const bounded = candidates.slice(0, 24);
  const top = bounded[0] ?? null;

  return {
    architecture_version: "IRIS_VALUE_OF_INFORMATION_V1",
    status: top?.status ?? "blocked",
    candidates: bounded,
    highest_value_question: top?.question ?? null,
    methodology: "Rank evidence gaps by modeled decision impact, uncertainty reduction, decision reversibility, and evidence quality. Higher values identify evidence that could most change or clarify an analytical decision.",
    limitations: [
      "No provider evidence is manufactured when a candidate is missing.",
      "Information value is not a probability or expected monetary value.",
      "The ranking does not imply that a provider exposes the requested evidence.",
      "Candidate priority must remain subordinate to source fidelity, authorization, and evidence certification.",
    ],
  };
}
