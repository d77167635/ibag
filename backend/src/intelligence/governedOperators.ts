import { computeCanonicalAnomalies, IRIS_ANOMALY_INTELLIGENCE_V2 } from "./anomalies.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeCanonicalForwardProjection, computeEconomicCashFlow, computeCanonicalSpendingHierarchy, getCanonicalTransactions, getEvidenceObservationBoundary } from "./transactionSemantics.js";
import { assessTrajectory, computeMultiWindowFlow } from "./temporal.js";
import type { CapabilityExecutionContext } from "./capabilityExecutionContext.js";
import { dependencyResult } from "./capabilityExecutionContext.js";

export const GOVERNED_ANALYTICAL_OPERATOR_VERSION = "1.0.0";

type OperatorEnvelope<T> = {
  capability_id: string;
  operator_id: string;
  version: string;
  evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "INSUFFICIENT_EVIDENCE";
  evidence_boundary: string | null;
  result: T;
  dependency_inputs?: string[];
};

async function boundary(userId: string, context?: CapabilityExecutionContext): Promise<string | null> {
  return context?.evidenceBoundary ?? getEvidenceObservationBoundary(userId);
}

function requireDependencyContext(context: CapabilityExecutionContext | undefined, capabilityId: string): CapabilityExecutionContext {
  if (!context) throw new Error(`CAPABILITY_CONTEXT_REQUIRED:${capabilityId}`);
  return context;
}

function requireDependencies(context: CapabilityExecutionContext, capabilityId: string, dependencyIds: readonly string[]): void {
  for (const dependencyId of dependencyIds) {
    if (!context.dependencyOutputs[dependencyId]) {
      throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_REQUIRED:${capabilityId}->${dependencyId}`);
    }
  }
}

export async function executeTemporalOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const windows = await computeMultiWindowFlow(userId, undefined, asOf);
  return { capability_id: "temporal", operator_id: "temporal", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: windows.some(w => w.economicTxCount > 0) ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { windows, trajectory: assessTrajectory(windows) } };
}

export async function executeAnalysisOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const transactions = await getCanonicalTransactions(userId, asOf ? new Date(new Date(asOf).getTime() - 90 * 86_400_000).toISOString().slice(0, 10) : undefined);
  const cashFlow = computeEconomicCashFlow(transactions.filter(tx => !asOf || tx.posted_date <= asOf.slice(0, 10)));
  const spending = computeCanonicalSpendingHierarchy(transactions, 30, asOf);
  return { capability_id: "analysis", operator_id: "analysis", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: transactions.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { transaction_count: transactions.length, economic_cash_flow: cashFlow, spending_hierarchy: spending, calculation_basis: "canonical_certified_transactions" } };
}

export async function executeBehavioralOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const drift = await computeCategoryDrift(userId, 30, 90, asOf);
  return { capability_id: "behavioral", operator_id: "behavioral", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: drift.some(row => row.evidence === "calculated") ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { category_drift: drift } };
}

export async function executePatternOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const executionContext = requireDependencyContext(context, "pattern");
  requireDependencies(executionContext, "pattern", ["analysis", "behavioral"]);
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis");
  const upstreamBehavioral = dependencyResult<any>(executionContext, "behavioral");
  const upstreamAnomaly = dependencyResult<any>(executionContext, "anomaly");
  const drift = upstreamBehavioral?.category_drift ?? [];
  const significantDrift = drift.filter((row: any) => row.significant);
  const analysisTransactions = Number(upstreamAnalysis?.transaction_count ?? 0);
  const patterns = [
    ...(significantDrift.length ? [{ type: "category_drift", count: significantDrift.length }] : []),
    ...(upstreamAnomaly?.anomalies?.length ? [{ type: "merchant_amount_anomaly", count: upstreamAnomaly.anomalies.length }] : []),
    ...(analysisTransactions > 0 ? [{ type: "transaction_activity", count: analysisTransactions }] : []),
  ];
  const dependencyInputs = ["analysis", "behavioral"];
  if (upstreamAnomaly) dependencyInputs.push("anomaly");
  return { capability_id: "pattern", operator_id: "pattern", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: patterns.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { patterns, supporting_drift: drift, supporting_anomalies: upstreamAnomaly?.anomalies ?? [], transaction_count: analysisTransactions, composed_from: dependencyInputs } };
}

export async function executeRelationshipOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const executionContext = requireDependencyContext(context, "relationship");
  requireDependencies(executionContext, "relationship", ["analysis", "behavioral", "pattern"]);
  const reasoning = await computeFinancialReasoning(userId, asOf);
  const dependencyInputs = ["analysis", "behavioral", "pattern"];
  return { capability_id: "relationship", operator_id: "relationship", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: reasoning.relationalChain.length || reasoning.risks.length || reasoning.opportunities.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, dependency_inputs: dependencyInputs, result: { ...reasoning, upstream_intelligence: Object.fromEntries(dependencyInputs.map(id => [id, executionContext.dependencyOutputs[id].value])) } };
}

export async function executeAnomalyOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const anomalies = await computeCanonicalAnomalies(userId, 30, asOf);
  return { capability_id: "anomaly", operator_id: "anomaly", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: anomalies.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { anomalies, algorithm_version: IRIS_ANOMALY_INTELLIGENCE_V2 } };
}

export async function executePredictiveOperator(userId: string, context?: CapabilityExecutionContext): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId, context);
  const executionContext = requireDependencyContext(context, "predictive");
  requireDependencies(executionContext, "predictive", ["analysis", "temporal", "behavioral", "pattern", "relationship", "causal"]);
  const upstreamTemporal = dependencyResult<any>(executionContext, "temporal");
  const upstreamAnalysis = dependencyResult<any>(executionContext, "analysis");
  const upstreamCausal = dependencyResult<any>(executionContext, "causal");
  const upstreamRelationship = dependencyResult<any>(executionContext, "relationship");
  const projection = await computeCanonicalForwardProjection(userId, 30, asOf);
  const dependencyInputs = ["analysis", "temporal", "behavioral", "pattern", "relationship", "causal"];
  return {
    capability_id: "predictive", operator_id: "predictive", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION,
    evidence_state: projection.evidence_state === "calculated" ? "PREDICTED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf,
    dependency_inputs: dependencyInputs,
    result: {
      ...projection,
      upstream_temporal: upstreamTemporal,
      upstream_analysis: upstreamAnalysis,
      upstream_relationship: upstreamRelationship,
      upstream_causal: upstreamCausal,
      dependency_composition: dependencyInputs,
    },
  };
}
