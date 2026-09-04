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
import { buildMaximumIntelligence } from "./maxIntelligence.js";

/**
 * Canonical intelligence orchestrator. Dashboard and Iris should consume
 * this synthesis rather than independently recomputing the same metrics.
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

  const maximumIntelligence = buildMaximumIntelligence({
    flows: multiWindowFlow,
    reasoning,
    safeToSpend: cashFlowSafety.safeToSpend,
    cashFlowNet: cashFlow.net,
    cashFlowWindowDays: cashFlow.windowDays,
    currentLiquidAssets: balances.liquidAssets,
    forwardProjectionBasis: forwardProjection.basis ?? null,
  });

  recordExplainabilityTrace(userId, reasoning).catch((err) =>
    console.error("explainability trace failed:", err)
  );

  return {
    narrative,
    generated_at: new Date().toISOString(),
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
    layer_debt_cost: debtCost,
    layer_temporal: { windows: multiWindowFlow, trajectory },
    layer_behavioral: { categoryDrift },
    layer_reasoning: reasoning,
    layer_max_intelligence: maximumIntelligence,
  };
}
