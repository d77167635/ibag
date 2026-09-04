import type { DecisionIntelligence, DecisionOption } from "./decisionIntelligence.js";
import type { ConsequenceModel, ConsequenceScenario } from "./consequence.js";
import type { FinancialStateModel } from "./financialState.js";
import type { Evidence } from "./types.js";

export type OptimizationObjective = "stabilize_liquidity" | "improve_cash_flow" | "reduce_pressure" | "build_roundups" | "understand_finances";

export interface OptimizationScore {
  option_id: string;
  total_score: number;
  evidence_quality: number;
  expected_value: number;
  downside_exposure: number;
  reversibility: number;
  constraint_fit: number;
  objective_alignment: Record<OptimizationObjective, number>;
  explanation: string[];
}

export interface OptimizationIntelligence {
  architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1";
  objective: string;
  objectives: Array<{ objective: OptimizationObjective; priority: number; rationale: string }>;
  ranking_status: "ranked" | "constrained" | "blocked";
  scores: OptimizationScore[];
  preferred_option_id: string | null;
  tradeoff_summary: string[];
  constraints: string[];
  limitations: string[];
  evidence: Evidence;
}

const evidenceScore: Record<Evidence, number> = { observed: 1, calculated: 0.9, inferred: 0.65, insufficient_evidence: 0 };

const ALIGNMENT: Record<OptimizationObjective, Record<string, number>> = {
  stabilize_liquidity: { preserve_liquidity: 1, reduce_pressure: 0.9, investigate: 0.75, monitor: 0.7, optimize_roundups: 0.2 },
  improve_cash_flow: { reduce_pressure: 1, preserve_liquidity: 0.85, investigate: 0.7, monitor: 0.65, optimize_roundups: 0.25 },
  reduce_pressure: { reduce_pressure: 1, preserve_liquidity: 0.85, investigate: 0.7, monitor: 0.6, optimize_roundups: 0.3 },
  build_roundups: { optimize_roundups: 1, monitor: 0.7, investigate: 0.55, preserve_liquidity: 0.3, reduce_pressure: 0.25 },
  understand_finances: { investigate: 1, monitor: 0.9, preserve_liquidity: 0.55, reduce_pressure: 0.5, optimize_roundups: 0.45 },
};

function consequenceFor(option: DecisionOption, model: ConsequenceModel): ConsequenceScenario | undefined {
  return model.scenarios.find((s) => s.decision_option_id === option.id);
}

function normalizeEvidence(value: Evidence | "limited"): Evidence { return value === "limited" ? "inferred" : value; }

