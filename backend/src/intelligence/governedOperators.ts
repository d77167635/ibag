import { computeBalanceMetrics, computeCashFlowSafety, computeDebtTrend } from "../services/intelligence.js";
import { computeCanonicalAnomalies, IRIS_ANOMALY_INTELLIGENCE_V2 } from "./anomalies.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeCanonicalForwardProjection, computeEconomicCashFlow, computeCanonicalSpendingHierarchy, getCanonicalTransactions, getEvidenceObservationBoundary } from "./transactionSemantics.js";
import { assessTrajectory, computeMultiWindowFlow } from "./temporal.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";
import { dependencyResult } from "./capabilityExecutionContext.js";

export const GOVERNED_ANALYTICAL_OPERATOR_VERSION = "1.0.0";

type OperatorEnvelope<T> = { capability_id: string; operator_id: string; version: string; evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "INSUFFICIENT_EVIDENCE"; evidence_boundary: string | null; result: T; dependency_inputs?: string[] };

async function boundary(userId: string, context?: CapabilityExecutionContext): Promise<string | null> { return context?.evidenceBoundary ?? getEvidenceObservationBoundary(userId); }

function requireDependencyContext(context: CapabilityExecutionContext | undefined, capabilityId: string): CapabilityExecutionContext {
  if (!context) throw new Error(`CAPABILITY_CONTEXT_REQUIRED:${capabilityId}`);
  return context;
}

function requireDependencies(context: CapabilityExecutionContext, capabilityId: string, dependencyIds: readonly string[]): void {
  for (const dependencyId of dependencyIds) if (!context.dependencyOutputs[dependencyId]) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_REQUIRED:${capabilityId}->${dependencyId}`);
}

export async function executeTemporalOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const windows = await computeMultiWindowFlow(userId, undefined, asOf);
  return { capability_id: "temporal", operator_id: "temporal", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: windows.some(w => w.economicTxCount > 0) ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { windows, trajectory: assessTrajectory(windows) } };
}

export async function executeAnalysisOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "analysis"); requireDependencies(executionContext, "analysis", ["temporal"]);
  const transactions = await getCanonicalTransactions(userId, asOf ? new Date(new Date(asOf).getTime() - 90 * 86_400_000).toISOString().slice(0, 10) : undefined);
  const boundedTransactions = transactions.filter(tx => !asOf || tx.posted_date <= asOf.slice(0, 10));
  const [balances, cashFlowSafety, debtTrend] = await Promise.all([computeBalanceMetrics(userId), computeCashFlowSafety(userId), computeDebtTrend(userId)]);
  const cashFlow = computeEconomicCashFlow(boundedTransactions); const spending = computeCanonicalSpendingHierarchy(boundedTransactions, 30, asOf);
  const evidenceState = boundedTransactions.length || balances.liquidAssets != null ? "CALCULATED" : "INSUFFICIENT_EVIDENCE";
  return { capability_id: "analysis", operator_id: "analysis", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: evidenceState, evidence_boundary: asOf, dependency_inputs: ["temporal"], result: { transaction_count: boundedTransactions.length, economic_cash_flow: cashFlow, spending_hierarchy: spending, net_worth: { liquid_assets: balances.liquidAssets, as_of: balances.asOf }, cash_flow_safety: cashFlowSafety, debt_health: { revolving_debt: balances.revolvingDebt, credit_utilization: balances.creditUtilization, change_pct_30d: debtTrend.changePct, as_of: balances.asOf }, temporal_intelligence: dependencyResult<any>(executionContext, "temporal"), calculation_basis: "canonical_certified_transactions_and_authoritative_balance_state", composed_from: ["temporal"] } };
}

export async function executeBehavioralOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "behavioral"); requireDependencies(executionContext, "behavioral", ["analysis"]);
  const drift = await computeCategoryDrift(userId, 30, 90, asOf);
  return { capability_id: "behavioral", operator_id: "behavioral", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: drift.some(row => row.evidence === "calculated") ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: ["analysis"], result: { category_drift: drift, upstream_analysis: dependencyResult<any>(executionContext, "analysis"), composed_from: ["analysis"] } };
}

export async function executePatternOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "pattern"); requireDependencies(executionContext, "pattern", ["analysis", "behavioral"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis");
  const upstreamBehavioral = dependencyResult<any>(executionContext, "behavioral");
  const drift = upstreamBehavioral?.category_drift ?? []; const significantDrift = drift.filter((row: any) => row.significant); const analysisTransactions = Number(upstreamAnalysis?.transaction_count ?? 0);
  const patterns = [...(significantDrift.length ? [{ type: "category_drift", count: significantDrift.length }] : []), ...(analysisTransactions > 0 ? [{ type: "transaction_activity", count: analysisTransactions }] : [])];
  const dependencyInputs = ["analysis", "behavioral"];
  return { capability_id: "pattern", operator_id: "pattern", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: patterns.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { patterns, supporting_drift: drift, transaction_count: analysisTransactions, composed_from: dependencyInputs } };
}

export async function executeRelationshipOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "relationship"); requireDependencies(executionContext, "relationship", ["analysis", "behavioral", "pattern"]);
  const reasoning = await computeFinancialReasoning(userId, asOf); const dependencyInputs = ["analysis", "behavioral", "pattern"];
  return { capability_id: "relationship", operator_id: "relationship", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: reasoning.relationalChain.length || reasoning.risks.length || reasoning.opportunities.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...reasoning, upstream_intelligence: Object.fromEntries(dependencyInputs.map(id => [id, executionContext.dependencyOutputs[id].value])) } };
}

export async function executeAnomalyOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "anomaly"); requireDependencies(executionContext, "anomaly", ["analysis", "temporal", "behavioral", "pattern"]);
  const anomalies = await computeCanonicalAnomalies(userId, 30, asOf); const dependencyInputs = ["analysis", "temporal", "behavioral", "pattern"];
  return { capability_id: "anomaly", operator_id: "anomaly", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: anomalies.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { anomalies, algorithm_version: IRIS_ANOMALY_INTELLIGENCE_V2, upstream_intelligence: Object.fromEntries(dependencyInputs.map(id => [id, executionContext.dependencyOutputs[id].value])) } };
}

export async function executePredictiveOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context); const executionContext = requireDependencyContext(context, "predictive"); const dependencyInputs = ["analysis", "temporal", "behavioral", "pattern", "relationship", "causal"]; requireDependencies(executionContext, "predictive", dependencyInputs);
  const projection = await computeCanonicalForwardProjection(userId, 30, asOf);
  return { capability_id: "predictive", operator_id: "predictive", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: projection.evidence_state === "calculated" ? "PREDICTED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...projection, upstream_intelligence: Object.fromEntries(dependencyInputs.map(id => [id, executionContext.dependencyOutputs[id].value])), dependency_composition: dependencyInputs } };
}
