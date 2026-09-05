import { supabaseAdmin } from "../config/supabase.js";

export type IntelligenceValidation = {
  architecture_version: "IRIS_VALIDATION_ENGINE_V2";
  sample_count: number;
  eligible_predictions: number;
  validated_predictions: number;
  metrics: {
    forward_liquid_mae: number | null;
    forward_liquid_directional_accuracy: number | null;
    forward_liquid_bias: number | null;
    mean_absolute_percentage_error: number | null;
    normalized_mae: number | null;
  };
  calibration: "not_yet_calibrated" | "initial" | "usable";
  horizon_days: number;
  observations: Array<{
    prior_snapshot_id: string;
    validation_snapshot_id: string;
    evidence_boundary: string;
    horizon_days: number;
    elapsed_days: number;
    predicted_liquid_position: number;
    observed_liquid_assets: number;
    absolute_error: number;
    signed_error: number;
    absolute_percentage_error: number | null;
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
function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}
function horizonFrom(row: any): number {
  const value = row?.metadata?.forecast_horizon_days;
  return finite(Number(value)) && Number(value) > 0 ? Math.round(Number(value)) : 30;
}

/**
 * Validates forecasts only against a later real snapshot that is at least the
 * forecast horizon away. This prevents a 30-day forecast from being scored
 * against an observation captured hours later. No synthetic outcomes are
 * generated and no model is automatically changed by this evaluator.
 */
export async function evaluateIntelligenceValidation(userId: string): Promise<IntelligenceValidation> {
  const { data, error } = await supabaseAdmin
    .from("iris_intelligence_snapshots")
    .select("id, generated_at, evidence_boundary, liquid_assets, forward_projected_liquid_position, metadata")
    .eq("user_id", userId)
    .order("generated_at", { ascending: true })
    .limit(500);
  if (error) throw error;

  const rows = (data ?? []).filter(row => row.evidence_boundary);
  const observations: IntelligenceValidation["observations"] = [];
  let eligiblePredictions = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const prior = rows[i];
    if (!finite(prior.forward_projected_liquid_position)) continue;
    const horizonDays = horizonFrom(prior);
    const priorBoundary = new Date(prior.evidence_boundary).getTime();
    let target: any = null;
    let targetElapsed = Number.POSITIVE_INFINITY;

    for (let j = i + 1; j < rows.length; j += 1) {
      const candidate = rows[j];
      if (!finite(candidate.liquid_assets) || !candidate.evidence_boundary) continue;
      const elapsed = daysBetween(prior.evidence_boundary, candidate.evidence_boundary);
      if (elapsed < horizonDays) continue;
      const distance = Math.abs(elapsed - horizonDays);
      if (distance < targetElapsed) {
        target = candidate;
        targetElapsed = distance;
      }
      if (elapsed > horizonDays + 7) break;
    }
    if (!target) continue;
    eligiblePredictions += 1;

    const predicted = Number(prior.forward_projected_liquid_position);
    const observed = Number(target.liquid_assets);
    const priorObserved = finite(prior.liquid_assets) ? Number(prior.liquid_assets) : null;
    const predictedDirection = priorObserved === null ? null : Math.sign(predicted - priorObserved);
    const observedDirection = priorObserved === null ? null : Math.sign(observed - priorObserved);
    const signedError = predicted - observed;
    const absolutePercentageError = observed !== 0 ? Math.abs(signedError) / Math.abs(observed) : null;

    observations.push({
      prior_snapshot_id: prior.id,
      validation_snapshot_id: target.id,
      evidence_boundary: target.evidence_boundary,
      horizon_days: horizonDays,
      elapsed_days: Number(targetElapsed.toFixed(2)),
      predicted_liquid_position: predicted,
      observed_liquid_assets: observed,
      absolute_error: Math.abs(signedError),
      signed_error: signedError,
      absolute_percentage_error: absolutePercentageError,
      direction_correct: predictedDirection === null || observedDirection === 0 ? null : predictedDirection === observedDirection,
    });
  }

  const errors = observations.map(x => x.absolute_error);
  const observedMagnitudes = observations.map(x => Math.abs(x.observed_liquid_assets)).filter(x => x > 0);
  const forwardLiquidMae = errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null;
  const bias = observations.length ? observations.reduce((sum, x) => sum + x.signed_error, 0) / observations.length : null;
  const mapeValues = observations.map(x => x.absolute_percentage_error).filter((x): x is number => x !== null && Number.isFinite(x));
  const mape = mapeValues.length ? mapeValues.reduce((a, b) => a + b, 0) / mapeValues.length : null;
  const normalizedMae = errors.length && observedMagnitudes.length ? forwardLiquidMae! / (observedMagnitudes.reduce((a, b) => a + b, 0) / observedMagnitudes.length) : null;
  const directional = observations.filter(x => x.direction_correct !== null);
  const directionalAccuracy = directional.length ? directional.filter(x => x.direction_correct === true).length / directional.length : null;

  return {
    architecture_version: "IRIS_VALIDATION_ENGINE_V2",
    sample_count: rows.length,
    eligible_predictions: eligiblePredictions,
    validated_predictions: observations.length,
    metrics: { forward_liquid_mae: forwardLiquidMae, forward_liquid_directional_accuracy: directionalAccuracy, forward_liquid_bias: bias, mean_absolute_percentage_error: mape, normalized_mae: normalizedMae },
    calibration: observations.length >= 30 ? "usable" : observations.length > 0 ? "initial" : "not_yet_calibrated",
    horizon_days: 30,
    observations: observations.slice(-24),
    limitations: [
      "Validation requires later real evidence snapshots; no future outcome is invented.",
      "Each forecast is scored only against a subsequent observation at or after its declared horizon; this avoids premature validation.",
      "MAPE is unavailable when the observed liquid position is zero and should not be interpreted as a probability.",
      "Forecast validation measures predictive error, not causation, guaranteed account outcomes, or decision quality.",
      "No automatic parameter or model change occurs from this evaluator; adaptation must pass separate governance, calibration, and regression gates.",
      "Sparse snapshots, evidence-boundary changes, provider coverage changes, and regime changes can make historical error non-stationary.",
    ],
    generation: { source: "subsequent real evidence snapshots", financial_values_created: false, fake_mock_or_seeded_data: false, execution_capability: false },
  };
}
