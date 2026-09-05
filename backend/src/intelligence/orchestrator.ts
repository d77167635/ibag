import { computeBalanceMetrics, computeCashFlowSafety, computeBalanceHistory, computeDebtTrend } from "../services/intelligence.js";
import { getCanonicalTransactions, computeEconomicCashFlow, computeRoundupProjectionFromTransactions, computeSpendingByDomainFromTransactions, computeCanonicalSpendingHierarchy, computeCanonicalForwardProjection } from "./transactionSemantics.js";
import { computeCanonicalAnomalies } from "./anomalies.js";
import { validateCanonicalIntelligenceInput } from "./integrity.js";
import { getFeatureFlags } from "../services/features.js";
import { supabaseAdmin } from "../config/supabase.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";
import { computeFinancialReasoning } from "./relational.js";
import { buildNarrative, recordExplainabilityTrace } from "./decision.js";
import { buildMaximumIntelligence } from "./maxIntelligence.js";
import { buildEvidenceGraph, verifyProviderLineage } from "./evidenceGraph.js";
import { assessUncertainty } from "./uncertainty.js";
import { buildFinancialStateModel } from "./financialState.js";
import { buildCausalAnalysis } from "./causal.js";
import { buildDecisionGraph } from "./decisionGraph.js";
import { buildDecisionIntelligence } from "./decisionIntelligence.js";
import { buildConsequenceModel } from "./consequence.js";
import { buildOptimizationIntelligence } from "./optimization.js";
import { buildGoalIntelligence, type DeclaredIrisGoal } from "./goals.js";
import { buildIrisAnalysisAtlas } from "./analysisAtlas.js";
import { buildIrisCompositionEngine } from "./compositionEngine.js";
import { assessSourceFidelity } from "./sourceFidelity.js";

