import {
  computeBalanceMetrics,
  computeCashFlowSafety,
  computeRoundupProjection,
  computeCashFlow,
  computeSpendingByDomain,
  computeBalanceHistory,
  computeDebtTrend,
  detectAnomalies,
  computeForwardProjection,
} from "../services/intelligence.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";
import { computeFinancialReasoning } from "./relational.js";
import { buildNarrative, recordExplainabilityTrace } from "./decision.js";

/**
 * ORCHESTRATOR — runs every layer and returns one response whose shape
 * mirrors the architecture: each key is a layer, not a flat list of
 * cards. This replaces the single flat handler that used to live inline
 * in routes/dashboard.ts.
 */
export async function computeFullIntelligence(userId: string) {
  const [
    balances,
    cashFlowSafety,
    roundupProjection,
    cashFlow,
    spendingByDomain,
    balanceHistory,
    debtTrend,
    anomalies,
    forwardProjection,
    debtCost,
    categoryDrift,
    multiWindowFlow,
    reasoning,
  ] = await Promise.all([
    computeBalanceMetrics(userId),
    computeCashFlowSafety(userId),
    computeRoundupProjection(userId),
    computeCashFlow(userId),
    computeSpendingByDomain(userId),
    computeBalanceHistory(userId),
    computeDebtTrend(userId),
    detectAnomalies(userId),
    computeForwardProjection(userId),
    computeDebtCostIntelligence(userId),
    computeCategoryDrift(userId),
    computeMultiWindowFlow(userId),
    computeFinancialReasoning(userId),
  ]);

  const trajectory = assessTrajectory(multiWindowFlow);

  const narrative = buildNarrative(reasoning, {
    safeToSpend: cashFlowSafety.safeToSpend,
    essentialBillsCount: cashFlowSafety.upcomingBills.length,
    cashFlowNet: cashFlow.net,
    cashFlowNetChangePct: cashFlow.netChangePct,
    debtChangePct: debtTrend.changePct,
    anomalyCount: anomalies.length,
  });

  // Fire-and-forget — explainability logging should never block or fail
  // the response the user is waiting on.
  recordExplainabilityTrace(userId, reasoning).catch((err) =>
    console.error("explainability trace failed:", err)
  );

  return {
    narrative,
    generated_at: new Date().toISOString(),

    // Layer 1/3/8 — observation-derived calculated metrics & forecasts
    layer_metrics: {
      net_worth: { liquid_assets: balances.liquidAssets, as_of: balances.asOf },
      debt_health: {
        revolving_debt: balances.revolvingDebt,
        credit_utilization: balances.creditUtilization,
        change_pct_30d: debtTrend.changePct,
        as_of: balances.asOf,
      },
      cash_flow_safety: cashFlowSafety,
      roundup_projection: roundupProjection,
      cash_flow: cashFlow,
      spending_by_domain: spendingByDomain,
      balance_history: balanceHistory,
      forward_projection: forwardProjection,
      anomalies,
    },

    // Layer 1 (extended) + 8 — liabilities-derived debt cost, previously null
    layer_debt_cost: debtCost,

    // Layer 3 — multi-window temporal comparison
    layer_temporal: { windows: multiWindowFlow, trajectory },

    // Layer 5/6 — behavioral/pattern drift vs. established baseline
    layer_behavioral: { categoryDrift },

    // Layer 4/7/9/10/11 — relational chain, risk, opportunity, decision
    layer_reasoning: reasoning,
  };
}
