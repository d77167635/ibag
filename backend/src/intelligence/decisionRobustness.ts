import type { DecisionIntelligence } from "./decisionIntelligence.js";
import type { ConsequenceModel } from "./consequence.js";
import type { OptimizationIntelligence } from "./optimization.js";

export type RobustnessStatus = "robust" | "sensitive" | "blocked" | "insufficient_evidence";

export interface RobustnessPerturbation {
  assumption: string;
  direction: "lower" | "higher";
  magnitude: number;
  affected_option_id: string;
  effect: "stable" | "ranking_changed" | "blocked";
  limitation: string;
}

export interface DecisionRobustness {
  architecture_version: "IRIS_DECISION_ROBUSTNESS_V1";
  status: RobustnessStatus;
  preferred_option_id: string | null;
  baseline_score: number | null;
  alternative_preferred_option_id: string | null;
  stability_score: number;
  perturbations: RobustnessPerturbation[];
  reversal_conditions: string[];
  highest_leverage_assumptions: string[];
  methodology: string;
  limitations: string[];
}

/** Deterministic stress testing of an existing analytical ranking. It does not claim probabilities or execute actions. */
export function buildDecisionRobustness(
  decision: DecisionIntelligence,
  consequences: ConsequenceModel,
  optimization: OptimizationIntelligence,
): DecisionRobustness {
  const preferred = optimization.preferred_option_id;
  const scores = optimization.scores;
  if (!preferred || !scores.length || optimization.ranking_status === "blocked" || decision.decision_ready === false) {
    return {
      architecture_version: "IRIS_DECISION_ROBUSTNESS_V1",
      status: "blocked",
      preferred_option_id: preferred,
      baseline_score: preferred ? scores.find((s) => s.option_id === preferred)?.total_score ?? null : null,
      alternative_preferred_option_id: null,
      stability_score: 0,
      perturbations: [],
      reversal_conditions: ["Decision ranking is blocked or lacks a preferred analytical option."],
      highest_leverage_assumptions: [],
      methodology: "No stress test is performed when the upstream decision is not analytically ready.",
      limitations: [...new Set([...decision.missing_evidence, ...optimization.limitations])],
    };
  }

  const baseline = scores.find((s) => s.option_id === preferred);
  const next = scores.find((s) => s.option_id !== preferred && s.total_score > 0);
  const gap = next && baseline ? Math.max(0, baseline.total_score - next.total_score) : 1;
  const perturbations: RobustnessPerturbation[] = [];
  const assumptions = consequences.scenarios.filter((s) => s.status === "illustrative");

  for (const scenario of assumptions) {
    const optionScore = scores.find((s) => s.option_id === scenario.decision_option_id);
    if (!optionScore) continue;
    for (const magnitude of [0.10, 0.25]) {
      const stress = Math.min(1, optionScore.total_score * magnitude);
      const stressed = Math.max(0, optionScore.total_score - stress);
      const alternative = scores.find((s) => s.option_id !== optionScore.option_id && s.total_score > stressed);
      const changed = optionScore.option_id === preferred && !!alternative;
      perturbations.push({
        assumption: scenario.assumption,
        direction: "lower",
        magnitude,
        affected_option_id: optionScore.option_id,
        effect: changed ? "ranking_changed" : "stable",
        limitation: "Stress magnitude is deterministic and illustrative; it is not a probability distribution or forecast error estimate.",
      });
    }
  }

  const changedCount = perturbations.filter((p) => p.effect === "ranking_changed").length;
  const totalTests = perturbations.length;
  const stability = totalTests ? Number((1 - changedCount / totalTests).toFixed(3)) : 1;
  const reversalConditions = changedCount
    ? perturbations.filter((p) => p.effect === "ranking_changed").slice(0, 6).map((p) => `${p.assumption} under a ${Math.round(p.magnitude * 100)}% adverse stress could change the analytical ranking.`)
    : [next ? `The current preference exceeds the next option by ${gap.toFixed(3)} under the present scoring assumptions.` : "No competing option currently has a positive analytical score."];

  return {
    architecture_version: "IRIS_DECISION_ROBUSTNESS_V1",
    status: changedCount ? "sensitive" : "robust",
    preferred_option_id: preferred,
    baseline_score: baseline?.total_score ?? null,
    alternative_preferred_option_id: changedCount ? perturbations.find((p) => p.effect === "ranking_changed")?.affected_option_id ?? next?.option_id ?? null : null,
    stability_score: stability,
    perturbations,
    reversal_conditions: reversalConditions,
    highest_leverage_assumptions: [...new Set(perturbations.filter((p) => p.effect === "ranking_changed").map((p) => p.assumption))].slice(0, 6),
    methodology: "Deterministic perturbation testing of existing option scores and consequence assumptions. Stability describes ranking behavior under modeled stress; it is not statistical confidence.",
    limitations: [...new Set([...optimization.limitations, ...consequences.limitations, "Sensitivity testing cannot establish that a real-world intervention will produce the modeled outcome."])],
  };
}