/** Canonical intelligence orchestrator for Dashboard and Iris. */
export async function computeFullIntelligence(userId: string) {
  const canonical90Start = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const [canonical, sourceFidelity] = await Promise.all([
    getCanonicalTransactions(userId, canonical90Start),
    assessSourceFidelity(userId),
  ]);
  const integrity = validateCanonicalIntelligenceInput(canonical);
  const current30Start = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const current30 = canonical.filter(tx => tx.posted_date >= current30Start);
  const economicCurrent = computeEconomicCashFlow(current30);
  const roundupProjection = computeRoundupProjectionFromTransactions(canonical);
  const spendingByDomain = computeSpendingByDomainFromTransactions(canonical);
  const spendingHierarchy = computeCanonicalSpendingHierarchy(canonical);
  const prior30 = canonical.filter(tx => tx.posted_date < current30Start);
  const priorEconomic = computeEconomicCashFlow(prior30);
  const netChangePct = priorEconomic.net !== 0 ? ((economicCurrent.net - priorEconomic.net) / Math.abs(priorEconomic.net)) * 100 : null;
  const cashFlow = { ...economicCurrent, netChangePct, windowDays: 30, semantics: "economic_cash_flow_excludes_internal_transfers_and_unknown_movements" };

  const [balances, cashFlowSafety, balanceHistory, debtTrend, anomalies, forwardProjection, debtCost, categoryDrift, multiWindowFlow, reasoning, featureFlags, declaredGoalsResult, providerLineage] = await Promise.all([
    computeBalanceMetrics(userId), computeCashFlowSafety(userId), computeBalanceHistory(userId), computeDebtTrend(userId),
    computeCanonicalAnomalies(userId), computeCanonicalForwardProjection(userId), computeDebtCostIntelligence(userId),
    computeCategoryDrift(userId), computeMultiWindowFlow(userId), computeFinancialReasoning(userId), getFeatureFlags(userId),
    supabaseAdmin.from("iris_user_goals").select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, constraints, preferences").eq("user_id", userId).eq("active", true).order("priority", { ascending: true }),
    verifyProviderLineage(supabaseAdmin, userId),
  ]);

  const declaredGoals = (declaredGoalsResult.data ?? []) as DeclaredIrisGoal[];
  const goalDataLimitations = declaredGoalsResult.error ? ["Persistent user goals could not be loaded; Iris is falling back to evidence-derived objectives."] : [];
  const trajectory = assessTrajectory(multiWindowFlow);
  const narrative = buildNarrative(reasoning, { safeToSpend: cashFlowSafety.safeToSpend, essentialBillsCount: cashFlowSafety.upcomingBills.length, cashFlowNet: cashFlow.net, cashFlowNetChangePct: cashFlow.netChangePct, debtChangePct: debtTrend.changePct, anomalyCount: anomalies.length });
  const maximumIntelligence = buildMaximumIntelligence({ flows: multiWindowFlow, reasoning, safeToSpend: cashFlowSafety.safeToSpend, cashFlowNet: cashFlow.net, cashFlowWindowDays: cashFlow.windowDays, currentLiquidAssets: balances.liquidAssets, forwardProjectionBasis: forwardProjection.basis ?? null });
  const layerMetrics = {
    net_worth: { liquid_assets: balances.liquidAssets, as_of: balances.asOf },
    debt_health: { revolving_debt: balances.revolvingDebt, credit_utilization: balances.creditUtilization, change_pct_30d: debtTrend.changePct, as_of: balances.asOf },
    cash_flow_safety: cashFlowSafety,
    roundup_projection: roundupProjection,
    cash_flow: cashFlow,
    spending_by_domain: spendingByDomain,
    spending_hierarchy: spendingHierarchy,
    balance_history: balanceHistory,
    forward_projection: forwardProjection,
    anomalies,
  };
  const baseResult = { narrative, generated_at: new Date().toISOString(), feature_flags: featureFlags, layer_metrics: layerMetrics, layer_debt_cost: debtCost, layer_temporal: { windows: multiWindowFlow, trajectory }, layer_behavioral: { categoryDrift }, layer_reasoning: reasoning, layer_max_intelligence: maximumIntelligence, provider_lineage: providerLineage };
  const evidenceGraph = buildEvidenceGraph(baseResult);
  const uncertainty = assessUncertainty(evidenceGraph);
  const financialState = buildFinancialStateModel(evidenceGraph, uncertainty);
  const causalAnalysis = buildCausalAnalysis(reasoning, financialState);
  const decisionGraph = buildDecisionGraph(reasoning, financialState, causalAnalysis, evidenceGraph.nodes);
  const decisionIntelligence = buildDecisionIntelligence(reasoning, financialState, causalAnalysis, decisionGraph);
  const consequenceModel = buildConsequenceModel(decisionIntelligence, financialState, reasoning, cashFlow.net, multiWindowFlow.length ? multiWindowFlow.reduce((widest, current) => current.windowDays > widest.windowDays ? current : widest).outflow : null, cashFlow.windowDays);
  const optimizationBase = buildOptimizationIntelligence(decisionIntelligence, consequenceModel, financialState, declaredGoals);
  const optimization = { ...optimizationBase, options: decisionIntelligence.options.map(option => ({ ...option, score: optimizationBase.scores.find(score => score.option_id === option.id)?.total_score ?? null })) };
  const goals = buildGoalIntelligence(financialState, decisionIntelligence, optimizationBase, declaredGoals);
  goals.limitations = [...new Set([...goals.limitations, ...goalDataLimitations])];

  const intelligenceAtlas = buildIrisAnalysisAtlas({
    narrative,
    net_worth: layerMetrics.net_worth,
    debt_health: layerMetrics.debt_health,
    cash_flow_safety: layerMetrics.cash_flow_safety,
    roundup_projection: layerMetrics.roundup_projection,
    cash_flow: layerMetrics.cash_flow,
    spending_by_domain: layerMetrics.spending_by_domain,
    spending_hierarchy: layerMetrics.spending_hierarchy,
    balance_history: layerMetrics.balance_history,
    forward_projection: layerMetrics.forward_projection,
    anomalies: layerMetrics.anomalies,
    category_drift: categoryDrift,
    temporal: baseResult.layer_temporal,
    behavior: baseResult.layer_behavioral,
    reasoning,
    maximum_intelligence: maximumIntelligence,
    evidence_graph: evidenceGraph,
    uncertainty,
    financial_state: financialState,
    causal_analysis: causalAnalysis,
    decision_graph: decisionGraph,
    decision_intelligence: decisionIntelligence,
    consequence_model: consequenceModel,
    optimization_intelligence: optimization,
    goal_intelligence: goals,
    provider_lineage: providerLineage,
  });

  const composition = buildIrisCompositionEngine(canonical, intelligenceAtlas, 48);
  const intelligenceGate = {
    ...sourceFidelity,
    higher_order_conclusions_enabled: sourceFidelity.ready_for_higher_order_intelligence,
    limitation: sourceFidelity.ready_for_higher_order_intelligence ? null : "Higher-order Iris compositions remain evidence-bounded until source completeness and lineage are certified.",
  };
  recordExplainabilityTrace(userId, reasoning).catch(err => console.error("explainability trace failed:", err));
  return { ...baseResult, integrity, source_fidelity: sourceFidelity, intelligence_gate: intelligenceGate, evidence_graph: evidenceGraph, uncertainty, financial_state: financialState, causal_analysis: causalAnalysis, decision_graph: decisionGraph, decision_intelligence: decisionIntelligence, consequence_model: consequenceModel, optimization_intelligence: optimization, goal_intelligence: goals, intelligence_atlas: intelligenceAtlas, intelligence_composition: composition };
}
