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
  computeSpendingHierarchy,
} from "../services/intelligence.js";
import { getFeatureFlags } from "../services/features.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";
import { computeFinancialReasoning } from "./relational.js";
import { buildNarrative, recordExplainabilityTrace } from "./decision.js";
import { buildMaximumIntelligence } from "./maxIntelligence.js";
import { buildEvidenceGraph } from "./evidenceGraph.js";
import { assessUncertainty } from "./uncertainty.js";
import { buildFinancialStateModel } from "./financialState.js";
import { buildCausalAnalysis } from "./causal.js";

/** Canonical intelligence orchestrator for Dashboard and Iris. */
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
    spendingHierarchy,
    debtCost,
    categoryDrift,
    multiWindowFlow,
    reasoning,
    featureFlags,
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
    computeSpendingHierarchy(userId),
    computeDebtCostIntelligence(userId),
    computeCategoryDrift(userId),
    computeMultiWindowFlow(userId),
    computeFinancialReasoning(userId),
    getFeatureFlags(userId),
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

  const layerMetrics = {
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
    spending_hierarchy: spendingHierarchy,
    balance_history: balanceHistory,
    forward_projection: forwardProjection,
    anomalies,
  };

  const baseResult = {
    narrative,
    generated_at: new Date().toISOString(),
    feature_flags: featureFlags,
    layer_metrics: layerMetrics,
    layer_debt_cost: debtCost,
    layer_temporal: { windows: multiWindowFlow, trajectory },
    layer_behavioral: { categoryDrift },
    layer_reasoning: reasoning,
    layer_max_intelligence: maximumIntelligence,
  };

  const evidenceGraph = buildEvidenceGraph(baseResult);
  const uncertainty = assessUncertainty(evidenceGraph);
  const financialState = buildFinancialStateModel(evidenceGraph, uncertainty);
  const causalAnalysis = buildCausalAnalysis(reasoning, financialState);

  recordExplainabilityTrace(userId, reasoning).catch((err) =>
    console.error("explainability trace failed:", err)
  );

  return {
    ...baseResult,
    evidence_graph: evidenceGraph,
    uncertainty,
    financial_state: financialState,
    causal_analysis: causalAnalysis,
  };
}
