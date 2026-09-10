import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator } from "./capabilityOperators.js";
import { executeOutcomeOperator } from "./outcomeOperator.js";
import { executeLearningOperator } from "./learningOperator.js";
import { executeEmergentOperator } from "./emergentOperator.js";
import { executeTemporalOperator, executeAnalysisOperator, executeBehavioralOperator, executePatternOperator, executeRelationshipOperator, executeAnomalyOperator, executePredictiveOperator } from "./governedOperators.js";
import { executeCausalOperator, executeScenarioOperator, executeDecisionOperator, executeRecommendationOperator } from "./advancedOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type AggregateDispatch = {
  capability_id: typeof GOVERNED_AGGREGATE_CAPABILITY;
  operator_id: typeof GOVERNED_AGGREGATE_OPERATOR;
  operator_version: typeof GOVERNED_AGGREGATE_OPERATOR_VERSION;
  result: Awaited<ReturnType<typeof computeFullIntelligence>>;
};

type DispatchRequest = { userId: string; capabilityId: string };

export function dispatchGovernedCapability(request: { userId: string; capabilityId: typeof GOVERNED_AGGREGATE_CAPABILITY }): Promise<AggregateDispatch>;
export function dispatchGovernedCapability(request: DispatchRequest): Promise<{ capability_id: string; operator_id: string; operator_version: string; result: unknown }>;

/** Single runtime dispatcher. Implemented capabilities always resolve to their own governed operator. */
export async function dispatchGovernedCapability({ userId, capabilityId }: DispatchRequest) {
  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    return { capability_id: GOVERNED_AGGREGATE_CAPABILITY, operator_id: GOVERNED_AGGREGATE_OPERATOR, operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION, result };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented") throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);

  switch (capabilityId) {
    case "temporal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeTemporalOperator(userId) };
    case "analysis": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeAnalysisOperator(userId) };
    case "behavioral": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeBehavioralOperator(userId) };
    case "pattern": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executePatternOperator(userId) };
    case "relationship": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeRelationshipOperator(userId) };
    case "anomaly": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeAnomalyOperator(userId) };
    case "causal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeCausalOperator(userId) };
    case "predictive": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executePredictiveOperator(userId) };
    case "scenario": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeScenarioOperator(userId) };
    case "decision": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeDecisionOperator(userId) };
    case "recommendation": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeRecommendationOperator(userId) };
    case "outcome": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeOutcomeOperator(userId) };
    case "learning": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeLearningOperator(userId) };
    case "emergent": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeEmergentOperator(userId) };
    default: throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}