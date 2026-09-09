import { computeMultiWindowFlow } from "./temporal.js";

export const IRIS_PREDICTIVE_INTELLIGENCE_V1 = "IRIS_PREDICTIVE_INTELLIGENCE_V1" as const;

export interface PredictiveProjection {
  architecture_version: typeof IRIS_PREDICTIVE_INTELLIGENCE_V1;
  horizon_days: number;
  projected_daily_inflow: number;
  projected_daily_outflow: number;
  projected_net: number;
  model: "multi_window_daily_rate_baseline";
  evidence_state: "predicted";
  observation_windows: number[];
  limitations: string[];
}

/**
 * Evidence-bound forward projection. It extrapolates observed economic flow
 * rates only; it does not invent future transactions or claim probability.
 */
export async function computeForwardProjection(
  userId: string,
  horizonDays = 30,
  asOf?: string | null,
): Promise<PredictiveProjection> {
  if (!Number.isInteger(horizonDays) || horizonDays <= 0) {
    throw new Error("INVALID_PREDICTION_HORIZON");
  }

  const flows = await computeMultiWindowFlow(userId, undefined, asOf);
  const usable = flows.filter(flow => flow.economicTxCount > 0);
  const limitations: string[] = [];

  if (!usable.length) {
    return {
      architecture_version: IRIS_PREDICTIVE_INTELLIGENCE_V1,
      horizon_days: horizonDays,
      projected_daily_inflow: 0,
      projected_daily_outflow: 0,
      projected_net: 0,
      model: "multi_window_daily_rate_baseline",
      evidence_state: "predicted",
      observation_windows: [],
      limitations: ["No economic transaction history is available for a forward projection."],
    };
  }

  const rates = usable.map(flow => ({
    inflow: flow.inflow / flow.windowDays,
    outflow: flow.outflow / flow.windowDays,
  }));
  const projectedDailyInflow = rates.reduce((sum, rate) => sum + rate.inflow, 0) / rates.length;
  const projectedDailyOutflow = rates.reduce((sum, rate) => sum + rate.outflow, 0) / rates.length;

  if (usable.length < 2) limitations.push("Only one observation window contains economic activity; regime stability cannot be assessed.");
  limitations.push("Projection assumes observed average daily flow rates persist through the forecast horizon.");
  limitations.push("This is a model-based prediction, not an observed future event and not a guarantee.");

  return {
    architecture_version: IRIS_PREDICTIVE_INTELLIGENCE_V1,
    horizon_days: horizonDays,
    projected_daily_inflow: projectedDailyInflow,
    projected_daily_outflow: projectedDailyOutflow,
    projected_net: (projectedDailyInflow - projectedDailyOutflow) * horizonDays,
    model: "multi_window_daily_rate_baseline",
    evidence_state: "predicted",
    observation_windows: usable.map(flow => flow.windowDays),
    limitations,
  };
}
