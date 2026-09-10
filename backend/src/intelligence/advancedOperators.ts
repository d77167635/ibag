import { computeBalanceMetrics, computeCashFlowSafety, computeDebtTrend } from "../services/intelligence.js";
import { supabaseAdmin } from "../config/supabase.js";
import { getCertifiedEvidenceBoundary } from "./certifiedEvidenceBoundary.js";
import { computeCanonicalAnomalies } from "./anomalies.js";
import { computeDebtCostIntelligence } from "./liabilities.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeEconomicCashFlow, computeCanonicalWindowFlows, getCanonicalTransactions } from "./transactionSemantics.js";
import { buildEvidenceGraph } from "./evidenceGraph.js";
import { assessUncertainty } from "./uncertainty.js";
import { buildFinancialStateModel } from "./financialState.js";
import { buildCausalAnalysis } from "./causal.js";
import { buildDecisionGraph } from "./decisionGraph.js";
import { buildDecisionIntelligence } from "./decisionIntelligence.js";
import { buildConsequenceModel } from "./consequence.js";
import { buildOptimizationIntelligence } from "./optimization.js";
import { buildCounterfactualIntelligence } from "./counterfactual.js";
import type { DeclaredIrisGoal } from "./goals.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";
import { dependencyResult } from "./capabilityExecutionContext.js";

export const GOVERNED_ADVANCED_OPERATOR_VERSION = "1.0.0";

type Envelope<T> = {
  capability_id: string;
  operator_id: string;
  version: string;
  evidence_state: "CALCULATED" | "INFERRED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE";
  evidence_boundary: string | null;
  result: T;
  dependency_inputs?: string[];
};

type WindowFlow = {
  windowDays: number;
  inflow: number;
  outflow: number;
  net: number;
  purchaseTotal: number;
  debtPaymentTotal: number;
  txCount: number;
  economicTxCount: number;
};

async function foundation(userId: string, asOf: string | null) {
  const [balances, safety, debtTrend, anomalies, debtCost, transactions, reasoning] = await Promise.all([
    computeBalanceMetrics(userId),
    computeCashFlowSafety(userId),
    computeDebtTrend(userId),
    computeCanonicalAnomalies(userId, 30, asOf),
    computeDebtCostIntelligence(userId),
    getCanonicalTransactions(userId),
    computeFinancialReasoning(userId, asOf),
  ]);
  const windows = computeCanonicalWindowFlows(transactions, [30, 60, 90], asOf) as WindowFlow[];
  const trajectory = assessTrajectory(windows);
  const cashFlow = { ...computeEconomicCashFlow(transactions), evidence_boundary: asOf };
  const graph = buildEvidenceGraph({
    layer_metrics: {
      net_worth: { liquid_assets: balances.liquidAssets, as_of: balances.asOf },
      debt_health: { revolving_debt: balances.revolvingDebt, credit_utilization: balances.creditUtilization, change_pct_30d: debtTrend.changePct, as_of: balances.asOf },
      cash_flow_safety: safety,
      cash_flow: cashFlow,
      anomalies,
    },
    layer_temporal: { windows, trajectory },
    layer_reasoning: reasoning,
    layer_debt_cost: debtCost,
  });
  const uncertainty = assessUncertainty(graph);
  const state = buildFinancialStateModel(graph, uncertainty);
  return { balances, safety, debtTrend, anomalies, debtCost, windows, trajectory, reasoning, graph, state };
}

function assessTrajectory(windows: readonly WindowFlow[]) {
  if (windows.length < 2) return { status: "insufficient_evidence", direction: null, changePct: null, basisWindows: windows.map(w => w.windowDays) };
  const shortest = windows[0];
  const widest = windows[windows.length - 1];
  const shorterRate = shortest.net / Math.max(1, shortest.windowDays);
  const widerRate = widest.net / Math.max(1, widest.windowDays);
  const delta = shorterRate - widerRate;
  return { status: "calculated", direction: delta > 0 ? "improving" : delta < 0 ? "deteriorating" : "stable", changePct: widerRate !== 0 ? (delta / Math.abs(widerRate)) * 100 : null, basisWindows: windows.map(w => w.windowDays) };
}

async function boundary(userId: string, context?: CapabilityExecutionContext) { return context?.evidenceBoundary ?? getCertifiedEvidenceBoundary(userId); }

function deps(context?: CapabilityExecutionContext): string[] { return Object.keys(context?.dependencyOutputs ?? {}); }