function deriveObjectives(state: FinancialStateModel) {
  const objectives: Array<{ objective: OptimizationObjective; priority: number; rationale: string }> = [];
  if (state.active_states.includes("liquidity_pressure")) objectives.push({ objective: "stabilize_liquidity", priority: 1, rationale: "Active liquidity pressure is the highest-priority safety objective." });
  if (state.active_states.includes("cash_flow_pressure")) objectives.push({ objective: "improve_cash_flow", priority: objectives.length + 1, rationale: "Active cash-flow pressure warrants near-term improvement analysis." });
  if (state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure")) objectives.push({ objective: "reduce_pressure", priority: objectives.length + 1, rationale: "Debt or spending pressure creates a pressure-reduction objective." });
  objectives.push({ objective: "build_roundups", priority: objectives.length + 1, rationale: "Round-Ups remain an iBag capability, but are subordinate to established safety pressure." });
  objectives.push({ objective: "understand_finances", priority: objectives.length + 1, rationale: "Understanding remains a universal analytical objective." });
  return objectives;
}

/** Multi-objective, transparent analytical ranking. No execution or probabilistic outcome claim is made. */
export function buildOptimizationIntelligence(decision: DecisionIntelligence, consequences: ConsequenceModel, state: FinancialStateModel): OptimizationIntelligence {
  const limitations = [...new Set([...decision.missing_evidence, ...consequences.limitations])];
  const objectives = deriveObjectives(state);
  if (!decision.options.length || decision.quality === "blocked") return {
    architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1", objective: decision.objective, objectives, ranking_status: "blocked", scores: [], preferred_option_id: null,
    tradeoff_summary: ["No option can be responsibly ranked while decision evidence is blocked."], constraints: decision.constraints, limitations, evidence: "insufficient_evidence",
  };

  const scores = decision.options.map((option) => {
    const scenario = consequenceFor(option, consequences);
    const evidence = normalizeEvidence(scenario?.evidence ?? option.evidence_state);
    const evidenceQuality = evidenceScore[evidence];
    const reversibility = option.reversibility === "high" ? 1 : option.reversibility === "medium" ? 0.65 : 0.35;
    const downside = scenario?.tradeoffs.length ? Math.min(1, scenario.tradeoffs.length / 4) : 0;
    const benefit = scenario?.downstream_effects.length ? Math.min(1, scenario.downstream_effects.length / 4) : 0.25;
    const constraintPenalty = option.constraints.length ? Math.min(1, option.constraints.length / 5) : 0;
    const liquidityPenalty = state.active_states.includes("liquidity_pressure") && option.kind === "optimize_roundups" ? 0.25 : 0;
    const objectiveAlignment = Object.fromEntries(objectives.map(({ objective }) => [objective, Number((ALIGNMENT[objective][option.kind] ?? 0).toFixed(3))])) as Record<OptimizationObjective, number>;
    const totalWeight = objectives.reduce((sum, item) => sum + (item.priority === 1 ? 1 : item.priority === 2 ? 0.75 : 0.5), 0);
    const weightedAlignment = totalWeight ? objectives.reduce((sum, item) => sum + (objectiveAlignment[item.objective] ?? 0) * (item.priority === 1 ? 1 : item.priority === 2 ? 0.75 : 0.5), 0) / totalWeight : 0;
    const expectedValue = benefit * 0.3 + weightedAlignment * 0.15;
    const total = Math.max(0, Math.min(1, evidenceQuality * 0.3 + expectedValue + reversibility * 0.2 - downside * 0.1 - constraintPenalty * 0.1 - liquidityPenalty));
    const explanation = [
      `Evidence quality contributes ${evidenceQuality.toFixed(2)} to the ranking.`,
      `Multi-objective alignment contributes ${weightedAlignment.toFixed(2)} across ${objectives.length} analytical objectives.`,
      `Reversibility is ${option.reversibility} and contributes ${reversibility.toFixed(2)}.`,
      `Modeled benefit signal is ${benefit.toFixed(2)}; downside exposure signal is ${downside.toFixed(2)}.`,
    ];
    if (liquidityPenalty) explanation.push("Liquidity pressure reduces the analytical preference for increasing Round-Up exposure.");
    if (option.constraints.length) explanation.push("Option-specific constraints reduce its score.");
    return { option_id: option.id, total_score: Number(total.toFixed(3)), evidence_quality: evidenceQuality, expected_value: Number(expectedValue.toFixed(3)), downside_exposure: Number(downside.toFixed(3)), reversibility: Number(reversibility.toFixed(3)), constraint_fit: Number((1 - constraintPenalty).toFixed(3)), objective_alignment: objectiveAlignment, explanation };
  }).sort((a, b) => b.total_score - a.total_score);

  const preferred = scores[0] ?? null;
  const second = scores[1];
  const summary = preferred ? [`Highest analytical preference: ${decision.options.find((o) => o.id === preferred.option_id)?.label ?? preferred.option_id} (${preferred.total_score.toFixed(3)}).`] : [];
  if (second && preferred) summary.push(`The ranking gap to the next option is ${(preferred.total_score - second.total_score).toFixed(3)}; a small gap means the choice is sensitive to evidence and assumptions.`);
  summary.push(`Objectives are evidence-derived analytical priorities, not user-declared intent. Priority order: ${objectives.map((o) => o.objective).join(", ")}.`);
  summary.push("Ranking compares modeled analytical properties; it does not establish that the preferred option will produce the modeled outcome.");

  return { architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1", objective: decision.objective, objectives, ranking_status: limitations.length ? "constrained" : "ranked", scores, preferred_option_id: preferred?.option_id ?? null, tradeoff_summary: summary, constraints: decision.constraints, limitations, evidence: evidenceScore[decision.quality === "high" || decision.quality === "moderate" ? "calculated" : "inferred"] > 0.8 ? "calculated" : "inferred" };
}
