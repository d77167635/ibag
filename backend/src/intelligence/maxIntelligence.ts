import type { Evidence, RiskItem, OpportunityItem } from "./types.js";
import type { FinancialReasoning } from "./relational.js";
import type { WindowedFlow } from "./temporal.js";

export interface MaximumIntelligence {
  architecture_version: "MAX_INTELLIGENCE_V1";
  evidence: {
    coverage_score: number;
    coverage_label: "strong" | "moderate" | "limited" | "insufficient";
    observed_windows_days: number[];
    windows_with_transactions: number;
    strongest_window_days: number | null;
    limitations: string[];
  };
  confidence: {
    analytical_readiness: number;
    label: "high" | "moderate" | "limited" | "insufficient";
    basis: string;
    not_probability: true;
  };
  trajectory: {
    direction: string;
    short_daily_outflow: number | null;
    long_daily_outflow: number | null;
    change_ratio: number | null;
    interpretation: string;
  };
  statistics: {
    sample_size: number;
    observed_daily_outflow_rates: number[];
    mean_daily_outflow: number | null;
    median_daily_outflow: number | null;
    mad_daily_outflow: number | null;
    standard_deviation_daily_outflow: number | null;
    coefficient_of_variation: number | null;
    lower_quartile_daily_outflow: number | null;
    upper_quartile_daily_outflow: number | null;
    lower_reference: number | null;
    upper_reference: number | null;
    adaptive_outlier_threshold: number | null;
    reference_method: "median_mad" | "insufficient_evidence";
    interpretation: string;
  };
  pressure_points: Array<{ key: string; severity: string; statement: string; evidence: Evidence }>;
  opportunities: Array<{ key: string; statement: string; evidence: Evidence }>;
  counterfactuals: Array<{
    scenario: string;
    change: string;
    modeled_net_change: number | null;
    horizon_days: number;
    evidence: Evidence;
    basis: string;
  }>;
  unresolved_questions: string[];
  next_best_questions: string[];
  provenance: Array<{ output: string; basis: string; evidence: Evidence }>;
}

function labelForScore(score: number): MaximumIntelligence["confidence"]["label"] {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "moderate";
  if (score >= 0.35) return "limited";
  return "insufficient";
}
function coverageLabel(score: number): MaximumIntelligence["evidence"]["coverage_label"] {
  if (score >= 0.8) return "strong";
  if (score >= 0.6) return "moderate";
  if (score >= 0.35) return "limited";
  return "insufficient";
}
function round(value: number): number { return Math.round(value * 100) / 100; }
function median(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[mid] : (ordered[mid - 1] + ordered[mid]) / 2;
}
function quantile(values: number[], probability: number): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  if (ordered.length === 1) return ordered[0];
  const position = (ordered.length - 1) * probability;
  const lower = Math.floor(position), upper = Math.ceil(position);
  if (lower === upper) return ordered[lower];
  return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower);
}
function robustStatistics(rates: number[]) {
  const med = median(rates);
  if (med === null) return {
    sampleSize: 0, mean: null, median: null, mad: null, standardDeviation: null, coefficientOfVariation: null,
    q1: null, q3: null, lower: null, upper: null, adaptiveThreshold: null,
    method: "insufficient_evidence" as const,
    interpretation: "There is not enough observed-window evidence to establish a robust daily outflow reference."
  };
  const mean = rates.reduce((sum, value) => sum + value, 0) / rates.length;
  const variance = rates.length > 1 ? rates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (rates.length - 1) : null;
  const standardDeviation = variance === null ? null : Math.sqrt(variance);
  const mad = median(rates.map(rate => Math.abs(rate - med)));
  const q1 = quantile(rates, 0.25);
  const q3 = quantile(rates, 0.75);
  if (mad === null || q1 === null || q3 === null) return {
    sampleSize: rates.length, mean: round(mean), median: round(med), mad: null,
    standardDeviation: standardDeviation === null ? null : round(standardDeviation),
    coefficientOfVariation: mean !== 0 && standardDeviation !== null ? round(standardDeviation / Math.abs(mean)) : null,
    q1: q1 === null ? null : round(q1), q3: q3 === null ? null : round(q3), lower: null, upper: null, adaptiveThreshold: null,
    method: "insufficient_evidence" as const,
    interpretation: "A central reference exists, but dispersion cannot be established robustly from the available windows."
  };
  const scale = mad === 0 ? Math.max(Math.abs(med) * 0.1, 0.01) : mad;
  // The threshold is adaptive to observed dispersion. It is a descriptive
  // screening rule, not a probability cutoff or a claim about future behavior.
  const adaptiveThreshold = 3 * scale;
  return {
    sampleSize: rates.length,
    mean: round(mean), median: round(med), mad: round(mad),
    standardDeviation: standardDeviation === null ? null : round(standardDeviation),
    coefficientOfVariation: mean !== 0 && standardDeviation !== null ? round(standardDeviation / Math.abs(mean)) : null,
    q1: round(q1), q3: round(q3), lower: round(Math.max(0, med - adaptiveThreshold)), upper: round(med + adaptiveThreshold),
    adaptiveThreshold: round(adaptiveThreshold), method: "median_mad" as const,
    interpretation: "Reference and screening thresholds adapt to the observed median absolute deviation; they describe the user's observed history and are not forecasts or probability intervals."
  };
}

