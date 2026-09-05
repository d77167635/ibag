export type GovernanceObservation = {
  absolute_error: number;
  signed_error: number;
  elapsed_days: number;
  horizon_days: number;
};

export type IntelligenceModelGovernance = {
  architecture_version: "IRIS_MODEL_GOVERNANCE_V1";
  state: "insufficient_evidence" | "monitoring" | "stable" | "drift_detected";
  sample_count: number;
  recent_window_size: number;
  metrics: {
    recent_mae: number | null;
    prior_mae: number | null;
    recent_bias: number | null;
    prior_bias: number | null;
    mae_change_pct: number | null;
    bias_change: number | null;
    mean_horizon_error_days: number | null;
  };
  alerts: string[];
  governance: {
    automatic_adaptation: false;
    automatic_parameter_change: false;
    promotion_requires_real_evidence: true;
    regression_gate_required: true;
  };
  limitations: string[];
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * Governance evaluates real validation observations for model-performance drift.
 * It never changes a model and never manufactures an outcome.
 */
export function assessModelGovernance(observations: GovernanceObservation[]): IntelligenceModelGovernance {
  const valid = observations.filter(x => finite(x.absolute_error) && finite(x.signed_error) && finite(x.elapsed_days) && finite(x.horizon_days));
  const recentWindowSize = Math.min(10, Math.floor(valid.length / 2));
  if (valid.length < 4 || recentWindowSize < 2) {
    return {
      architecture_version: "IRIS_MODEL_GOVERNANCE_V1",
      state: "insufficient_evidence",
      sample_count: valid.length,
      recent_window_size: recentWindowSize,
      metrics: { recent_mae: null, prior_mae: null, recent_bias: null, prior_bias: null, mae_change_pct: null, bias_change: null, mean_horizon_error_days: mean(valid.map(x => Math.abs(x.elapsed_days - x.horizon_days))) },
      alerts: ["Not enough subsequent real observations exist to assess model drift."],
      governance: { automatic_adaptation: false, automatic_parameter_change: false, promotion_requires_real_evidence: true, regression_gate_required: true },
      limitations: ["Governance is diagnostic only until sufficient real validation evidence exists.", "Drift detection is heuristic monitoring, not a statistical significance test.", "No model or parameter is changed automatically."]
    };
  }

  const recent = valid.slice(-recentWindowSize);
  const prior = valid.slice(0, -recentWindowSize);
  const recentMae = mean(recent.map(x => x.absolute_error));
  const priorMae = mean(prior.map(x => x.absolute_error));
  const recentBias = mean(recent.map(x => x.signed_error));
  const priorBias = mean(prior.map(x => x.signed_error));
  const maeChangePct = priorMae && priorMae !== 0 && recentMae !== null ? ((recentMae - priorMae) / Math.abs(priorMae)) * 100 : null;
  const biasChange = recentBias !== null && priorBias !== null ? recentBias - priorBias : null;
  const meanHorizonErrorDays = mean(valid.map(x => Math.abs(x.elapsed_days - x.horizon_days)));

  const alerts: string[] = [];
  if (maeChangePct !== null && maeChangePct >= 25) alerts.push("Recent forecast error is materially higher than the prior validation set.");
  if (biasChange !== null && Math.abs(biasChange) >= Math.max(1, Math.abs(priorMae ?? 0) * 0.25)) alerts.push("Forecast error bias has shifted materially between validation periods.");
  if (meanHorizonErrorDays !== null && meanHorizonErrorDays > 14) alerts.push("Validation timing is materially displaced from the declared forecast horizon; calibration should be interpreted cautiously.");

  return {
    architecture_version: "IRIS_MODEL_GOVERNANCE_V1",
    state: alerts.length ? "drift_detected" : valid.length >= 30 ? "stable" : "monitoring",
    sample_count: valid.length,
    recent_window_size: recent.length,
    metrics: { recent_mae: recentMae, prior_mae: priorMae, recent_bias: recentBias, prior_bias: priorBias, mae_change_pct: maeChangePct, bias_change: biasChange, mean_horizon_error_days: meanHorizonErrorDays },
    alerts,
    governance: { automatic_adaptation: false, automatic_parameter_change: false, promotion_requires_real_evidence: true, regression_gate_required: true },
    limitations: [
      "Drift thresholds are deterministic monitoring heuristics, not statistical significance claims.",
      "Provider coverage changes, evidence-boundary changes, sparse observations, and genuine financial regime changes can alter error distributions.",
      "A drift alert does not establish why performance changed or imply that a model is unsafe.",
      "No automatic learning, parameter update, or production promotion occurs from this layer.",
    ],
  };
}
