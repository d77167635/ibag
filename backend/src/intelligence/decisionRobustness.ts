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
  alternative_preferred_option_id: string | null;
  limitation: string;
}

export interface DecisionRobustness {
  architecture_version: "IRIS_DECISION_ROBUSTNESS_V2";
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
      architecture_version: "IRIS_DECISION_ROBUSTNESS_V2",
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
  const assumptions = consequences.scenarios.filter((s) => s.status === "illustrative");
  const perturbations: RobustnessPerturbation[] = [];

  for (const scenario of assumptions) {
    const affected = scores.find((s) => s.option_id === scenario.decision_option_id);
    if (!affected || !Number.isFinite(affected.total_score)) continue;
    for (const magnitude of [0.10, 0.25]) {
      const stress = Math.min(Math.abs(affected.total_score), Math.abs(affected.total_score) * magnitude);
      const stressedScore = affected.total_score >= 0 ? affected.total_score - stress : affected.total_score + stress;
      const ranked = scores.map((score) => ({
        option_id: score.option_id,
        score: score.option_id === affected.option_id ? stressedScore : score.total_score,
      })).sort((a, b) => b.score - a.score || a.option_id.localeCompare(b.option_id));
      const winner = ranked[0]?.option_id ?? null;
      const changed = winner !== preferred;
      perturbations.push({
        assumption: scenario.assumption,
        direction: "lower",
        magnitude,
        affected_option_id: affected.option_id,
        effect: changed ? "ranking_changed" : "stable",
        alternative_preferred_option_id: changed ? winner : null,
        limitation: "Stress magnitude is deterministic and illustrative; it is not a probability distribution or forecast error estimate.",
      });
    }
  }

  const changed = perturbations.filter((p) => p.effect === "ranking_changed");
  const stability = perturbations.length ? Number((1 - changed.length / perturbations.length).toFixed(3)) : 1;
  const reversalConditions = changed.length
    ? changed.slice(0, 6).map((p) => `${p.assumption} under a ${Math.round(p.magnitude * 100)}% adverse stress changes the analytical winner from ${preferred} to ${p.alternative_preferred_option_id}.`)
    : [baseline ? `The preferred option remains the analytical winner across the tested deterministic stresses.` : "No baseline score is available."];

  return {
    architecture_version: "IRIS_DECISION_ROBUSTNESS_V2",
    status: changed.length ? "sensitive" : "robust",
    preferred_option_id: preferred,
    baseline_score: baseline?.total_score ?? null,
    alternative_preferred_option_id: changed[0]?.alternative_preferred_option_id ?? null,
    stability_score: stability,
    perturbations,
    reversal_conditions: reversalConditions,
    highest_leverage_assumptions: [...new Set(changed.map((p) => p.assumption))].slice(0, 6),
    methodology: "For each illustrative consequence assumption, Iris lowers the affected option score by fixed bounded stress magnitudes, recomputes the full option ranking, and records the actual winning option. Stability describes ranking behavior under modeled stress; it is not statistical confidence.",
    limitations: [...new Set([...optimization.limitations, ...consequences.limitations, "Sensitivity testing cannot establish that a real-world intervention will produce the modeled outcome."])],
  };
}
