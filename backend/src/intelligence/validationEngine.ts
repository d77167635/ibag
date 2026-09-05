import { supabaseAdmin } from "../config/supabase.js";

export type IntelligenceValidation = {
  architecture_version: "IRIS_VALIDATION_ENGINE_V5";
  sample_count: number;
  eligible_predictions: number;
  validated_predictions: number;
  metrics: { forward_liquid_mae: number | null; forward_liquid_directional_accuracy: number | null; forward_liquid_bias: number | null; mean_absolute_percentage_error: number | null; normalized_mae: number | null };
  calibration: "not_yet_calibrated" | "initial" | "usable";
  horizon_days: number | null;
  observations: Array<{ prior_snapshot_id: string; validation_snapshot_id: string; evidence_boundary: string; horizon_days: number; elapsed_days: number; predicted_liquid_position: number; observed_liquid_assets: number; absolute_error: number; signed_error: number; absolute_percentage_error: number | null; direction_correct: boolean | null }>;
  limitations: string[];
  generation: { source: "subsequent real evidence snapshots"; financial_values_created: false; fake_mock_or_seeded_data: false; execution_capability: false };
};
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function daysBetween(a: string, b: string): number { return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000; }
function horizonFrom(row: any): number | null { const value = Number(row?.metadata?.forecast_horizon_days); return Number.isFinite(value) && value > 0 ? value : null; }

/**
 * Validates each forecast against one subsequent real evidence snapshot at or
 * beyond its declared horizon. A validation target cannot be reused by another
 * prediction in the same evaluation run; this prevents dense snapshot schedules
 * from making one real observation appear to validate many overlapping forecasts.
 */
export async function evaluateIntelligenceValidation(userId: string): Promise<IntelligenceValidation> {
  const { data, error } = await supabaseAdmin.from("iris_intelligence_snapshots").select("id, generated_at, evidence_boundary, liquid_assets, forward_projected_liquid_position, metadata").eq("user_id", userId).order("generated_at", { ascending: true }).limit(500);
  if (error) throw error;
  const rows = (data ?? []).filter(row => row.evidence_boundary);
  const observations: IntelligenceValidation["observations"] = [];
  const usedTargetIds = new Set<string>();
  let eligiblePredictions = 0;
  const horizonSet = new Set<number>();

  for (let i = 0; i < rows.length; i += 1) {
    const prior = rows[i];
    if (!finite(prior.forward_projected_liquid_position)) continue;
    const horizonDays = horizonFrom(prior);
    if (horizonDays === null) continue;
    horizonSet.add(horizonDays);
    let target: any = null;
    let targetElapsed = Number.POSITIVE_INFINITY;
    for (let j = i + 1; j < rows.length; j += 1) {
      const candidate = rows[j];
      if (usedTargetIds.has(candidate.id) || !finite(candidate.liquid_assets) || !candidate.evidence_boundary) continue;
      const elapsed = daysBetween(prior.evidence_boundary, candidate.evidence_boundary);
      if (!Number.isFinite(elapsed) || elapsed < horizonDays) continue;
      const distance = Math.abs(elapsed - horizonDays);
      if (distance < targetElapsed) { target = candidate; targetElapsed = distance; }
    }
    if (!target) continue;
    eligiblePredictions += 1;
    usedTargetIds.add(target.id);
    const predicted = Number(prior.forward_projected_liquid_position);
    const observed = Number(target.liquid_assets);
    const priorObserved = finite(prior.liquid_assets) ? Number(prior.liquid_assets) : null;
    const predictedDirection = priorObserved === null ? null : Math.sign(predicted - priorObserved);
    const observedDirection = priorObserved === null ? null : Math.sign(observed - priorObserved);
    const signedError = predicted - observed;
    const absolutePercentageError = observed !== 0 ? Math.abs(signedError) / Math.abs(observed) : null;
    observations.push({ prior_snapshot_id: prior.id, validation_snapshot_id: target.id, evidence_boundary: target.evidence_boundary, horizon_days: Math.round(horizonDays), elapsed_days: Number(targetElapsed.toFixed(2)), predicted_liquid_position: predicted, observed_liquid_assets: observed, absolute_error: Math.abs(signedError), signed_error: signedError, absolute_percentage_error: absolutePercentageError, direction_correct: predictedDirection === null || observedDirection === 0 ? null : predictedDirection === observedDirection });
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
  const horizonValues = [...horizonSet];
  return {
    architecture_version: "IRIS_VALIDATION_ENGINE_V5", sample_count: rows.length, eligible_predictions: eligiblePredictions, validated_predictions: observations.length,
    metrics: { forward_liquid_mae: forwardLiquidMae, forward_liquid_directional_accuracy: directionalAccuracy, forward_liquid_bias: bias, mean_absolute_percentage_error: mape, normalized_mae: normalizedMae },
    calibration: observations.length >= 30 ? "usable" : observations.length > 0 ? "initial" : "not_yet_calibrated", horizon_days: horizonValues.length === 1 ? horizonValues[0] : null, observations: observations.slice(-24),
    limitations: [
      "Validation requires later real evidence snapshots; no future outcome is invented.",
      "Predictions without explicit forecast-horizon metadata are excluded.",
      "A validation target is used at most once per evaluation run to reduce overlapping-forecast reuse bias.",
      "Each forecast is scored only against a subsequent observation at or after its declared horizon; premature observations are excluded.",
      "The closest eligible unused later observation is selected when snapshots are sparse; elapsed horizon is retained.",
      "Evidence-boundary changes and provider coverage changes can create temporal discontinuities; this evaluator does not infer continuity across them.",
      "MAPE is unavailable when the observed liquid position is zero and is not a probability.",
      "Forecast validation measures predictive error, not causation, guaranteed outcomes, or decision quality.",
      "No automatic model or parameter change occurs from this evaluator.",
      "The calibration label is sample-size based and is not a statistical probability-calibration claim.",
      horizonValues.length > 1 ? "Multiple forecast horizons are present; aggregate metrics should not be interpreted as a single-horizon calibration estimate." : "",
    ].filter(Boolean),
    generation: { source: "subsequent real evidence snapshots", financial_values_created: false, fake_mock_or_seeded_data: false, execution_capability: false },
  };
}
