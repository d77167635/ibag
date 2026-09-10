import { supabaseAdmin } from "../config/supabase.js";
import { buildEvidenceGraph } from "./evidenceGraph.js";
import { assessUncertainty } from "./uncertainty.js";
import { buildFinancialStateModel } from "./financialState.js";
import { buildCausalAnalysis } from "./causal.js";
import { buildDecisionGraph } from "./decisionGraph.js";
import { buildDecisionIntelligence } from "./decisionIntelligence.js";
import { buildConsequenceModel } from "./consequence.js";
import { buildOptimizationIntelligence } from "./optimization.js";
import { buildScenarioSensitivityIntelligence } from "./counterfactual.js";
import type { DeclaredIrisGoal } from "./goals.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";
import { dependencyResult } from "./capabilityExecutionContext.js";
import { getCertifiedEvidenceBoundary } from "./certifiedEvidenceBoundary.js";

export const GOVERNED_ADVANCED_OPERATOR_VERSION = "1.0.0";
type Envelope<T> = { capability_id: string; operator_id: string; version: string; evidence_state: "CALCULATED" | "INFERRED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE"; evidence_boundary: string | null; result: T; dependency_inputs?: string[] };

async function boundary(userId: string, context?: CapabilityExecutionContext) {
  return context?.evidenceBoundary ?? getCertifiedEvidenceBoundary(userId);
}

