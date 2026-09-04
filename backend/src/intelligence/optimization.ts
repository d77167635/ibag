import type { DecisionIntelligence, DecisionOption } from "./decisionIntelligence.js";
import type { ConsequenceModel, ConsequenceScenario } from "./consequence.js";
import type { FinancialStateModel } from "./financialState.js";
import type { Evidence } from "./types.js";

export interface OptimizationScore {
  option_id: string;
  total_score: number;
  evidence_quality: number;
  expected_value: number;
  downside_exposure: number;
  reversibility: number;
  constraint_fit: number;
  explanation: string[];
}

export interface OptimizationIntelligence {
  architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1";
  objective: string;
  ranking_status: "ranked" | "constrained" | "blocked";
  scores: OptimizationScore[];
  preferred_option_id: string | null;
  tradeoff_summary: string[];
  constraints: string[];
  limitations: string[];
  evidence: Evidence;
}

const evidenceScore: Record<Evidence, number> = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.65,
  insufficient_evidence: 0,
};

function consequenceFor(option: DecisionOption, model: ConsequenceModel): ConsequenceScenario | undefined {
  return model.scenarios.find((s) => s.decision_option_id === option.id);
}

/** Compares analysis-only options using transparent, non-probabilistic scoring. */
export function buildOptimizationIntelligence(
  decision: DecisionIntelligence,
  consequences: ConsequenceModel,
  state: FinancialStateModel,
): OptimizationIntelligence {
  const limitations = [...new Set([...decision.missing_evidence, ...consequences.limitations])];
  if (!decision.options.length || decision.quality === "blocked") {
    return {
      architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1",
      objective: decision.objective,
      ranking_status: "blocked",
      scores: [],
      preferred_option_id: null,
      tradeoff_summary: ["No option can be responsibly ranked while decision evidence is blocked."],
      constraints: decision.constraints,
      limitations,
      evidence: "insufficient_evidence",
    };
  }

  const scores = decision.options.map((option) => {
    const scenario = consequenceFor(option, consequences);
    const evidence = scenario?.evidence ?? option.evidence_state;
    const evidenceQuality = evidenceScore[evidence];
    const reversibility = option.reversibility === "high" ? 1 : option.reversibility === "medium" ? 0.65 : 0.35;
    const downside = scenario?.tradeoffs.length ? Math.min(1, scenario.tradeoffs.length / 4) : 0;
    const benefit = scenario?.downstream_effects.length ? Math.min(1, scenario.downstream_effects.length / 4) : 0.25;
    const constraintPenalty = option.constraints.length ? Math.min(1, option.constraints.length / 5) : 0;
    const liquidityPenalty = state.active_states.includes("liquidity_pressure") && option.kind === "optimize_roundups" ? 0.25 : 0;
    const expectedValue = benefit * 0.45;
    const total = Math.max(0, Math.min(1, evidenceQuality * 0.3 + expectedValue + reversibility * 0.2 - downside * 0.1 - constraintPenalty * 0.1 - liquidityPenalty));
    const explanation = [
      `Evidence quality contributes ${evidenceQuality.toFixed(2)} to the ranking.`,
      `Reversibility is ${option.reversibility} and contributes ${reversibility.toFixed(2)}.`,
      `Modeled benefit signal is ${benefit.toFixed(2)}; downside exposure signal is ${downside.toFixed(2)}.`,
    ];
    if (liquidityPenalty) explanation.push("Liquidity pressure reduces the analytical preference for increasing Round-Up exposure.");
    if (option.constraints.length) explanation.push("Option-specific constraints reduce its score.");
    return { option_id: option.id, total_score: Number(total.toFixed(3)), evidence_quality: evidenceQuality, expected_value: Number(expectedValue.toFixed(3)), downside_exposure: Number(downside.toFixed(3)), reversibility: Number(reversibility.toFixed(3)), constraint_fit: Number((1 - constraintPenalty).toFixed(3)), explanation };
  }).sort((a, b) => b.total_score - a.total_score);

  const preferred = scores[0] ?? null;
  const top = preferred ? decision.options.find((o) => o.id === preferred.option_id) : undefined;
  const second = scores[1];
  const summary = top && preferred ? [`Highest analytical preference: ${top.label} (${preferred.total_score.toFixed(3)}).`] : [];
  if (second && preferred) summary.push(`The ranking gap to the next option is ${(preferred.total_score - second.total_score).toFixed(3)}; a small gap means the choice is sensitive to evidence and assumptions.`);
  summary.push("Ranking compares modeled analytical properties; it does not establish that the preferred option will produce the modeled outcome.");

  return {
    architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1",
    objective: decision.objective,
    ranking_status: limitations.length ? "constrained" : "ranked",
    scores,
    preferred_option_id: preferred?.option_id ?? null,
    tradeoff_summary: summary,
    constraints: decision.constraints,
    limitations,
    evidence: evidenceScore[decision.quality === "high" ? "calculated" : decision.quality === "moderate" ? "calculated" : "inferred"] > 0.8 ? "calculated" : "inferred",
  };
}
