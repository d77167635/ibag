import type { FinancialReasoning } from "./relational.js";
import type { FinancialStateModel } from "./financialState.js";
import type { Evidence } from "./types.js";

export interface CausalHypothesis {
  id: string;
  statement: string;
  evidence: Evidence;
  support: string[];
  alternative_explanations: string[];
  missing_evidence: string[];
  causal_status: "supported_association" | "plausible_hypothesis" | "not_established";
  falsification_tests: string[];
  intervention_requirements: string[];
}

export interface CausalAnalysis {
  architecture_version: "IRIS_CAUSAL_ANALYSIS_V2";
  hypotheses: CausalHypothesis[];
  limitations: string[];
  policy: { association_is_not_causation: true; interventions_are_not_executed: true; unobserved_confounders_block_causal_claims: true };
}

/** Produces falsifiable, explicitly non-causal hypotheses from established relationships. */
export function buildCausalAnalysis(reasoning: FinancialReasoning, state: FinancialStateModel): CausalAnalysis {
  const hypotheses: CausalHypothesis[] = [];
  const limitations: string[] = [];
  const negativeFlow = reasoning.risks.find((risk) => risk.key === "cash_flow_deterioration");
  const debtAcceleration = reasoning.risks.find((risk) => risk.key === "debt_acceleration");

  if (negativeFlow && debtAcceleration) {
    hypotheses.push({
      id: "cash_flow_debt_relationship",
      statement: "Negative cash-flow conditions and rising revolving debt occur in the same observed period; the available evidence supports an association, not proof that one caused the other.",
      evidence: "inferred",
      support: [negativeFlow.key, debtAcceleration.key],
      alternative_explanations: ["Debt may have increased for reasons independent of operating cash flow.", "Timing overlap does not establish direction of causation.", "Unobserved accounts or external financial activity may affect the relationship."],
      missing_evidence: ["Longitudinal account-level causal controls", "Complete external financial activity for the relevant period"],
      causal_status: "supported_association",
      falsification_tests: ["Test whether debt acceleration persists when cash-flow deterioration is absent.", "Test whether the relationship survives account-level controls and alternative time windows.", "Test lagged directions rather than treating same-period correlation as direction."],
      intervention_requirements: ["A causal intervention would require controlled behavioral or financial changes; Iris does not execute such interventions in Phase 1."],
    });
  }

  const driftRisk = reasoning.risks.find((risk) => risk.key === "category_spending_drift");
  if (driftRisk) {
    hypotheses.push({
      id: "spending_drift_relationship",
      statement: "Observed category spending drift may contribute to current spending pressure, but the available evidence does not establish that the drift caused the broader financial state.",
      evidence: "inferred",
      support: [driftRisk.key],
      alternative_explanations: ["The category change may reflect a temporary one-time purchase.", "Other categories or obligations may dominate the underlying state.", "Merchant or category classification may be incomplete."],
      missing_evidence: ["Longer longitudinal behavior history", "Complete classification coverage"],
      causal_status: "plausible_hypothesis",
      falsification_tests: ["Compare the relationship across multiple certified windows.", "Check whether spending pressure remains after removing the drifting category.", "Test robustness to merchant/category reclassification."],
      intervention_requirements: ["A causal test would require an actual controlled change in the spending behavior; Iris may simulate this but cannot execute it."],
    });
  }

  if (state.primary_state === "insufficient_evidence") limitations.push("Financial state is insufficiently evidenced; causal conclusions are blocked.");
  if (!hypotheses.length) limitations.push("No causal hypothesis is currently supported by available cross-domain evidence.");
  limitations.push("Causal status remains bounded: Iris distinguishes observed association, plausible hypothesis, and established causation and does not promote association to causation without appropriate longitudinal controls.");
  return {
    architecture_version: "IRIS_CAUSAL_ANALYSIS_V2",
    hypotheses,
    limitations,
    policy: { association_is_not_causation: true, interventions_are_not_executed: true, unobserved_confounders_block_causal_claims: true },
  };
}
