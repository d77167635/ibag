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
type Variable = { key: string; value: number; direction: "negative" | "positive"; stress: number };

/** Evidence-bounded counterfactual sensitivity analysis; never an observation, probability, causal effect, or executable action. */
export function buildCounterfactualIntelligence(input: { decision?: DecisionLike; optimization?: OptimizationLike; safeToSpend?: number | null; cashFlowNet?: number | null; revolvingDebt?: number | null }) {
  const options = input.decision?.options ?? [];
  const scores = input.optimization?.scores ?? [];
  const baseline = new Map(scores.map(s => [s.option_id, Number(s.total_score ?? 0)]));
  const variables: Variable[] = [
    { key: "safe_to_spend", value: Number(input.safeToSpend ?? 0), direction: "negative", stress: 0.10 },
    { key: "cash_flow_net", value: Number(input.cashFlowNet ?? 0), direction: "negative", stress: 0.10 },
    { key: "revolving_debt", value: Number(input.revolvingDebt ?? 0), direction: "positive", stress: 0.10 },
  ].filter((v): v is Variable => Number.isFinite(v.value));
  const scenarios: CounterfactualScenario[] = [];
  for (const option of options.slice(0, 12)) {
    const base = baseline.get(option.id);
    if (base == null || !Number.isFinite(base)) continue;
    const pressureVariables = variables.filter(v => v.key === "revolving_debt" ? v.value > 0 : v.value < 0);
    const active = pressureVariables.length ? pressureVariables : variables.slice(0, 1);
    const intensity = Math.min(0.30, active.reduce((sum, v) => sum + v.stress, 0));
    const optionMultiplier = option.kind === "reduce_pressure" ? 1.00 : option.kind === "preserve_liquidity" ? 0.90 : option.kind === "optimize_roundups" ? 0.65 : 0.50;
    const delta = Number((-intensity * optionMultiplier).toFixed(3));
    const adjusted = Number((base + delta).toFixed(3));
    scenarios.push({ id: `counterfactual:${option.id}`, option_id: option.id, intervention: `Model a bounded adverse change in ${active.map(v => v.key).join(", ")} while holding unrelated decision inputs constant.`, baseline_score: Number(base.toFixed(3)), perturbed_score: adjusted, score_delta: delta, stability: Math.abs(delta) <= 0.10 ? "stable" : "sensitive", held_constant: ["Provider observations and canonical evidence remain unchanged.", "Decision options and their definitions remain unchanged.", "No new financial transaction, account, or provider state is introduced."], changed_variables: active.map(v => `${v.key}: bounded ${Math.round(v.stress * 100)}% adverse stress`), causal_claim_allowed: false, assumptions: ["The changed variables are model inputs, not newly observed outcomes.", "Stress magnitudes are deterministic sensitivity parameters, not probabilities.", "The existing optimization score function remains the model under the bounded perturbation."], limitations: ["This engine does not identify a real-world intervention effect.", "It does not estimate probabilities or causal effect sizes.", "Interactions between stressed variables are bounded rather than empirically estimated.", "Execution feasibility is outside Phase 1."] });
  }
  return { engine_version: "IRIS_COUNTERFACTUAL_ENGINE_V2", scenarios, baseline_preserved: true, execution_capability: false, principles: ["Counterfactuals are modeled alternatives, never observations.", "Changed variables and held-constant variables are explicit.", "Sensitivity is not probability.", "No causal claim is emitted without causal evidence.", "No provider state is mutated."], generation: { financial_values_created: false, fake_mock_or_seeded_data: false, provider_observations_created: false, execution_capability: false } };
}
