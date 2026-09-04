import type { Evidence } from "./types.js";
import type { FinancialStateModel } from "./financialState.js";
import type { DecisionIntelligence } from "./decisionIntelligence.js";
import type { OptimizationIntelligence } from "./optimization.js";

export type GoalObjective = "stabilize_liquidity" | "improve_cash_flow" | "reduce_pressure" | "build_roundups" | "understand_finances";
export type GoalSource = "user_declared" | "iris_inferred" | "system_default";

export interface IrisGoal {
  id: string;
  objective: GoalObjective;
  source: GoalSource;
  priority: number;
  horizon_days: number | null;
  rationale: string;
  evidence: Evidence;
  active: boolean;
}

export interface GoalConflict {
  goal_ids: string[];
  statement: string;
  resolution_rule: string;
}

export interface GoalIntelligence {
  architecture_version: "IRIS_GOAL_INTELLIGENCE_V1";
  goals: IrisGoal[];
  active_goal_id: string | null;
  conflicts: GoalConflict[];
  objective_alignment: Array<{ goal_id: string; option_id: string; alignment: number; explanation: string }>;
  limitations: string[];
}

function inferredObjectives(state: FinancialStateModel): Array<{ objective: GoalObjective; priority: number; horizon_days: number; rationale: string }> {
  if (state.primary_state === "insufficient_evidence") return [];
  const candidates: Array<{ objective: GoalObjective; priority: number; horizon_days: number; rationale: string }> = [];
  if (state.active_states.includes("liquidity_pressure")) candidates.push({ objective: "stabilize_liquidity", priority: 1, horizon_days: 30, rationale: "Liquidity pressure is an active financial-state signal." });
  if (state.active_states.includes("cash_flow_pressure")) candidates.push({ objective: "improve_cash_flow", priority: 2, horizon_days: 90, rationale: "Cash-flow pressure is an active financial-state signal." });
  if (state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure")) candidates.push({ objective: "reduce_pressure", priority: candidates.length + 1, horizon_days: 90, rationale: "Debt or spending pressure is an active financial-state signal." });
  if (!candidates.length) candidates.push({ objective: "understand_finances", priority: 1, horizon_days: 90, rationale: "No stronger pressure state is established, so financial understanding is the conservative analytical objective." });
  return candidates;
}

function alignment(goal: GoalObjective, optionKind: string): number {
  const map: Record<GoalObjective, Record<string, number>> = {
    stabilize_liquidity: { preserve_liquidity: 1, reduce_pressure: 0.9, investigate: 0.75, monitor: 0.7, optimize_roundups: 0.2 },
    improve_cash_flow: { reduce_pressure: 1, preserve_liquidity: 0.8, investigate: 0.7, monitor: 0.65, optimize_roundups: 0.25 },
    reduce_pressure: { reduce_pressure: 1, preserve_liquidity: 0.85, investigate: 0.7, monitor: 0.6, optimize_roundups: 0.3 },
    build_roundups: { optimize_roundups: 1, monitor: 0.7, investigate: 0.55, preserve_liquidity: 0.3, reduce_pressure: 0.25 },
    understand_finances: { investigate: 1, monitor: 0.9, preserve_liquidity: 0.55, reduce_pressure: 0.5, optimize_roundups: 0.45 },
  };
  return map[goal]?.[optionKind] ?? 0;
}

/** Produces evidence-derived analytical objectives without fabricating user intent. */
export function buildGoalIntelligence(
  state: FinancialStateModel,
  decision: DecisionIntelligence,
  optimization: OptimizationIntelligence,
): GoalIntelligence {
  const candidates = inferredObjectives(state);
  if (!candidates.length) {
    return {
      architecture_version: "IRIS_GOAL_INTELLIGENCE_V1",
      goals: [],
      active_goal_id: null,
      conflicts: [],
      objective_alignment: [],
      limitations: [...new Set([...decision.missing_evidence, "Financial evidence is insufficient to infer an analytical objective."])],
    };
  }

  const goals: IrisGoal[] = candidates.map((candidate, index) => ({
    id: `goal:${candidate.objective}`,
    objective: candidate.objective,
    source: "iris_inferred",
    priority: candidate.priority,
    horizon_days: candidate.horizon_days,
    rationale: `Iris inferred ${candidate.objective.replaceAll("_", " ")} from current financial-state evidence. ${candidate.rationale} This is not user-declared intent.`,
    evidence: "inferred",
    active: index === 0,
  }));

  const conflicts: GoalConflict[] = [];
  const liquidityGoal = goals.find((goal) => goal.objective === "stabilize_liquidity");
  if (liquidityGoal && decision.options.some((o) => o.kind === "optimize_roundups")) {
    conflicts.push({
      goal_ids: [liquidityGoal.id, "decision:optimize_roundups"],
      statement: "Immediate liquidity preservation can compete with optional Round-Up accumulation when liquidity pressure is active.",
      resolution_rule: "Treat liquidity pressure as the governing safety constraint; do not imply that Round-Up optimization is preferred without adequate liquidity evidence.",
    });
  }
  if (goals.length > 1) {
    conflicts.push({
      goal_ids: goals.map((goal) => goal.id),
      statement: "Multiple financial-state signals can produce objectives that compete for the same limited financial capacity.",
      resolution_rule: "Higher-priority safety objectives govern lower-priority objectives; unresolved tradeoffs remain explicit rather than being silently optimized away.",
    });
  }

  const objectiveAlignment = goals.flatMap((goal) => decision.options.map((option) => {
    const score = alignment(goal.objective, option.kind);
    return {
      goal_id: goal.id,
      option_id: option.id,
      alignment: score,
      explanation: `${option.label} has ${score.toFixed(2)} analytical alignment with the inferred ${goal.objective.replaceAll("_", " ")} objective.` + (optimization.preferred_option_id === option.id ? " It is also the current optimization preference." : ""),
    };
  }));

  return {
    architecture_version: "IRIS_GOAL_INTELLIGENCE_V1",
    goals,
    active_goal_id: goals[0]?.id ?? null,
    conflicts,
    objective_alignment: objectiveAlignment,
    limitations: [...new Set([...decision.missing_evidence, "No user-declared goal has been supplied; these objectives are Iris inferences, not user intent."])],
  };
}
