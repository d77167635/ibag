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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Deterministic, evidence-gated synthesis of already observed/calculated outputs. */
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
    pressure_points: pressurePoints,
    opportunities,
    counterfactuals,
    unresolved_questions: [...new Set(input.reasoning.unresolvedQuestions)].slice(0, 10),
    next_best_questions: nextBestQuestions.slice(0, 5),
    provenance: [
      { output: "liquidity", basis: "Connected account balance observations", evidence: input.currentLiquidAssets === null ? "insufficient_evidence" : "observed" },
      { output: "cash_flow", basis: `${input.cashFlowWindowDays}-day classified transaction window`, evidence: input.cashFlowNet === null ? "insufficient_evidence" : "calculated" },
      { output: "trajectory", basis: "Cross-window daily outflow comparison", evidence: populated.length >= 2 ? "calculated" : "insufficient_evidence" },
      { output: "reasoning", basis: "Relational synthesis of calculated and observed findings", evidence: input.reasoning.risks.length || input.reasoning.opportunities.length ? "inferred" : "insufficient_evidence" },
    ],
  };
}
