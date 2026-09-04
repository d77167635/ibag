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

const objectiveForState = (state: FinancialStateModel): GoalObjective => {
  if (state.active_states.includes("liquidity_pressure")) return "stabilize_liquidity";
  if (state.active_states.includes("cash_flow_pressure")) return "improve_cash_flow";
  if (state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure")) return "reduce_pressure";
  return "understand_finances";
};

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

/** Establishes an explicit objective layer. Inferred objectives remain inferred until the user declares a goal. */
export function buildGoalIntelligence(
  state: FinancialStateModel,
  decision: DecisionIntelligence,
  optimization: OptimizationIntelligence,
): GoalIntelligence {
  const objective = objectiveForState(state);
  const goals: IrisGoal[] = [{
    id: `goal:${objective}`,
    objective,
    source: "iris_inferred",
    priority: 1,
    horizon_days: objective === "stabilize_liquidity" ? 30 : 90,
    rationale: `Iris selected ${objective.replaceAll("_", " ")} as the current analytical objective from observed financial-state signals.`,
    evidence: state.primary_state === "insufficient_evidence" ? "insufficient_evidence" : "inferred",
    active: true,
  }];

  if (state.active_states.includes("liquidity_pressure")) goals.push({
    id: "goal:preserve_liquidity",
    objective: "stabilize_liquidity",
    source: "system_default",
    priority: 0.95,
    horizon_days: 30,
    rationale: "Liquidity preservation is a safety constraint while liquidity pressure is active.",
    evidence: "calculated",
    active: true,
  });

  const conflicts: GoalConflict[] = [];
  if (goals.some((g) => g.objective === "stabilize_liquidity") && goals.some((g) => g.objective === "build_roundups")) {
    conflicts.push({
      goal_ids: goals.filter((g) => g.objective === "stabilize_liquidity" || g.objective === "build_roundups").map((g) => g.id),
      statement: "Building Round-Up accrual and preserving immediate liquidity can compete when liquidity is constrained.",
      resolution_rule: "Safety and liquidity constraints take precedence over optional accumulation objectives until evidence shows adequate liquidity.",
    });
  }

  const active = goals.find((g) => g.active) ?? null;
  const objectiveAlignment = decision.options.map((option) => {
    const score = alignment(active?.objective ?? "understand_finances", option.kind);
    return {
      goal_id: active?.id ?? "goal:none",
      option_id: option.id,
      alignment: score,
      explanation: `${option.label} has ${score.toFixed(2)} alignment with the current analytical objective.` + (optimization.preferred_option_id === option.id ? " It is also the current optimization preference." : ""),
    };
  });

  const limitations = [...new Set([
    ...decision.missing_evidence,
    "No user-declared goal has been supplied to this model; inferred objectives must not be represented as user intent.",
  ])];

  return {
    architecture_version: "IRIS_GOAL_INTELLIGENCE_V1",
    goals,
    active_goal_id: active?.id ?? null,
    conflicts,
    objective_alignment: objectiveAlignment,
    limitations,
  };
}
