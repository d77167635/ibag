export type CounterfactualScenario = {
  id: string;
  option_id: string;
  intervention: string;
  baseline_score: number;
  perturbed_score: number;
  score_delta: number;
  stability: "stable" | "sensitive";
  held_constant: string[];
  changed_variables: string[];
  causal_claim_allowed: false;
  assumptions: string[];
  limitations: string[];
};

type DecisionLike = { options?: Array<{ id: string; kind: string; label: string; reversibility?: string }> };
type OptimizationLike = { scores?: Array<{ option_id?: string; total_score?: number }> };

/**
 * Counterfactual generation is fail-closed until Iris has an explicitly
 * declared scenario input with traceable provenance. This function never
 * manufactures a baseline, perturbation, probability, financial fact, or
 * outcome from arbitrary constants.
 */
export function buildCounterfactualIntelligence(_input: {
  decision?: DecisionLike;
  optimization?: OptimizationLike;
  safeToSpend?: number | null;
  cashFlowNet?: number | null;
  revolvingDebt?: number | null;
}) {
  return {
    engine_version: "IRIS_COUNTERFACTUAL_ENGINE_V3",
    scenarios: [] as CounterfactualScenario[],
    baseline_preserved: true,
    execution_capability: false,
    evidence_state: "INSUFFICIENT_EVIDENCE" as const,
    principles: [
      "No scenario value is created without an explicitly sourced scenario input.",
      "Observed and derived financial values are never altered to manufacture a scenario.",
      "No probability, causal effect, stress percentage, multiplier, or score perturbation is invented.",
      "Missing scenario evidence produces an empty result rather than synthetic data.",
      "No provider state is mutated.",
    ],
    generation: {
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      provider_observations_created: false,
      execution_capability: false,
    },
  };
}

/**
 * Scenario analysis is fail-closed until the scenario contains explicit,
 * provenance-backed inputs. An upstream projection may be displayed as an
 * upstream projection, but this layer must not manufacture stressed values
 * from it or from arbitrary percentages.
 */
export function buildScenarioSensitivityIntelligence(input: {
  predictive?: { projectedLiquidPosition?: unknown };
  causal?: { hypotheses?: unknown };
  safeToSpend?: number | null;
  cashFlowNet?: number | null;
  revolvingDebt?: number | null;
}) {
  const predictive = input.predictive ?? {};
  const causal = input.causal ?? {};
  const projected = Number(predictive.projectedLiquidPosition);
  const hypotheses = Array.isArray(causal.hypotheses) ? causal.hypotheses : [];

  return {
    engine_version: "IRIS_SCENARIO_ENGINE_V2",
    scenarios: [] as Array<Record<string, unknown>>,
    baseline_preserved: true,
    evidence_state: "INSUFFICIENT_EVIDENCE" as const,
    causal_hypothesis_count: hypotheses.length,
    projection_available: Number.isFinite(projected),
    upstream_projection: Number.isFinite(projected) ? projected : null,
    scenario_generation_blocked_reason: "NO_PROVENANCE_BACKED_SCENARIO_INPUT",
    generation: {
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      provider_observations_created: false,
      execution_capability: false,
    },
  };
}
