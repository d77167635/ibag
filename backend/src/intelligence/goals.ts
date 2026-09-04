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

const objectiveForState = (state: FinancialStateModel): GoalObjective | null => {
  if (state.primary_state === "insufficient_evidence") return null;
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

/** Creates only evidence-derived objectives. It never represents inferred state as user intent. */
export function buildGoalIntelligence(
  state: FinancialStateModel,
  decision: DecisionIntelligence,
  optimization: OptimizationIntelligence,
): GoalIntelligence {
  const objective = objectiveForState(state);
  if (!objective) {
    return {
      architecture_version: "IRIS_GOAL_INTELLIGENCE_V1",
      goals: [],
      active_goal_id: null,
      conflicts: [],
      objective_alignment: [],
      limitations: [...new Set([...decision.missing_evidence, "Financial evidence is insufficient to infer an analytical objective."])],
    };
  }

  const goals: IrisGoal[] = [{
    id: `goal:${objective}`,
    objective,
    source: "iris_inferred",
    priority: 1,
    horizon_days: objective === "stabilize_liquidity" ? 30 : 90,
    rationale: `Iris inferred ${objective.replaceAll("_", " ")} as an analytical objective from the current financial-state signals. This is not user-declared intent.`,
    evidence: "inferred",
    active: true,
  }];

  const conflicts: GoalConflict[] = [];
  if (objective === "stabilize_liquidity" && decision.options.some((o) => o.kind === "optimize_roundups")) {
    conflicts.push({
      goal_ids: [goals[0].id, "decision:optimize_roundups"],
      statement: "Immediate liquidity preservation can compete with optional Round-Up accumulation when liquidity pressure is active.",
      resolution_rule: "Treat liquidity pressure as the governing safety constraint; do not imply that Round-Up optimization is preferred without adequate liquidity evidence.",
    });
  }

  const objectiveAlignment = decision.options.map((option) => {
    const score = alignment(objective, option.kind);
    return {
      goal_id: goals[0].id,
      option_id: option.id,
      alignment: score,
      explanation: `${option.label} has ${score.toFixed(2)} analytical alignment with the inferred objective.` + (optimization.preferred_option_id === option.id ? " It is also the current optimization preference." : ""),
    };
  });

  return {
    architecture_version: "IRIS_GOAL_INTELLIGENCE_V1",
    goals,
    active_goal_id: goals[0].id,
    conflicts,
    objective_alignment: objectiveAlignment,
    limitations: [...new Set([...decision.missing_evidence, "No user-declared goal has been supplied; this objective is an Iris inference, not user intent."])],
  };
}
