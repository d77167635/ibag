import { computeCanonicalAnomalies, IRIS_ANOMALY_INTELLIGENCE_V2 } from "./anomalies.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeCanonicalForwardProjection, computeEconomicCashFlow, computeCanonicalSpendingHierarchy, getCanonicalTransactions, getEvidenceObservationBoundary } from "./transactionSemantics.js";
import { assessTrajectory, computeMultiWindowFlow } from "./temporal.js";

export const GOVERNED_ANALYTICAL_OPERATOR_VERSION = "1.0.0";

type OperatorEnvelope<T> = {
  capability_id: string;
  operator_id: string;
  version: string;
  evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "INSUFFICIENT_EVIDENCE";
  evidence_boundary: string | null;
  result: T;
};

async function boundary(userId: string): Promise<string | null> { return getEvidenceObservationBoundary(userId); }

export async function executeTemporalOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const windows = await computeMultiWindowFlow(userId, undefined, asOf);
  return { capability_id: "temporal", operator_id: "temporal", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: windows.some(w => w.economicTxCount > 0) ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { windows, trajectory: assessTrajectory(windows) } };
}

export async function executeAnalysisOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const transactions = await getCanonicalTransactions(userId, asOf ? new Date(new Date(asOf).getTime() - 90 * 86_400_000).toISOString().slice(0, 10) : undefined);
  const cashFlow = computeEconomicCashFlow(transactions.filter(tx => !asOf || tx.posted_date <= asOf.slice(0, 10)));
  const spending = computeCanonicalSpendingHierarchy(transactions, 30, asOf);
  return { capability_id: "analysis", operator_id: "analysis", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: transactions.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { transaction_count: transactions.length, economic_cash_flow: cashFlow, spending_hierarchy: spending, calculation_basis: "canonical_certified_transactions" } };
}

export async function executeBehavioralOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const drift = await computeCategoryDrift(userId, 30, 90, asOf);
  return { capability_id: "behavioral", operator_id: "behavioral", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: drift.some(row => row.evidence === "calculated") ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { category_drift: drift } };
}

export async function executePatternOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const [drift, anomalies, windows] = await Promise.all([computeCategoryDrift(userId, 30, 90, asOf), computeCanonicalAnomalies(userId, 30, asOf), computeMultiWindowFlow(userId, undefined, asOf)]);
  const significantDrift = drift.filter(row => row.significant);
  const trajectory = assessTrajectory(windows);
  const patterns = [
    ...(significantDrift.length ? [{ type: "category_drift", count: significantDrift.length }] : []),
    ...(anomalies.length ? [{ type: "merchant_amount_anomaly", count: anomalies.length }] : []),
    ...(trajectory.direction !== "insufficient_evidence" ? [{ type: "spending_trajectory", direction: trajectory.direction }] : []),
  ];
  return { capability_id: "pattern", operator_id: "pattern", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: patterns.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { patterns, supporting_drift: drift, supporting_anomalies: anomalies, supporting_trajectory: trajectory } };
}

export async function executeRelationshipOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const reasoning = await computeFinancialReasoning(userId, asOf);
  return { capability_id: "relationship", operator_id: "relationship", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: reasoning.relationalChain.length || reasoning.risks.length || reasoning.opportunities.length ? "INFERRED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: reasoning };
}

export async function executeAnomalyOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const anomalies = await computeCanonicalAnomalies(userId, 30, asOf);
  return { capability_id: "anomaly", operator_id: "anomaly", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: anomalies.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: { anomalies, algorithm_version: IRIS_ANOMALY_INTELLIGENCE_V2 } };
}

export async function executePredictiveOperator(userId: string): Promise<OperatorEnvelope<unknown>> {
  const asOf = await boundary(userId);
  const projection = await computeCanonicalForwardProjection(userId, 30, asOf);
  return { capability_id: "predictive", operator_id: "predictive", version: GOVERNED_ANALYTICAL_OPERATOR_VERSION, evidence_state: projection.evidence_state === "calculated" ? "PREDICTED" : "INSUFFICIENT_EVIDENCE", evidence_boundary: asOf, result: projection };
}