export async function executeCausalOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context);
  const base = await foundation(userId, asOf);
  const upstreamRelationship = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "relationship");
  const upstreamAnalysis = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "analysis");
  const result = buildCausalAnalysis(upstreamRelationship ?? base.reasoning, base.state);
  const dependencyInputs = ["relationship", "analysis"].filter(id => Boolean(context?.dependencyOutputs[id]));
  return { capability_id: "causal", operator_id: "causal", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.hypotheses.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...result, upstream_analysis: upstreamAnalysis ?? null, composed_from: dependencyInputs } };
}

export async function executeDecisionOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context);
  const base = await foundation(userId, asOf);
  const upstreamCausal = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "causal");
  const causal = upstreamCausal ?? buildCausalAnalysis(base.reasoning, base.state);
  const graph = buildDecisionGraph(base.reasoning, base.state, causal, base.graph.nodes);
  const result = buildDecisionIntelligence(base.reasoning, base.state, causal, graph);
  const dependencyInputs = ["causal", "predictive", "scenario"].filter(id => Boolean(context?.dependencyOutputs[id]));
  const upstreamPredictive = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "predictive");
  const upstreamScenario = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "scenario");
  return { capability_id: "decision", operator_id: "decision", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.decision_ready ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { causal_analysis: causal, decision_graph: graph, decision_intelligence: result, upstream_predictive: upstreamPredictive ?? null, upstream_scenario: upstreamScenario ?? null, composed_from: dependencyInputs } };
}

export async function executeRecommendationOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context);
  const base = await foundation(userId, asOf);
  const upstreamDecision = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "decision");
  const upstreamScenario = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "scenario");
  const causal = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "causal") ?? buildCausalAnalysis(base.reasoning, base.state);
  const graph = buildDecisionGraph(base.reasoning, base.state, causal, base.graph.nodes);
  const decision = upstreamDecision?.decision_intelligence ?? buildDecisionIntelligence(base.reasoning, base.state, causal, graph);
  const widest = base.windows.length ? base.windows.reduce((a: WindowFlow, b: WindowFlow) => b.windowDays > a.windowDays ? b : a) : null;
  const consequences = buildConsequenceModel(decision, base.state, base.reasoning, base.safety.safeToSpend, widest?.outflow ?? null, widest?.windowDays ?? 30);
  const goalsResult = await supabaseAdmin.from("iris_user_goals").select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, constraints, preferences").eq("user_id", userId).eq("active", true).order("priority", { ascending: true });
  const goals = (goalsResult.data ?? []) as DeclaredIrisGoal[];
  const optimization = buildOptimizationIntelligence(decision, consequences, base.state, goals);
  const dependencyInputs = ["decision", "scenario", "causal"].filter(id => Boolean(context?.dependencyOutputs[id]));
  return { capability_id: "recommendation", operator_id: "recommendation", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: optimization.ranking_status === "blocked" ? "INSUFFICIENT_EVIDENCE" : "INFERRED", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { decision_intelligence: decision, scenario_intelligence: upstreamScenario ?? null, consequence_model: consequences, optimization_intelligence: optimization, goal_data_available: !goalsResult.error, composed_from: dependencyInputs } };
}

export async function executeScenarioOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context);
  const base = await foundation(userId, asOf);
  const upstreamCausal = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "causal");
  const upstreamPredictive = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "predictive");
  const upstreamDecision = dependencyResult<any>(context ?? ({ dependencyOutputs: {} } as CapabilityExecutionContext), "decision");
  const causal = upstreamCausal ?? buildCausalAnalysis(base.reasoning, base.state);
  const graph = buildDecisionGraph(base.reasoning, base.state, causal, base.graph.nodes);
  const decision = upstreamDecision?.decision_intelligence ?? buildDecisionIntelligence(base.reasoning, base.state, causal, graph);
  const widest = base.windows.length ? base.windows.reduce((a: WindowFlow, b: WindowFlow) => b.windowDays > a.windowDays ? b : a) : null;
  const consequences = buildConsequenceModel(decision, base.state, base.reasoning, base.safety.safeToSpend, widest?.outflow ?? null, widest?.windowDays ?? 30);
  const optimization = buildOptimizationIntelligence(decision, consequences, base.state, []);
  const result = buildCounterfactualIntelligence({ decision, optimization, safeToSpend: base.safety.safeToSpend, cashFlowNet: widest?.net ?? null, revolvingDebt: base.balances.revolvingDebt });
  const dependencyInputs = ["causal", "predictive", "decision"].filter(id => Boolean(context?.dependencyOutputs[id]));
  return { capability_id: "scenario", operator_id: "scenario", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.scenarios.length ? "SCENARIO" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { causal_analysis: causal, predictive_intelligence: upstreamPredictive ?? null, decision_intelligence: decision, optimization_intelligence: optimization, counterfactual_intelligence: result, composed_from: dependencyInputs } };
}
