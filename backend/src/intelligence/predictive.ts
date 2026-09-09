import { computeMultiWindowFlow, type WindowedFlow } from "./temporal.js";
import { averageDailyRate, toCents } from "./exactMoney.js";

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
export async function computeForwardProjection(userId: string, horizonDays = 30, asOf?: string | null, dependencyFlows?: readonly WindowedFlow[]): Promise<PredictiveProjection> {
  if (!Number.isInteger(horizonDays) || horizonDays <= 0) throw new Error("INVALID_PREDICTION_HORIZON");
  const flows = dependencyFlows?.length ? [...dependencyFlows] : await computeMultiWindowFlow(userId, undefined, asOf);
  const usable = flows.filter(flow => flow.economicTxCount > 0);
  const limitations: string[] = [];

  if (!usable.length) {
    return { architecture_version: IRIS_PREDICTIVE_INTELLIGENCE_V1, horizon_days: horizonDays, projected_daily_inflow: 0, projected_daily_outflow: 0, projected_net: 0, model: "multi_window_daily_rate_baseline", evidence_state: "predicted", observation_windows: [], limitations: ["No economic transaction history is available for a forward projection."] };
  }

  const projectedDailyInflow = averageDailyRate(usable.map(flow => ({ cents: toCents(flow.inflow), days: flow.windowDays })));
  const projectedDailyOutflow = averageDailyRate(usable.map(flow => ({ cents: toCents(flow.outflow), days: flow.windowDays })));

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
