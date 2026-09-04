import type { Evidence } from "./types.js";
import type { FinancialStateModel } from "./financialState.js";
import type { FinancialReasoning } from "./relational.js";
import type { DecisionIntelligence } from "./decisionIntelligence.js";

export interface UncertaintyRange {
  low: number;
  base: number;
  high: number;
  unit: "currency" | "percent";
  interpretation: string;
}

export interface ConsequenceScenario {
  id: string;
  decision_option_id: string;
  scenario: string;
  assumption: string;
  modeled_change: number | null;
  modeled_range: UncertaintyRange | null;
  downstream_effects: string[];
  tradeoffs: string[];
  constraints: string[];
  reversibility: "high" | "medium" | "low";
  evidence: Evidence;
  status: "illustrative" | "blocked";
}

export interface ConsequenceModel {
  architecture_version: "IRIS_CONSEQUENCE_MODEL_V1";
  methodology: string;
  scenarios: ConsequenceScenario[];
  tradeoffs: Array<{ option_id: string; benefits: string[]; costs: string[]; uncertainty: string[] }>;
  uncertainty_ranges: UncertaintyRange[];
  limitations: string[];
}

function range(base: number, magnitude: number): UncertaintyRange {
  const spread = Math.abs(base) * magnitude;
  return {
    low: Number((base - spread).toFixed(2)),
    base: Number(base.toFixed(2)),
    high: Number((base + spread).toFixed(2)),
    unit: "currency",
    interpretation: "Illustrative sensitivity range around the modeled baseline; it is not a probabilistic forecast.",
  };
}

/** Models directional consequences only. It does not predict behavior, establish causation, or execute financial actions. */
export function buildConsequenceModel(
  decision: DecisionIntelligence,
  state: FinancialStateModel,
  reasoning: FinancialReasoning,
  cashFlowNet: number | null,
  observedOutflow: number | null,
  horizonDays: number,
): ConsequenceModel {
  const limitations = [...new Set([...decision.missing_evidence, ...decision.constraints])];
  const scenarios: ConsequenceScenario[] = [];

  for (const option of decision.options) {
    if (decision.decision_ready === false) {
      scenarios.push({
        id: `consequence:${option.id}`,
        decision_option_id: option.id,
        scenario: option.label,
        assumption: "Decision readiness is insufficient; no directional consequence is modeled.",
        modeled_change: null,
        modeled_range: null,
        downstream_effects: [],
        tradeoffs: ["Taking action without sufficient evidence could create an unsupported financial decision."],
        constraints: decision.constraints,
        reversibility: option.reversibility,
        evidence: "insufficient_evidence",
        status: "blocked",
      });
      continue;
    }

    let modeled = 0;
    const effects: string[] = [];
    const tradeoffs: string[] = [];

    if (option.kind === "reduce_pressure" || option.kind === "preserve_liquidity") {
      modeled = observedOutflow === null ? 0 : observedOutflow * 0.1;
      effects.push("A lower discretionary outflow baseline would improve modeled net cash flow by the same amount, all else held constant.");
      effects.push("Liquidity pressure would be analytically reassessed after the modeled change.");
      tradeoffs.push("Reducing outflow may constrain discretionary spending or other user priorities.");
    } else if (option.kind === "optimize_roundups") {
      modeled = 0;
      effects.push("Round-Up accrual opportunity can be analyzed, but Phase 1 does not transfer or withdraw funds.");
      tradeoffs.push("Higher Round-Up accrual could reduce available account liquidity when a future movement is eventually authorized.");
    } else {
      effects.push("Investigation has no assumed direct cash impact; its modeled value is improved evidence quality.");
      tradeoffs.push("Time and attention spent investigating one issue may delay review of another.");
    }

    if (state.active_states.includes("debt_pressure")) effects.push("Debt pressure remains a constraint unless debt evidence changes.");
    if (reasoning.risks.length) tradeoffs.push("Existing risks remain unless their underlying observed conditions change.");

    scenarios.push({
      id: `consequence:${option.id}`,
      decision_option_id: option.id,
      scenario: option.label,
      assumption: option.kind === "preserve_liquidity" || option.kind === "reduce_pressure"
        ? `Illustrative ${Math.round((modeled / Math.max(observedOutflow ?? 1, 1)) * 100)}% outflow reduction over the observed ${horizonDays}-day modeling horizon, holding other observed conditions constant.`
        : "No behavioral or causal change is assumed.",
      modeled_change: Number(modeled.toFixed(2)),
      modeled_range: range(modeled, 0.25),
      downstream_effects: effects,
      tradeoffs,
      constraints: decision.constraints,
      reversibility: option.reversibility,
      evidence: "calculated",
      status: "illustrative",
    });
  }

  const tradeoffs = scenarios.map((scenario) => ({
    option_id: scenario.decision_option_id,
    benefits: scenario.downstream_effects,
    costs: scenario.tradeoffs,
    uncertainty: scenario.modeled_range ? [scenario.modeled_range.interpretation] : ["Evidence is insufficient for consequence modeling."],
  }));

  return {
    architecture_version: "IRIS_CONSEQUENCE_MODEL_V1",
    methodology: "Deterministic sensitivity analysis over already observed/calculated financial conditions. Ranges represent sensitivity, not probability; scenarios are counterfactual illustrations, not predictions.",
    scenarios,
    tradeoffs,
    uncertainty_ranges: scenarios.flatMap((s) => s.modeled_range ? [s.modeled_range] : []),
    limitations,
  };
}
