import { computeMultiWindowFlow, type WindowedFlow } from "./temporal.js";
import { averageCents, toCents } from "./exactMoney.js";

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

/** Evidence-bound projection using the validated temporal dependency as its source window set. */
export async function computeForwardProjection(
  userId: string,
  horizonDays = 30,
  asOf?: string | null,
  dependencyFlows?: readonly WindowedFlow[],
): Promise<PredictiveProjection> {
  if (!Number.isInteger(horizonDays) || horizonDays <= 0) throw new Error("INVALID_PREDICTION_HORIZON");

  const flows = dependencyFlows?.length ? [...dependencyFlows] : await computeMultiWindowFlow(userId, undefined, asOf);
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

  // Convert each authoritative flow amount to integer cents before aggregation.
  // Division by the window length is performed only after exact cent totals are formed.
  const dailyInflowRates = usable.map(flow => {
    const cents = toCents(flow.inflow);
    return Number(cents) / 100 / flow.windowDays;
  });
  const dailyOutflowRates = usable.map(flow => {
    const cents = toCents(flow.outflow);
    return Number(cents) / 100 / flow.windowDays;
  });

  const projectedDailyInflow = averageCents(usable.map(flow => toCents(flow.inflow))) / usable.reduce((sum, flow) => sum + flow.windowDays, 0) * usable.length;
  const projectedDailyOutflow = averageCents(usable.map(flow => toCents(flow.outflow))) / usable.reduce((sum, flow) => sum + flow.windowDays, 0) * usable.length;
  const fallbackDailyInflow = dailyInflowRates.reduce((sum, rate) => sum + rate, 0) / dailyInflowRates.length;
  const fallbackDailyOutflow = dailyOutflowRates.reduce((sum, rate) => sum + rate, 0) / dailyOutflowRates.length;

  const dailyInflow = Number.isFinite(projectedDailyInflow) ? projectedDailyInflow : fallbackDailyInflow;
  const dailyOutflow = Number.isFinite(projectedDailyOutflow) ? projectedDailyOutflow : fallbackDailyOutflow;

  if (usable.length < 2) limitations.push("Only one observation window contains economic activity; regime stability cannot be assessed.");
  limitations.push("Projection assumes observed average daily flow rates persist through the forecast horizon.");
  limitations.push("This is a model-based prediction, not an observed future event and not a guarantee.");

  return {
    architecture_version: IRIS_PREDICTIVE_INTELLIGENCE_V1,
    horizon_days: horizonDays,
    projected_daily_inflow: dailyInflow,
    projected_daily_outflow: dailyOutflow,
    projected_net: (dailyInflow - dailyOutflow) * horizonDays,
    model: "multi_window_daily_rate_baseline",
    evidence_state: "predicted",
    observation_windows: usable.map(flow => flow.windowDays),
    limitations,
  };
}