function requiredContext(context: CapabilityExecutionContext | undefined, capabilityId: string, dependencyIds: readonly string[]): CapabilityExecutionContext {
  if (!context) throw new Error(`CAPABILITY_CONTEXT_REQUIRED:${capabilityId}`);
  for (const dependencyId of dependencyIds) if (!context.dependencyOutputs[dependencyId]) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_REQUIRED:${capabilityId}->${dependencyId}`);
  return context;
}

function analysisState(analysis: any) {
  const metrics = { net_worth: analysis?.net_worth ?? {}, debt_health: analysis?.debt_health ?? {}, cash_flow_safety: analysis?.cash_flow_safety ?? {}, cash_flow: analysis?.economic_cash_flow ?? {}, anomalies: analysis?.anomalies ?? [] };
  const graph = buildEvidenceGraph({ layer_metrics: metrics, layer_temporal: analysis?.temporal_intelligence });
  const uncertainty = assessUncertainty(graph);
  return { graph, state: buildFinancialStateModel(graph, uncertainty) };
}

export function buildComposedRelationshipIntelligence(analysis: any, behavioral: any, pattern: any) {
  const risks: any[] = [], opportunities: any[] = [], relationalChain: string[] = [], unresolvedQuestions: string[] = [];
  const cashFlow = analysis?.economic_cash_flow, safety = analysis?.cash_flow_safety, debt = analysis?.debt_health;
  const drift = behavioral?.category_drift ?? [], patterns = pattern?.patterns ?? [];
  if (cashFlow?.net !== null && cashFlow?.net !== undefined && safety?.safeToSpend !== null && safety?.safeToSpend !== undefined) relationalChain.push(`Economic cash flow and safe-to-spend are jointly observed from the same analysis output: net ${Number(cashFlow.net).toFixed(2)}, safe-to-spend ${Number(safety.safeToSpend).toFixed(2)}.`);
  if (debt?.revolving_debt !== null && debt?.revolving_debt !== undefined && debt?.credit_utilization !== null && debt?.credit_utilization !== undefined) relationalChain.push(`Revolving debt and credit utilization are jointly observed: balance ${Number(debt.revolving_debt).toFixed(2)}, utilization ${(Number(debt.credit_utilization) * 100).toFixed(0)}%.`);
  const significantDrift = drift.filter((row: any) => row?.significant);
  if (significantDrift.length) {
    opportunities.push({ key: "category_spending_change", evidence: "calculated", statement: `${significantDrift.length} spending category change(s) are supported by the behavioral analysis.`, supportingMetrics: { categoriesAffected: significantDrift.length } });
    relationalChain.push(`Behavioral category changes are related to the transaction activity represented by ${Number(analysis?.transaction_count ?? 0)} analyzed transaction(s).`);
  }
  if (cashFlow?.net !== null && Number(cashFlow?.net) < 0) risks.push({ key: "negative_economic_cash_flow", severity: "high", evidence: "calculated", statement: "Economic cash flow is negative in the authoritative analysis output.", supportingMetrics: { net: cashFlow.net } });
  if (debt?.change_pct_30d !== null && Number(debt?.change_pct_30d) > 0) risks.push({ key: "revolving_debt_increase", severity: Number(debt.change_pct_30d) > 50 ? "medium" : "low", evidence: "calculated", statement: "Revolving debt increased over the reported trend window.", supportingMetrics: { changePct30d: debt.change_pct_30d } });
  if (patterns.length === 0 && drift.length === 0) unresolvedQuestions.push("No additional recurring relational pattern is established by the currently supplied child intelligence.");
  if (Number(cashFlow?.net) < 0 && Number(debt?.change_pct_30d) > 0) unresolvedQuestions.push("Negative economic cash flow and increasing revolving debt overlap in the observed period; the supplied evidence does not establish causation.");
  const priority = risks.length ? risks.reduce((top, item) => item.severity === "high" ? item : top, risks[0]) : null;
  return { risks, opportunities, relationalChain, unresolvedQuestions, priorityFocus: priority ? { key: priority.key, reason: priority.statement } : null, generatedAt: new Date().toISOString() };
}

export async function executeCausalOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requiredContext(context, "causal", ["analysis", "temporal", "behavioral", "pattern", "relationship"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis"), upstreamRelationship = dependencyResult<any>(executionContext, "relationship");
  const { state } = analysisState(upstreamAnalysis); const result = buildCausalAnalysis(upstreamRelationship, state);
  const dependencyInputs = ["analysis", "temporal", "behavioral", "pattern", "relationship"];
  return { capability_id: "causal", operator_id: "causal", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.hypotheses.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...result, upstream_analysis: upstreamAnalysis, composed_from: dependencyInputs } };
}

export async function executeDecisionOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requiredContext(context, "decision", ["analysis", "predictive", "causal", "relationship", "scenario"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis"), causal = dependencyResult<any>(executionContext, "causal"), upstreamPredictive = dependencyResult<any>(executionContext, "predictive"), upstreamRelationship = dependencyResult<any>(executionContext, "relationship"), upstreamScenario = dependencyResult<any>(executionContext, "scenario");
  const { graph, state } = analysisState(upstreamAnalysis); const graphResult = buildDecisionGraph(upstreamRelationship, state, causal, graph.nodes); const result = buildDecisionIntelligence(upstreamRelationship, state, causal, graphResult);
  const dependencyInputs = ["predictive", "causal", "relationship", "scenario"];
  return { capability_id: "decision", operator_id: "decision", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.decision_ready ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { causal_analysis: causal, decision_graph: graphResult, decision_intelligence: result, upstream_predictive: upstreamPredictive, upstream_relationship: upstreamRelationship, upstream_scenario: upstreamScenario, composed_from: dependencyInputs } };
}

export async function executeRecommendationOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requiredContext(context, "recommendation", ["analysis", "decision", "scenario", "causal"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis"), upstreamDecision = dependencyResult<any>(executionContext, "decision"), upstreamScenario = dependencyResult<any>(executionContext, "scenario"), causal = dependencyResult<any>(executionContext, "causal");
  const decision = upstreamDecision?.decision_intelligence; if (!decision) throw new Error("CAPABILITY_DEPENDENCY_RESULT_INVALID:recommendation->decision");
  const cashFlow = upstreamAnalysis?.economic_cash_flow, safety = upstreamAnalysis?.cash_flow_safety;
  const consequences = buildConsequenceModel(decision, analysisState(upstreamAnalysis).state, upstreamDecision, safety?.safeToSpend ?? null, cashFlow?.outflow ?? null, cashFlow?.windowDays ?? 30);
  const goalsResult = await supabaseAdmin.from("iris_user_goals").select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, constraints, preferences").eq("user_id", userId).eq("active", true).order("priority", { ascending: true });
  if (goalsResult.error) throw new Error(`IRIS_GOALS_READ_FAILED:${goalsResult.error.message}`);
  const goals = (goalsResult.data ?? []) as DeclaredIrisGoal[]; const optimization = buildOptimizationIntelligence(decision, consequences, analysisState(upstreamAnalysis).state, goals);
  const dependencyInputs = ["decision", "scenario", "causal"];
  return { capability_id: "recommendation", operator_id: "recommendation", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: optimization.ranking_status === "blocked" ? "INSUFFICIENT_EVIDENCE" : "INFERRED", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { decision_intelligence: decision, scenario_intelligence: upstreamScenario, causal_intelligence: causal, consequence_model: consequences, optimization_intelligence: optimization, goal_data_available: goals.length > 0, composed_from: dependencyInputs } };
}

export async function executeScenarioOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requiredContext(context, "scenario", ["analysis", "predictive", "causal", "relationship"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis"), upstreamCausal = dependencyResult<any>(executionContext, "causal"), upstreamPredictive = dependencyResult<any>(executionContext, "predictive"), upstreamRelationship = dependencyResult<any>(executionContext, "relationship");
  const result = buildScenarioSensitivityIntelligence({ causal: upstreamCausal, predictive: upstreamPredictive, safeToSpend: upstreamAnalysis?.cash_flow_safety?.safeToSpend ?? null, cashFlowNet: upstreamAnalysis?.economic_cash_flow?.net ?? null, revolvingDebt: upstreamAnalysis?.debt_health?.revolving_debt ?? null });
  const dependencyInputs = ["predictive", "causal", "relationship"];
  return { capability_id: "scenario", operator_id: "scenario", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: result.evidence_state as Envelope<unknown>["evidence_state"], evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { causal_analysis: upstreamCausal, predictive_intelligence: upstreamPredictive, relationship_intelligence: upstreamRelationship, scenario_sensitivity: result, composed_from: dependencyInputs } };
}

export async function executeRelationshipOperator(userId: string, context?: CapabilityExecutionContext): Promise<Envelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requiredContext(context, "relationship", ["analysis", "behavioral", "pattern"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis"), upstreamBehavioral = dependencyResult<any>(executionContext, "behavioral"), upstreamPattern = dependencyResult<any>(executionContext, "pattern");
  const result = buildComposedRelationshipIntelligence(upstreamAnalysis, upstreamBehavioral, upstreamPattern);
  const dependencyInputs = ["analysis", "behavioral", "pattern"];
  const evidenceState = result.risks.length || result.opportunities.length || result.relationalChain.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE";
  return { capability_id: "relationship", operator_id: "relationship", version: GOVERNED_ADVANCED_OPERATOR_VERSION, evidence_state: evidenceState, evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...result, upstream_intelligence: Object.fromEntries(dependencyInputs.map(id => [id, executionContext.dependencyOutputs[id].value])), composed_from: dependencyInputs } };
}
