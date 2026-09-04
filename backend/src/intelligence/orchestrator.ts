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
import { supabaseAdmin } from "../config/supabase.js";
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
import { buildDecisionGraph } from "./decisionGraph.js";
import { buildDecisionIntelligence } from "./decisionIntelligence.js";
import { buildConsequenceModel } from "./consequence.js";
import { buildOptimizationIntelligence } from "./optimization.js";
import { buildGoalIntelligence, type DeclaredIrisGoal } from "./goals.js";

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
    declaredGoalsResult,
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
    supabaseAdmin.from("iris_user_goals").select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, constraints, preferences").eq("user_id", userId).eq("active", true).order("priority", { ascending: true }),
  ]);

  const declaredGoals = (declaredGoalsResult.data ?? []) as DeclaredIrisGoal[];
  const goalDataLimitations = declaredGoalsResult.error ? ["Persistent user goals could not be loaded; Iris is falling back to evidence-derived objectives."] : [];

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
  const decisionGraph = buildDecisionGraph(reasoning, financialState, causalAnalysis, evidenceGraph.nodes);
  const decisionIntelligence = buildDecisionIntelligence(reasoning, financialState, causalAnalysis, decisionGraph);
  const consequenceModel = buildConsequenceModel(
    decisionIntelligence,
    financialState,
    reasoning,
    cashFlow.net,
    multiWindowFlow.length ? multiWindowFlow.reduce((widest, current) => current.windowDays > widest.windowDays ? current : widest).outflow : null,
    cashFlow.windowDays,
  );
  const optimization = buildOptimizationIntelligence(decisionIntelligence, consequenceModel, financialState);
  const goals = buildGoalIntelligence(financialState, decisionIntelligence, optimization, declaredGoals);
  goals.limitations = [...new Set([...goals.limitations, ...goalDataLimitations])];

  recordExplainabilityTrace(userId, reasoning).catch((err) =>
    console.error("explainability trace failed:", err)
  );

  return {
    ...baseResult,
    evidence_graph: evidenceGraph,
    uncertainty,
    financial_state: financialState,
    causal_analysis: causalAnalysis,
    decision_graph: decisionGraph,
    decision_intelligence: decisionIntelligence,
    consequence_model: consequenceModel,
    optimization_intelligence: optimization,
    goal_intelligence: goals,
  };
}
