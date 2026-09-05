export type CounterfactualScenario = {
  id: string;
  option_id: string;
  intervention: string;
  baseline_score: number;
  perturbed_score: number;
  score_delta: number;
  stability: "stable" | "sensitive";
  assumptions: string[];
  limitations: string[];
};

type DecisionLike = {
  options?: Array<{
    id: string;
    kind: string;
    label: string;
    reversibility?: string;
  }>;
};

type OptimizationLike = {
  scores?: Array<{ option_id?: string; total_score?: number }>;
};

/**
 * Deterministic counterfactual stress testing over existing decision scores.
 * It models bounded perturbations; it never creates provider observations or executes actions.
 */
export function buildCounterfactualIntelligence(input: {
  decision?: DecisionLike;
  optimization?: OptimizationLike;
  safeToSpend?: number | null;
  cashFlowNet?: number | null;
  revolvingDebt?: number | null;
}) {
  const options = input.decision?.options ?? [];
  const scores = input.optimization?.scores ?? [];
  const baseline = new Map(scores.map((s) => [s.option_id, Number(s.total_score ?? 0)]));
  const scenarios: CounterfactualScenario[] = [];

  for (const option of options.slice(0, 12)) {
    const base = baseline.get(option.id);
    if (base == null || !Number.isFinite(base)) continue;

    const perturbation = option.kind === "reduce_pressure" ? -0.10
      : option.kind === "preserve_liquidity" ? -0.08
      : option.kind === "optimize_roundups" ? -0.05
      : -0.03;
    const pressureContext = [input.safeToSpend, input.cashFlowNet, input.revolvingDebt].some((v) => typeof v === "number" && v < 0);
    const adjusted = Number((base + perturbation * (pressureContext ? 1.25 : 1)).toFixed(3));

    scenarios.push({
      id: `counterfactual:${option.id}`,
      option_id: option.id,
      intervention: `Stress the ${option.label} decision score under a bounded adverse assumption.`,
      baseline_score: Number(base.toFixed(3)),
      perturbed_score: adjusted,
      score_delta: Number((adjusted - base).toFixed(3)),
      stability: Math.abs(adjusted - base) <= 0.10 ? "stable" : "sensitive",
      assumptions: [
        "The perturbation is a deterministic stress test, not a forecast probability.",
        "Decision scores are treated as the existing model output and are not provider observations.",
      ],
      limitations: [
        "This V1 engine does not claim the perturbed condition will occur.",
        "It does not model all interactions among decision variables.",
        "It cannot establish causation or execution feasibility.",
      ],
    });
  }

  return {
    engine_version: "IRIS_COUNTERFACTUAL_ENGINE_V1",
    scenarios,
    baseline_preserved: true,
    execution_capability: false,
    principles: [
      "Counterfactuals are modeled alternatives, never observations.",
      "Every perturbation must remain explicit and bounded.",
      "Sensitivity is not probability.",
      "A stable decision is not proof that the underlying assumptions are true.",
    ],
    generation: {
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      provider_observations_created: false,
      execution_capability: false,
    },
  };
}