/** Deterministic, evidence-gated synthesis of observed/calculated outputs. */
export function buildMaximumIntelligence(input: {
  flows: WindowedFlow[];
  reasoning: FinancialReasoning;
  safeToSpend: number | null;
  cashFlowNet: number | null;
  cashFlowWindowDays: number;
  currentLiquidAssets: number | null;
  forwardProjectionBasis: string | null;
}): MaximumIntelligence {
  const populated = input.flows.filter((f) => f.txCount > 0).sort((a, b) => a.windowDays - b.windowDays);
  const observedWindows = input.flows.map((f) => f.windowDays);
  const strongest = populated.length ? populated[populated.length - 1] : null;
  const rates = populated.map(flow => flow.outflow / flow.windowDays).filter(Number.isFinite);
  const statistics = robustStatistics(rates);

  const dimensions = [
    input.currentLiquidAssets !== null,
    input.cashFlowNet !== null,
    input.safeToSpend !== null,
    populated.length >= 2,
    input.reasoning.risks.length + input.reasoning.opportunities.length > 0,
    Boolean(input.forwardProjectionBasis),
  ];
  const coverageScore = round(dimensions.filter(Boolean).length / dimensions.length);
  const limitations = [...input.reasoning.unresolvedQuestions];
  if (populated.length < 2) limitations.push("Multiple observed transaction windows are not available, so trajectory confidence is limited.");
  if (input.safeToSpend === null) limitations.push("Safe-to-spend cannot be established from the available account and obligation evidence.");
  if (!input.forwardProjectionBasis) limitations.push("No forward-model basis was returned, so future-state projections remain unavailable.");

  let analyticalReadiness = coverageScore;
  if (input.reasoning.unresolvedQuestions.length > 2) analyticalReadiness = Math.max(0, analyticalReadiness - 0.15);
  if (input.reasoning.risks.some((r) => r.evidence === "inferred")) analyticalReadiness = Math.max(0, analyticalReadiness - 0.05);
  analyticalReadiness = round(analyticalReadiness);

  const short = populated[0] ?? null;
  const long = populated[populated.length - 1] ?? null;
  const shortRate = short ? short.outflow / short.windowDays : null;
  const longRate = long ? long.outflow / long.windowDays : null;
  const changeRatio = shortRate !== null && longRate !== null && longRate !== 0 ? round((shortRate - longRate) / longRate) : null;
  const direction = populated.length < 2 ? "insufficient_evidence" : changeRatio !== null && changeRatio > 0.15 ? "accelerating" : changeRatio !== null && changeRatio < -0.15 ? "decelerating" : "stable";
  const interpretation = direction === "accelerating"
    ? "Recent daily outflow is materially above the longest available baseline window."
    : direction === "decelerating"
      ? "Recent daily outflow is materially below the longest available baseline window."
      : direction === "stable"
        ? "Recent daily outflow is not materially different from the available longer baseline."
        : "There is not enough multi-window evidence to distinguish a short-term change from a durable trend.";

  const horizon = Math.max(1, input.cashFlowWindowDays);
  const baselineNet = input.cashFlowNet;
  const counterfactuals = baselineNet === null
    ? []
    : [-0.2, -0.1, 0.1, 0.2].map((delta) => ({
        scenario: delta < 0 ? "Lower outflow" : "Higher outflow",
        change: `${Math.abs(delta * 100).toFixed(0)}% ${delta < 0 ? "reduction" : "increase"} in observed-window outflow`,
        modeled_net_change: round(-((long?.outflow ?? 0) * delta)),
        horizon_days: horizon,
        evidence: "calculated" as Evidence,
        basis: "Illustrative counterfactual applied to the observed outflow baseline; it is not a prediction and does not assume behavior will change.",
      }));

  const pressurePoints = [...input.reasoning.risks]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 } as Record<string, number>)[b.severity] - ({ high: 3, medium: 2, low: 1 } as Record<string, number>)[a.severity])
    .slice(0, 8)
    .map((r: RiskItem) => ({ key: r.key, severity: r.severity, statement: r.statement, evidence: r.evidence }));
  const opportunities = input.reasoning.opportunities.slice(0, 8).map((o: OpportunityItem) => ({ key: o.key, statement: o.statement, evidence: o.evidence }));

  const nextBestQuestions: string[] = [];
  if (populated.length < 3) nextBestQuestions.push("Do I have enough historical transaction coverage to establish a durable baseline?");
  if (input.safeToSpend === null) nextBestQuestions.push("Which connected accounts or upcoming obligations are missing from the current safety calculation?");
  if (input.currentLiquidAssets === null) nextBestQuestions.push("Which connected balance observations are required before liquidity can be stated?");
  if (input.reasoning.risks.length > 0) nextBestQuestions.push("Which underlying observed transactions support the highest-severity finding?");
  if (nextBestQuestions.length === 0) nextBestQuestions.push("Which observed change is most important to inspect next?");

  return {
    architecture_version: "MAX_INTELLIGENCE_V1",
    evidence: {
      coverage_score: coverageScore,
      coverage_label: coverageLabel(coverageScore),
      observed_windows_days: observedWindows,
      windows_with_transactions: populated.length,
      strongest_window_days: strongest?.windowDays ?? null,
      limitations: [...new Set(limitations)].slice(0, 10),
    },
    confidence: {
      analytical_readiness: analyticalReadiness,
      label: labelForScore(analyticalReadiness),
      basis: "Readiness reflects completeness of available evidence and cross-window support; it is not a probability that a conclusion is true.",
      not_probability: true,
    },
    trajectory: {
      direction,
      short_daily_outflow: shortRate === null ? null : round(shortRate),
      long_daily_outflow: longRate === null ? null : round(longRate),
      change_ratio: changeRatio,
      interpretation,
    },
    statistics: {
      sample_size: statistics.sampleSize,
      observed_daily_outflow_rates: rates.map(round),
      mean_daily_outflow: statistics.mean,
      median_daily_outflow: statistics.median,
      mad_daily_outflow: statistics.mad,
      standard_deviation_daily_outflow: statistics.standardDeviation,
      coefficient_of_variation: statistics.coefficientOfVariation,
      lower_quartile_daily_outflow: statistics.q1,
      upper_quartile_daily_outflow: statistics.q3,
      lower_reference: statistics.lower,
      upper_reference: statistics.upper,
      adaptive_outlier_threshold: statistics.adaptiveThreshold,
      reference_method: statistics.method,
      interpretation: statistics.interpretation,
    },
    pressure_points: pressurePoints,
    opportunities,
    counterfactuals,
    unresolved_questions: [...new Set(input.reasoning.unresolvedQuestions)].slice(0, 10),
    next_best_questions: nextBestQuestions.slice(0, 5),
    provenance: [
      { output: "liquidity", basis: "Connected account balance observations", evidence: input.currentLiquidAssets === null ? "insufficient_evidence" : "observed" },
      { output: "cash_flow", basis: `${input.cashFlowWindowDays}-day classified transaction window`, evidence: input.cashFlowNet === null ? "insufficient_evidence" : "calculated" },
      { output: "trajectory", basis: "Cross-window daily outflow comparison", evidence: populated.length >= 2 ? "calculated" : "insufficient_evidence" },
      { output: "statistics", basis: "Adaptive median/MAD reference with quartiles and dispersion over observed daily outflow rates", evidence: rates.length >= 2 ? "calculated" : "insufficient_evidence" },
      { output: "reasoning", basis: "Relational synthesis of calculated and observed findings", evidence: input.reasoning.risks.length || input.reasoning.opportunities.length ? "inferred" : "insufficient_evidence" },
    ],
  };
}
