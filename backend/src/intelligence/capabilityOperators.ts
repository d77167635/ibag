import { assessTrajectory } from "./temporal.js";
import { getCanonicalTransactions, computeCanonicalWindowFlows } from "./transactionSemantics.js";
import { executeAnalysis, executeBehavioral, executePattern, executeRelationship, executeAnomaly, executeCausal, executePredictive, executeScenario, executeDecision, executeRecommendation, executeOutcome, executeLearning } from "./recursiveOperators.js";
import { executeFinancialLifeState, executeRelationalOntology } from "./foundationalIntelligenceOperators.js";
import { executeRisk, executeOpportunity, executeConsequence } from "./riskOpportunityConsequenceOperators.js";
import { buildRecursiveIntelligenceSynthesis } from "./recursiveIntelligenceSynthesis.js";
import { buildCanonicalLifeState } from "./canonicalLifeState.js";
import { buildRelationalOntologyExpansion } from "./relationalOntologyExpansion.js";

export type CapabilityOperatorStatus = "implemented" | "planned";
export type GovernedCapabilityResult = { layer_metrics?: { provider_domains?: { selected_item_id?: string | null } }; uncertainty?: unknown; [key: string]: unknown };
export type CapabilityExecutionContext = {
  asOf?: string | null;
  evidenceBoundary?: string | null;
  runId?: string | null;
  executionId?: string | null;
  evidenceManifestHash?: string | null;
  runEvidenceIds?: string[];
  dependencyResults?: Record<string, CapabilityOperatorResult>;
  scenarioAssumptions?: Array<{ reductionPct: number }>;
  persistLineage?: (input: { capabilityId: string; result: CapabilityOperatorResult; dependencyResults: Record<string, CapabilityOperatorResult> }) => Promise<void>;
  persistGraphNode?: (input: { capabilityId: string; result: CapabilityOperatorResult; dependencyResults: Record<string, CapabilityOperatorResult> }) => Promise<{ id: string }>;
};
export type CapabilityOperatorResult = { capability_id: string; operator_id: string; operator_version: string; evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE"; result: GovernedCapabilityResult };
export type CapabilityOperator = { capability_id: string; operator_id: string; version: string; status: CapabilityOperatorStatus; execution_stage: string; evidence_state: CapabilityOperatorResult["evidence_state"]; execute?: (userId: string, context?: CapabilityExecutionContext) => Promise<CapabilityOperatorResult> };

const temporalOperator: CapabilityOperator = {
  capability_id: "temporal", operator_id: "temporal", version: "1.0.0", status: "implemented", execution_stage: "multi_window_flow", evidence_state: "CALCULATED",
  execute: async (userId, context) => {
    const windowsDays = [7, 30, 90, 180, 365] as const;
    const widest = Math.max(...windowsDays);
    const anchor = context?.asOf ? new Date(context.asOf) : new Date();
    const cutoff = new Date(anchor.getTime() - widest * 86_400_000).toISOString().slice(0, 10);
    const boundary = context?.evidenceBoundary ?? context?.asOf ?? null;
    const transactions = await getCanonicalTransactions(userId, cutoff, boundary, context?.runId ?? null);
    const windows = computeCanonicalWindowFlows(transactions, windowsDays, context?.asOf ?? undefined, context?.runId ?? null, boundary);
    const trajectory = assessTrajectory(windows as any);
    const state = windows.some((window) => window.economicTxCount > 0) ? "CALCULATED" : "INSUFFICIENT_EVIDENCE";
    return { capability_id: "temporal", operator_id: "temporal", operator_version: "1.0.0", evidence_state: state, result: { windows, trajectory, evidence_boundary: boundary, evidence: { state: state === "CALCULATED" ? "calculated" : "insufficient_evidence", source: "canonical_financial_transactions", transaction_count: transactions.length, provider_observations_created: false, financial_values_created: false, money_movement_executed: false }, provenance: { source: "canonical_financial_transactions", provider_observations_created: false, financial_values_created: false, money_movement_executed: false, run_id: context?.runId ?? null, evidence_manifest_hash: context?.evidenceManifestHash ?? null, run_evidence_ids: [...(context?.runEvidenceIds ?? [])].sort(), evidence_boundary: boundary } } };
  },
};

function op(capability_id: string, execute: CapabilityOperator["execute"], evidence_state: CapabilityOperatorResult["evidence_state"], execution_stage: string, version = "1.0.0"): CapabilityOperator { return { capability_id, operator_id: capability_id, version, status: "implemented", execution_stage, evidence_state, execute }; }
const financialLifeStateOperator: CapabilityOperator = op("financial_life_state", executeFinancialLifeState, "CALCULATED", "canonical_financial_life_state");
const relationalOntologyOperator: CapabilityOperator = op("relational_ontology", executeRelationalOntology, "CALCULATED", "relational_ontology_expansion");
const emergentOperator: CapabilityOperator = {
  capability_id: "emergent", operator_id: "emergent", version: "1.1.0", status: "implemented", execution_stage: "recursive_higher_order_synthesis", evidence_state: "INFERRED",
  execute: async (userId, context) => {
    const dependencyResults = context?.dependencyResults ?? {};
    const synthesis = buildRecursiveIntelligenceSynthesis(dependencyResults, context);
    const anchor = context?.asOf ? new Date(context.asOf) : new Date();
    const boundary = context?.evidenceBoundary ?? context?.asOf ?? null;
    const cutoff = new Date(anchor.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
    const transactions = await getCanonicalTransactions(userId, cutoff, boundary, context?.runId ?? null);
    const lifeStateDependency = dependencyResults.financial_life_state?.result?.canonical_life_state as Record<string, any> | undefined;
    const ontologyDependency = dependencyResults.relational_ontology?.result as Record<string, any> | undefined;
    const lifeState = lifeStateDependency ?? buildCanonicalLifeState(transactions, boundary);
    const relationalOntology = Array.isArray(ontologyDependency?.relationships) ? ontologyDependency.relationships : buildRelationalOntologyExpansion(transactions);
    const state = synthesis.dependency_count > 0 || lifeState.transaction_count > 0 ? "INFERRED" : "INSUFFICIENT_EVIDENCE";
    return { capability_id: "emergent", operator_id: "emergent", operator_version: "1.1.0", evidence_state: state, result: { ...synthesis, canonical_life_state: lifeState, relational_ontology: { architecture_version: "IRIS_RELATIONAL_ONTOLOGY_EXPANSION_V2", relation_count: relationalOntology.length, relationships: relationalOntology, evidence_state: transactions.length ? "calculated" : "insufficient_evidence", limitation: transactions.length ? "Relationships are calculated from shared canonical observations; they do not establish causation, intent, necessity, or future behavior." : "No canonical transaction evidence is available to construct relational observations." }, evidence: { state: state === "INFERRED" ? "inferred" : "insufficient_evidence", source: "certified_capability_outputs_and_canonical_financial_transactions", dependency_count: synthesis.dependency_count, transaction_count: transactions.length }, provenance: { source: "certified_capability_outputs_and_canonical_financial_transactions", provider_observations_created: false, financial_values_created: false, money_movement_executed: false, run_id: context?.runId ?? null, evidence_manifest_hash: context?.evidenceManifestHash ?? null, run_evidence_ids: [...(context?.runEvidenceIds ?? [])].sort(), evidence_boundary: boundary, composition_depth: synthesis.composition_depth } } };
  },
};

export const EXECUTABLE_CAPABILITY_OPERATORS: CapabilityOperator[] = [
  temporalOperator, financialLifeStateOperator, relationalOntologyOperator,
  op("analysis", executeAnalysis, "CALCULATED", "canonical_semantic_analysis"),
  op("behavioral", executeBehavioral, "CALCULATED", "category_behavior"),
  op("pattern", executePattern, "CALCULATED", "pattern_composition"),
  op("relationship", executeRelationship, "INFERRED", "financial_relationship_analysis"),
  op("anomaly", executeAnomaly, "CALCULATED", "canonical_anomaly_detection"),
  op("causal", executeCausal, "INFERRED", "observational_candidate_analysis"),
  op("predictive", executePredictive, "PREDICTED", "constrained_forward_projection"),
  op("scenario", executeScenario, "SCENARIO", "counterfactual_spending_analysis"),
  op("decision", executeDecision, "INFERRED", "decision_intelligence"),
  op("recommendation", executeRecommendation, "INFERRED", "review_recommendations"),
  op("risk", executeRisk, "INFERRED", "risk_signal_synthesis"),
  op("opportunity", executeOpportunity, "INFERRED", "opportunity_investigation_synthesis"),
  op("consequence", executeConsequence, "INFERRED", "conditional_consequence_propagation"),
  op("outcome", executeOutcome, "CALCULATED", "durable_outcome_loop"),
  op("learning", executeLearning, "INFERRED", "validated_outcome_learning", "1.1.0"),
  emergentOperator,
];
export function getCapabilityOperator(capabilityId: string): CapabilityOperator | null { return EXECUTABLE_CAPABILITY_OPERATORS.find((operator) => operator.capability_id === capabilityId) ?? null; }
