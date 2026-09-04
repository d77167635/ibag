import type { DecisionIntelligence, DecisionOption } from "./decisionIntelligence.js";
import type { ConsequenceModel, ConsequenceScenario } from "./consequence.js";
import type { FinancialStateModel } from "./financialState.js";
import type { Evidence } from "./types.js";
import type { DeclaredIrisGoal } from "./goals.js";

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

function deriveObjectives(state: FinancialStateModel, declaredGoals: DeclaredIrisGoal[]) {
  const objectives: Array<{ objective: OptimizationObjective; priority: number; rationale: string }> = [];
  const activeDeclared = declaredGoals.filter((goal) => goal.active).sort((a, b) => a.priority - b.priority);
  for (const goal of activeDeclared) {
    if (!objectives.some((item) => item.objective === goal.objective)) {
      objectives.push({ objective: goal.objective, priority: Math.max(1, goal.priority), rationale: `User-declared goal: ${goal.title}${goal.description ? ` — ${goal.description}` : ""}.` });
    }
  }
  if (state.active_states.includes("liquidity_pressure") && !objectives.some((o) => o.objective === "stabilize_liquidity")) objectives.push({ objective: "stabilize_liquidity", priority: Math.max(1, activeDeclared.length + 1), rationale: "Active liquidity pressure remains a safety-relevant analytical objective." });
  if (state.active_states.includes("cash_flow_pressure") && !objectives.some((o) => o.objective === "improve_cash_flow")) objectives.push({ objective: "improve_cash_flow", priority: activeDeclared.length + 2, rationale: "Active cash-flow pressure warrants near-term improvement analysis." });
  if ((state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure")) && !objectives.some((o) => o.objective === "reduce_pressure")) objectives.push({ objective: "reduce_pressure", priority: activeDeclared.length + 3, rationale: "Debt or spending pressure creates a pressure-reduction objective." });
  if (!objectives.some((o) => o.objective === "build_roundups")) objectives.push({ objective: "build_roundups", priority: activeDeclared.length + 4, rationale: "Round-Ups remain an iBag capability, subordinate to explicit goals and safety pressure." });
  if (!objectives.some((o) => o.objective === "understand_finances")) objectives.push({ objective: "understand_finances", priority: activeDeclared.length + 5, rationale: "Understanding remains a universal analytical objective." });
  return objectives.sort((a, b) => a.priority - b.priority);
}

function hardConstraintApplies(constraint: string, option: DecisionOption): boolean {
  const normalized = constraint.trim().toLowerCase();
  if (!normalized) return false;
  const optionText = `${option.kind} ${option.label} ${option.description ?? ""}`.toLowerCase();
  const prohibitive = /^(no|never|avoid|don't|do not|must not|cannot|can't|prohibit|prohibited)\b/.test(normalized);
  return prohibitive && normalized.split(/\s+/).some((token) => token.length > 3 && optionText.includes(token));
}

function explicitConstraints(declaredGoals: DeclaredIrisGoal[]): string[] {
  return declaredGoals.filter((goal) => goal.active).flatMap((goal) => (goal.constraints ?? []).filter(Boolean).map((constraint) => `goal:${goal.id} — ${constraint}`));
}

/** Multi-objective, transparent analytical ranking. No execution or probabilistic outcome claim is made. */
export function buildOptimizationIntelligence(
  decision: DecisionIntelligence,
  consequences: ConsequenceModel,
  state: FinancialStateModel,
  declaredGoals: DeclaredIrisGoal[] = [],
): OptimizationIntelligence {
  const limitations = [...new Set([...decision.missing_evidence, ...consequences.limitations])];
  const objectives = deriveObjectives(state, declaredGoals);
  const userConstraints = explicitConstraints(declaredGoals);
  const constraints = [...new Set([...decision.constraints, ...userConstraints])];
  if (!decision.options.length || decision.quality === "blocked") return {
    architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1", objective: decision.objective, objectives, ranking_status: "blocked", scores: [], preferred_option_id: null,
    tradeoff_summary: ["No option can be responsibly ranked while decision evidence is blocked."], constraints, limitations, evidence: "insufficient_evidence",
  };

  let hardBlockedCount = 0;
  const scores = decision.options.map((option) => {
    const scenario = consequenceFor(option, consequences);
    const evidence = normalizeEvidence(scenario?.evidence ?? option.evidence_state);
    const evidenceQuality = evidenceScore[evidence];
    const reversibility = option.reversibility === "high" ? 1 : option.reversibility === "medium" ? 0.65 : 0.35;
    const downside = scenario?.tradeoffs.length ? Math.min(1, scenario.tradeoffs.length / 4) : 0;
    const benefit = scenario?.downstream_effects.length ? Math.min(1, scenario.downstream_effects.length / 4) : 0.25;
    const optionConstraints = option.constraints.length;
    const constraintPenalty = optionConstraints ? Math.min(1, optionConstraints / 5) : 0;
    const hardBlockedByGoal = declaredGoals.some((goal) => goal.active && (goal.constraints ?? []).some((constraint) => hardConstraintApplies(constraint, option)));
    if (hardBlockedByGoal) hardBlockedCount += 1;
    const liquidityPenalty = state.active_states.includes("liquidity_pressure") && option.kind === "optimize_roundups" ? 0.25 : 0;
    const objectiveAlignment = Object.fromEntries(objectives.map(({ objective }) => [objective, Number((ALIGNMENT[objective][option.kind] ?? 0).toFixed(3))])) as Record<OptimizationObjective, number>;
    const totalWeight = objectives.reduce((sum, item) => sum + (item.priority === 1 ? 1 : item.priority === 2 ? 0.75 : item.priority === 3 ? 0.55 : 0.4), 0);
    const weightedAlignment = totalWeight ? objectives.reduce((sum, item) => sum + (objectiveAlignment[item.objective] ?? 0) * (item.priority === 1 ? 1 : item.priority === 2 ? 0.75 : item.priority === 3 ? 0.55 : 0.4), 0) / totalWeight : 0;
    const expectedValue = benefit * 0.3 + weightedAlignment * 0.15;
    const total = hardBlockedByGoal ? 0 : Math.max(0, Math.min(1, evidenceQuality * 0.3 + expectedValue + reversibility * 0.2 - downside * 0.1 - constraintPenalty * 0.1 - liquidityPenalty));
    const explanation = [
      `Evidence quality contributes ${evidenceQuality.toFixed(2)} to the ranking.`,
      `Goal-weighted multi-objective alignment contributes ${weightedAlignment.toFixed(2)} across ${objectives.length} objectives.`,
      `Reversibility is ${option.reversibility} and contributes ${reversibility.toFixed(2)}.`,
      `Modeled benefit signal is ${benefit.toFixed(2)}; downside exposure signal is ${downside.toFixed(2)}.`,
    ];
    const matchedGoals = declaredGoals.filter((goal) => goal.active && (ALIGNMENT[goal.objective][option.kind] ?? 0) > 0.5);
    if (matchedGoals.length) explanation.push(`Supports user-declared goals: ${matchedGoals.map((goal) => `${goal.title} (priority ${goal.priority})`).join(", ")}.`);
    if (userConstraints.length) explanation.push(`Applied ${userConstraints.length} explicit user constraint(s) as optimization boundaries.`);
    if (hardBlockedByGoal) explanation.push("Blocked by an explicit user-declared constraint; no analytical preference can override that boundary.");
    if (liquidityPenalty) explanation.push("Liquidity pressure reduces the analytical preference for increasing Round-Up exposure.");
    if (option.constraints.length) explanation.push("Option-specific constraints reduce its score.");
    return { option_id: option.id, total_score: Number(total.toFixed(3)), evidence_quality: evidenceQuality, expected_value: Number(expectedValue.toFixed(3)), downside_exposure: Number(downside.toFixed(3)), reversibility: Number(reversibility.toFixed(3)), constraint_fit: hardBlockedByGoal ? 0 : Number((1 - constraintPenalty).toFixed(3)), objective_alignment: objectiveAlignment, explanation };
  }).sort((a, b) => b.total_score - a.total_score);

  const preferred = scores.find((score) => score.total_score > 0) ?? null;
  const second = preferred ? scores.find((score) => score.option_id !== preferred.option_id && score.total_score > 0) : undefined;
  const summary = preferred ? [`Highest analytical preference: ${decision.options.find((o) => o.id === preferred.option_id)?.label ?? preferred.option_id} (${preferred.total_score.toFixed(3)}).`] : ["All available options are constrained or blocked by evidence and explicit boundaries."];
  if (second && preferred) summary.push(`The ranking gap to the next option is ${(preferred.total_score - second.total_score).toFixed(3)}; a small gap means the choice is sensitive to evidence and assumptions.`);
  summary.push(`Objective priority follows user-declared goals where present; financial safety states remain governing constraints.`);
  if (userConstraints.length) summary.push(`Explicit user constraints are active: ${userConstraints.length} boundary${userConstraints.length === 1 ? "" : "ies"}.`);
  summary.push("Ranking compares modeled analytical properties; it does not establish that the preferred option will produce the modeled outcome.");

  return { architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1", objective: decision.objective, objectives, ranking_status: hardBlockedCount === decision.options.length ? "blocked" : (limitations.length || userConstraints.length || hardBlockedCount ? "constrained" : "ranked"), scores, preferred_option_id: preferred?.option_id ?? null, tradeoff_summary: summary, constraints, limitations, evidence: evidenceScore[decision.quality === "high" || decision.quality === "moderate" ? "calculated" : "inferred"] > 0.8 ? "calculated" : "inferred" };
}
