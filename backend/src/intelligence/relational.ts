import {
  computeBalanceMetrics,
  computeCashFlowSafety,
  computeCashFlow,
  computeDebtTrend,
  computeRoundupProjection,
  detectAnomalies,
} from "../services/intelligence.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";
import type { Evidence, RiskItem, OpportunityItem } from "./types.js";

/**
 * LAYER 4/7/9/10 — RELATIONAL, CAUSAL-EVIDENCE, RISK & OPPORTUNITY
 *
 * This is the layer that did not exist at all before this rebuild. Every
 * function in metrics.ts computes one thing from one source. This module
 * is the first place those outputs — now including liabilities and
 * behavioral drift, both new this pass — get reasoned about TOGETHER:
 * outflow -> liquidity -> utilization -> debt cost -> future obligations.
 *
 * Every risk/opportunity carries an `evidence` tag. Where the data
 * genuinely cannot support a causal claim, that is asserted explicitly
 * via `unresolvedQuestions` rather than silently omitted — the
 * insufficient_evidence state is a first-class output, not a gap.
 */

export interface FinancialReasoning {
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  relationalChain: string[];
  unresolvedQuestions: string[];
  priorityFocus: { key: string; reason: string } | null;
  generatedAt: string;
}

const severityRank = { high: 3, medium: 2, low: 1 } as const;

