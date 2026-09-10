import type { DecisionIntelligence } from "./decisionIntelligence.js";
import type { ConsequenceModel } from "./consequence.js";
import type { OptimizationIntelligence } from "./optimization.js";

export type RobustnessStatus = "robust" | "sensitive" | "blocked" | "insufficient_evidence";
export interface RobustnessPerturbation { assumption: string; direction: "lower" | "higher"; magnitude: number; affected_option_id: string; effect: "stable" | "ranking_changed" | "blocked"; alternative_preferred_option_id: string | null; limitation: string; }
export interface DecisionRobustness { architecture_version: "IRIS_DECISION_ROBUSTNESS_V3"; status: RobustnessStatus; preferred_option_id: string | null; baseline_score: number | null; alternative_preferred_option_id: string | null; stability_score: number; perturbations: RobustnessPerturbation[]; reversal_conditions: string[]; highest_leverage_assumptions: string[]; methodology: string; limitations: string[]; }

/**
 * Robustness is fail-closed. Iris does not invent stress magnitudes or perturb
 * financial scores. A robustness result requires authoritative scenario inputs.
 */
export function buildDecisionRobustness(decision: DecisionIntelligence, consequences: ConsequenceModel, optimization: OptimizationIntelligence): DecisionRobustness {
  const preferred = optimization.preferred_option_id;
  const baseline = preferred ? optimization.scores.find((score) => score.option_id === preferred) : undefined;
  const limitations = [...new Set([
    ...decision.missing_evidence,
    ...optimization.limitations,
    ...consequences.limitations,
  ])];

  const quantifiedScenarios = consequences.scenarios.filter(
    (scenario) => scenario.status === "illustrative" &&
      scenario.evidence !== "insufficient_evidence" &&
      scenario.modeled_change !== null,
  );

  if (!preferred || !baseline || optimization.ranking_status === "blocked" || decision.decision_ready === false) {
    return {
      architecture_version: "IRIS_DECISION_ROBUSTNESS_V3",
      status: "blocked",
      preferred_option_id: preferred,
      baseline_score: baseline?.total_score ?? null,
      alternative_preferred_option_id: null,
      stability_score: 0,
      perturbations: [],
      reversal_conditions: ["Decision ranking is blocked or lacks a preferred analytical option."],
      highest_leverage_assumptions: [],
      methodology: "No robustness analysis is performed while upstream decision evidence is insufficient.",
      limitations,
    };
  }

  if (!quantifiedScenarios.length) {
    return {
      architecture_version: "IRIS_DECISION_ROBUSTNESS_V3",
      status: "insufficient_evidence",
      preferred_option_id: preferred,
      baseline_score: baseline.total_score,
      alternative_preferred_option_id: null,
      stability_score: 0,
      perturbations: [],
      reversal_conditions: ["No provenance-backed intervention magnitude is available for robustness analysis."],
      highest_leverage_assumptions: [],
      methodology: "Robustness requires an authoritative scenario intervention. Iris does not manufacture stress percentages, score perturbations, or forecast-error assumptions.",
      limitations: [...new Set([...limitations, "No authoritative quantified scenario input is available."])],
    };
  }

  // Quantified scenarios are deliberately not perturbed here. Their values are
  // preserved as upstream evidence and must be compared by a future governed
  // scenario engine that carries explicit provenance for every intervention.
  return {
    architecture_version: "IRIS_DECISION_ROBUSTNESS_V3",
    status: "insufficient_evidence",
    preferred_option_id: preferred,
    baseline_score: baseline.total_score,
    alternative_preferred_option_id: null,
    stability_score: 0,
    perturbations: [],
    reversal_conditions: ["An authoritative scenario exists, but Iris has no governed perturbation transformation for it."],
    highest_leverage_assumptions: [...new Set(quantifiedScenarios.map((scenario) => scenario.assumption))].slice(0, 6),
    methodology: "Upstream quantified scenario evidence is acknowledged but never modified by an invented stress factor. A governed intervention transformation is required before robustness can be calculated.",
    limitations: [...new Set([...limitations, "Robustness transformation is unavailable without an explicit governed intervention model."])],
  };
}
