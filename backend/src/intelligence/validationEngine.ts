import { supabaseAdmin } from "../config/supabase.js";

export type IntelligenceValidation = {
  architecture_version: "IRIS_VALIDATION_ENGINE_V1";
  sample_count: number;
  validated_predictions: number;
  metrics: {
    forward_liquid_mae: number | null;
    forward_liquid_directional_accuracy: number | null;
    forward_liquid_bias: number | null;
  };
  calibration: "not_yet_calibrated" | "initial" | "usable";
  observations: Array<{
    prior_snapshot_id: string;
    validation_snapshot_id: string;
    evidence_boundary: string;
    predicted_liquid_position: number;
    observed_liquid_assets: number;
    absolute_error: number;
    direction_correct: boolean | null;
  }>;
  limitations: string[];
  generation: {
    source: "subsequent real evidence snapshots";
    financial_values_created: false;
    fake_mock_or_seeded_data: false;
    execution_capability: false;
  };
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Compares a previously emitted forward projection with the next real
 * evidence snapshot. No synthetic outcomes are generated and no model is
 * automatically changed by this function.
 */
export async function evaluateIntelligenceValidation(userId: string): Promise<IntelligenceValidation> {
  const { data, error } = await supabaseAdmin
    .from("iris_intelligence_snapshots")
    .select("id, generated_at, evidence_boundary, liquid_assets, forward_projected_liquid_position")
    .eq("user_id", userId)
    .order("generated_at", { ascending: true })
    .limit(250);

  if (error) throw error;

  const rows = (data ?? []).filter(row => row.evidence_boundary);
  const observations: IntelligenceValidation["observations"] = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const prior = rows[i];
    const next = rows[i + 1];
    if (!finite(prior.forward_projected_liquid_position) || !finite(next.liquid_assets)) continue;
    if (new Date(next.evidence_boundary).getTime() <= new Date(prior.evidence_boundary).getTime()) continue;
    const predicted = Number(prior.forward_projected_liquid_position);
    const observed = Number(next.liquid_assets);
    const priorObserved = finite(prior.liquid_assets) ? Number(prior.liquid_assets) : null;
    const predictedDirection = priorObserved === null ? null : Math.sign(predicted - priorObserved);
    const observedDirection = priorObserved === null ? null : Math.sign(observed - priorObserved);
    observations.push({
      prior_snapshot_id: prior.id,
      validation_snapshot_id: next.id,
      evidence_boundary: next.evidence_boundary,
      predicted_liquid_position: predicted,
      observed_liquid_assets: observed,
      absolute_error: Math.abs(predicted - observed),
      direction_correct: predictedDirection === null || observedDirection === 0 ? null : predictedDirection === observedDirection,
    });
  }

  const errors = observations.map(x => x.absolute_error);
  const forwardLiquidMae = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
  const bias = observations.length ? observations.reduce((sum, x) => sum + (x.predicted_liquid_position - x.observed_liquid_assets), 0) / observations.length : null;
  const directional = observations.filter(x => x.direction_correct !== null);
  const directionalAccuracy = directional.length ? directional.filter(x => x.direction_correct === true).length / directional.length : null;

  return {
    architecture_version: "IRIS_VALIDATION_ENGINE_V1",
    sample_count: rows.length,
    validated_predictions: observations.length,
    metrics: { forward_liquid_mae: forwardLiquidMae, forward_liquid_directional_accuracy: directionalAccuracy, forward_liquid_bias: bias },
    calibration: observations.length >= 20 ? "usable" : observations.length > 0 ? "initial" : "not_yet_calibrated",
    observations: observations.slice(-24),
    limitations: [
      "Validation requires later real evidence snapshots; no future outcome is invented.",
      "Forward-liquid validation measures forecast error, not causation or guaranteed account outcomes.",
      "No automatic parameter or model change occurs from this evaluator; adaptation must pass separate governance and regression gates.",
    ],
    generation: { source: "subsequent real evidence snapshots", financial_values_created: false, fake_mock_or_seeded_data: false, execution_capability: false },
  };
}