export async function computeFinancialReasoning(userId: string): Promise<FinancialReasoning> {
  const [balances, cashSafety, cashFlow, debtTrend, roundup, anomalies, debtCost, drift, multiWindow] =
    await Promise.all([
      computeBalanceMetrics(userId),
      computeCashFlowSafety(userId),
      computeCashFlow(userId),
      computeDebtTrend(userId),
      computeRoundupProjection(userId),
      detectAnomalies(userId),
      computeDebtCostIntelligence(userId),
      computeCategoryDrift(userId),
      computeMultiWindowFlow(userId),
    ]);

  const trajectory = assessTrajectory(multiWindow);

  const risks: RiskItem[] = [];
  const opportunities: OpportunityItem[] = [];
  const chain: string[] = [];
  const unresolved: string[] = [];

  // --- Relational chain ---
  if (cashFlow.net !== null && balances.liquidAssets !== null) {
    chain.push(
      cashFlow.net < 0
        ? `Net cash movement over the last ${cashFlow.windowDays} days is negative (${cashFlow.net.toFixed(
            2
          )}), drawing down liquid assets currently at ${balances.liquidAssets.toFixed(2)}.`
        : `Net cash movement over the last ${cashFlow.windowDays} days is positive (${cashFlow.net.toFixed(
            2
          )}), building liquid assets currently at ${balances.liquidAssets.toFixed(2)}.`
    );
  }

  if (debtTrend.changePct !== null && balances.creditUtilization !== null) {
    chain.push(
      `Revolving debt moved ${debtTrend.changePct >= 0 ? "up" : "down"} ${Math.abs(debtTrend.changePct).toFixed(
        0
      )}% over the trend window, alongside average credit utilization of ${(
        balances.creditUtilization * 100
      ).toFixed(0)}%.`
    );
  }

  if (debtCost.evidence === "calculated" && debtCost.estimatedMonthlyInterestCost !== null) {
    chain.push(
      `At the current balance-weighted APR of ${debtCost.weightedAvgApr!.toFixed(
        1
      )}%, carrying this revolving balance costs an estimated ${debtCost.estimatedMonthlyInterestCost.toFixed(
        2
      )} per month in interest — this is a simple non-compounded approximation.`
    );
  } else {
    unresolved.push(debtCost.basis);
  }

  if (trajectory.direction === "accelerating") {
    chain.push(
      `Spending pace is accelerating: the shortest available window's daily outflow rate is meaningfully above the longer-window baseline rate.`
    );
  } else if (trajectory.direction === "insufficient_evidence") {
    unresolved.push("Not enough transaction history across multiple time windows to assess whether spending pace is accelerating or decelerating.");
  }

  if (cashFlow.net !== null && cashFlow.net < 0 && debtTrend.changePct !== null && debtTrend.changePct > 0) {
    unresolved.push(
      "Cannot determine whether the debt increase is a direct result of negative cash flow or a separate, coincidentally overlapping factor — both are only known to move in the same period, not causally linked, based on available data."
    );
  }

  // --- Risks ---
  if (cashSafety.safeToSpend !== null && cashSafety.safeToSpend < 0) {
    risks.push({
      key: "negative_safe_to_spend",
      severity: "high",
      evidence: "calculated",
      statement: `Safe-to-spend is negative (${cashSafety.safeToSpend.toFixed(
        2
      )}) — known essential bills due within ${cashSafety.horizonDays} days exceed current available balance.`,
      supportingMetrics: { safeToSpend: cashSafety.safeToSpend, essentialBillsTotal: cashSafety.essentialBillsTotal },
    });
  }

  if (cashSafety.billCollisions.length > 0) {
    risks.push({
      key: "bill_collision",
      severity: "medium",
      evidence: "observed",
      statement: `${cashSafety.billCollisions.length} window(s) where 2+ essential bills are due within a few days of each other.`,
      supportingMetrics: { collisionCount: cashSafety.billCollisions.length },
    });
  }

  if (debtTrend.changePct !== null && debtTrend.changePct > 20) {
    const severity = debtTrend.changePct > 100 ? "high" : debtTrend.changePct > 50 ? "medium" : "low";
    risks.push({
      key: "debt_acceleration",
      severity,
      evidence: "calculated",
      statement: `Revolving debt increased ${debtTrend.changePct.toFixed(0)}% over the trend window${
        balances.creditUtilization !== null
          ? `, with average utilization at ${(balances.creditUtilization * 100).toFixed(0)}%`
          : ""
      }.`,
      supportingMetrics: { debtChangePct: debtTrend.changePct, creditUtilization: balances.creditUtilization },
    });
  }

  if (debtCost.evidence === "calculated" && debtCost.minimumPaymentTotal !== null && cashSafety.safeToSpend !== null) {
    if (debtCost.minimumPaymentTotal > cashSafety.safeToSpend && cashSafety.safeToSpend >= 0) {
      risks.push({
        key: "minimum_payment_exceeds_safe_to_spend",
        severity: "high",
        evidence: "calculated",
        statement: `Total minimum payments due (${debtCost.minimumPaymentTotal.toFixed(
          2
        )}) exceed the current safe-to-spend amount (${cashSafety.safeToSpend.toFixed(2)}).`,
        supportingMetrics: { minimumPaymentTotal: debtCost.minimumPaymentTotal, safeToSpend: cashSafety.safeToSpend },
      });
    }
  }

  const significantDrift = drift.filter((d) => d.significant && d.deviationPct > 0);
  if (significantDrift.length > 0) {
    const top = significantDrift[0];
    risks.push({
      key: "category_spending_drift",
      severity: significantDrift.length > 2 ? "medium" : "low",
      evidence: "calculated",
      statement: `${top.subdomainLabel} spending is running ${top.deviationPct.toFixed(
        0
      )}% above its established baseline (based on ${top.baselineTransactionCount} prior transactions), and ${
        significantDrift.length - 1
      } other categor${significantDrift.length - 1 === 1 ? "y shows" : "ies show"} similar drift.`,
      supportingMetrics: { categoriesAffected: significantDrift.length, topCategory: top.subdomainLabel, topDeviationPct: top.deviationPct },
    });
  }

  if (cashFlow.net !== null && cashFlow.netChangePct !== null && cashFlow.net < 0 && cashFlow.netChangePct < -20) {
    risks.push({
      key: "cash_flow_deterioration",
      severity: "medium",
      evidence: "calculated",
      statement: `Net cash flow is negative and worsened ${Math.abs(cashFlow.netChangePct).toFixed(
        0
      )}% versus the prior ${cashFlow.windowDays}-day period.`,
      supportingMetrics: { net: cashFlow.net, netChangePct: cashFlow.netChangePct },
    });
  }

  // --- Opportunities ---
  if (roundup.projected !== null && roundup.projected > 0) {
    opportunities.push({
      key: "roundup_accrual",
      evidence: "calculated",
      statement: `At the current trailing pace, round-ups are projected to accrue ${roundup.projected.toFixed(
        2
      )} over the next ${roundup.projectDays} days (basis: ${roundup.basisDays} days of history).`,
      supportingMetrics: { dailyRate: roundup.dailyRate, basisDays: roundup.basisDays },
    });
  }

  if (anomalies.length > 0) {
    opportunities.push({
      key: "review_anomalies",
      evidence: "observed",
      statement: `${anomalies.length} transaction${
        anomalies.length === 1 ? " is" : "s are"
      } meaningfully above that merchant's own typical amount — reviewing these may surface avoidable or mistaken spend.`,
      supportingMetrics: { anomalyCount: anomalies.length },
    });
  }

  const decliningDrift = drift.filter((d) => d.significant && d.deviationPct < 0);
  if (decliningDrift.length > 0) {
    opportunities.push({
      key: "sustained_reduction",
      evidence: "calculated",
      statement: `${decliningDrift[0].subdomainLabel} spending is running ${Math.abs(
        decliningDrift[0].deviationPct
      ).toFixed(0)}% below its established baseline — this is holding, not a one-off.`,
      supportingMetrics: { category: decliningDrift[0].subdomainLabel, deviationPct: decliningDrift[0].deviationPct },
    });
  }

  // --- Decision: rank risks, pick top ---
  const priorityFocus = risks.length
    ? risks.reduce((top, r) => (severityRank[r.severity] > severityRank[top.severity] ? r : top))
    : null;

  return {
    risks,
    opportunities,
    relationalChain: chain,
    unresolvedQuestions: unresolved,
    priorityFocus: priorityFocus ? { key: priorityFocus.key, reason: priorityFocus.statement } : null,
    generatedAt: new Date().toISOString(),
  };
}
