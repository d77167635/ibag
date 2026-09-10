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

/**
 * Consequence modeling is fail-closed until an authoritative upstream scenario
 * supplies an explicit intervention magnitude. Iris never invents a financial
 * change, stress percentage, uncertainty range, or behavioral assumption.
 */
export function buildConsequenceModel(
  decision: DecisionIntelligence,
  state: FinancialStateModel,
  reasoning: FinancialReasoning,
  _cashFlowNet: number | null,
  _observedOutflow: number | null,
  _horizonDays: number,
): ConsequenceModel {
  const limitations = [...new Set([
    ...decision.missing_evidence,
    ...decision.constraints,
    "No authoritative intervention magnitude was supplied; Iris will not manufacture one.",
  ])];

  const scenarios: ConsequenceScenario[] = decision.options.map((option) => ({
    id: `consequence:${option.id}`,
    decision_option_id: option.id,
    scenario: option.label,
    assumption: "No financial intervention is modeled because no authoritative scenario input specifies the magnitude and scope of the change.",
    modeled_change: null,
    modeled_range: null,
    downstream_effects: [],
    tradeoffs: ["A consequence cannot be quantified without an explicit, provenance-backed scenario input."],
    constraints: decision.constraints,
    reversibility: option.reversibility,
    evidence: "insufficient_evidence",
    status: "blocked",
  }));

  if (state.active_states.includes("debt_pressure")) {
    limitations.push("Debt pressure is observed/calculated state, but no unsupported consequence magnitude is inferred from it.");
  }
  if (reasoning.risks.length) {
    limitations.push("Existing risks are preserved as evidence; their future response is not fabricated.");
  }

  const tradeoffs = scenarios.map((scenario) => ({
    option_id: scenario.decision_option_id,
    benefits: scenario.downstream_effects,
    costs: scenario.tradeoffs,
    uncertainty: ["No quantified consequence is available without authoritative scenario evidence."],
  }));

  return {
    architecture_version: "IRIS_CONSEQUENCE_MODEL_V1",
    methodology: "Fail-closed consequence analysis. Quantified consequences require an authoritative scenario intervention, explicit scope, and provenance-backed inputs; absent those inputs Iris returns insufficient evidence instead of inventing a stress, forecast, or uncertainty range.",
    scenarios,
    tradeoffs,
    uncertainty_ranges: [],
    limitations: [...new Set(limitations)],
  };
}
