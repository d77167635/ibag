import type { DecisionIntelligence, DecisionOption } from "./decisionIntelligence.js";
import type { ConsequenceModel } from "./consequence.js";
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

function deriveObjectives(state: FinancialStateModel, declaredGoals: DeclaredIrisGoal[]) {
  const objectives: Array<{ objective: OptimizationObjective; priority: number; rationale: string }> = [];
  const activeDeclared = declaredGoals.filter((goal) => goal.active).sort((a, b) => a.priority - b.priority);

  for (const goal of activeDeclared) {
    if (!objectives.some((item) => item.objective === goal.objective)) {
      objectives.push({
        objective: goal.objective,
        priority: Math.max(1, goal.priority),
        rationale: `User-declared goal: ${goal.title}${goal.description ? ` — ${goal.description}` : ""}.`,
      });
    }
  }

  if (state.active_states.includes("liquidity_pressure") && !objectives.some((o) => o.objective === "stabilize_liquidity")) {
    objectives.push({ objective: "stabilize_liquidity", priority: Math.max(1, activeDeclared.length + 1), rationale: "Active liquidity pressure remains a safety-relevant analytical objective." });
  }
  if (state.active_states.includes("cash_flow_pressure") && !objectives.some((o) => o.objective === "improve_cash_flow")) {
    objectives.push({ objective: "improve_cash_flow", priority: activeDeclared.length + 2, rationale: "Active cash-flow pressure warrants near-term improvement analysis." });
  }
  if ((state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure")) && !objectives.some((o) => o.objective === "reduce_pressure")) {
    objectives.push({ objective: "reduce_pressure", priority: activeDeclared.length + 3, rationale: "Debt or spending pressure creates a pressure-reduction objective." });
  }
  if (!objectives.some((o) => o.objective === "build_roundups")) {
    objectives.push({ objective: "build_roundups", priority: activeDeclared.length + 4, rationale: "Round-Ups remain an Iris capability, subordinate to explicit goals and safety pressure." });
  }
  if (!objectives.some((o) => o.objective === "understand_finances")) {
    objectives.push({ objective: "understand_finances", priority: activeDeclared.length + 5, rationale: "Understanding remains a universal analytical objective." });
  }

  return objectives.sort((a, b) => a.priority - b.priority);
}

function hardConstraintApplies(constraint: string, option: DecisionOption): boolean {
  const normalized = constraint.trim().toLowerCase();
  if (!normalized) return false;
  const optionText = `${option.kind} ${option.label} ${option.rationale} ${option.expected_effects.join(" ")}`.toLowerCase();
  const prohibitive = /^(no|never|avoid|don't|do not|must not|cannot|can't|prohibit|prohibited)\b/.test(normalized);
  return prohibitive && normalized.split(/\s+/).some((token) => token.length > 3 && optionText.includes(token));
}

function explicitConstraints(declaredGoals: DeclaredIrisGoal[]): string[] {
  return declaredGoals
    .filter((goal) => goal.active)
    .flatMap((goal) => (goal.constraints ?? []).filter(Boolean).map((constraint) => `goal:${goal.id} — ${constraint}`));
}

function blockedResult(
  decision: DecisionIntelligence,
  objectives: Array<{ objective: OptimizationObjective; priority: number; rationale: string }>,
  constraints: string[],
  limitations: string[],
  reason: string,
): OptimizationIntelligence {
  return {
    architecture_version: "IRIS_OPTIMIZATION_INTELLIGENCE_V1",
    objective: decision.objective,
    objectives,
    ranking_status: "blocked",
    scores: [],
    preferred_option_id: null,
    tradeoff_summary: [reason],
    constraints,
    limitations,
    evidence: "insufficient_evidence",
  };
}

/**
 * Optimization is deliberately fail-closed until a governed scoring model exists.
 *
 * The previous implementation converted qualitative option properties into numeric
 * financial preference scores using embedded coefficients and default benefit values.
 * Those coefficients were not themselves provenance-backed financial evidence. Iris
 * must not manufacture decision significance from arbitrary constants.
 *
 * Once a governed optimization model is available, it must supply versioned parameters,
 * provenance, validation, uncertainty semantics, and an auditable transformation before
 * this function may emit numeric rankings.
 */
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

  if (!decision.options.length || decision.quality === "blocked") {
    return blockedResult(
      decision,
      objectives,
      constraints,
      limitations,
      "No option can be responsibly ranked while decision evidence is blocked.",
    );
  }

  const hardBlocked = decision.options.filter((option) =>
    declaredGoals.some((goal) => goal.active && (goal.constraints ?? []).some((constraint) => hardConstraintApplies(constraint, option))),
  );

  const hasGovernedQuantifiedScenario = consequences.scenarios.some(
    (scenario) => scenario.status !== "blocked" && scenario.modeled_change !== null,
  );

  if (!hasGovernedQuantifiedScenario) {
    const boundaryNote = hardBlocked.length
      ? ` ${hardBlocked.length} option(s) are also explicitly constrained by user-declared boundaries.`
      : "";

    return blockedResult(
      decision,
      objectives,
      constraints,
      [
        ...limitations,
        "No provenance-backed quantified scenario intervention is available for optimization.",
        "Numeric option ranking is withheld because embedded coefficients would manufacture analytical significance rather than derive it from governed evidence.",
      ],
      `Optimization ranking is withheld until a governed, provenance-backed scenario model is available.${boundaryNote}`,
    );
  }

  // A future governed optimizer must be implemented here rather than silently
  // reverting to heuristic coefficients. Failing closed is safer than producing
  // an apparently precise preference whose parameters have no authoritative basis.
  return blockedResult(
    decision,
    objectives,
    constraints,
    [
      ...limitations,
      "A quantified scenario exists, but no governed optimization transformation is currently certified to consume it.",
    ],
    "Optimization remains blocked pending certification of the governed optimization transformation.",
  );
}
