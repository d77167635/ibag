import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator } from "./capabilityOperators.js";
import { executeOutcomeOperator } from "./outcomeOperator.js";
import { executeLearningOperator } from "./learningOperator.js";
import { executeEmergentOperator } from "./emergentOperator.js";
import { executeTemporalOperator, executeAnalysisOperator, executeBehavioralOperator, executePatternOperator, executeRelationshipOperator, executeAnomalyOperator, executePredictiveOperator } from "./governedOperators.js";
import { executeCausalOperator, executeScenarioOperator, executeDecisionOperator, executeRecommendationOperator } from "./advancedOperators.js";
import { loadCapabilityExecutionContext } from "./capabilityExecutionContext.js";

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

/** Single runtime dispatcher. Every governed operator receives the durable dependency context for its execution record. */
export async function dispatchGovernedCapability({ userId, capabilityId }: DispatchRequest) {
  const context = await loadCapabilityExecutionContext(userId, capabilityId);

  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    const composedResult = {
      ...result,
      supervisory_composition: {
        dependency_capabilities: context.dependencyIds,
        dependency_output_hashes: Object.fromEntries(Object.entries(context.dependencyOutputs).map(([id, output]) => [id, output.output_hash])),
        recursion_depth: context.recursionDepth,
      },
    } as Awaited<ReturnType<typeof computeFullIntelligence>>;
    return { capability_id: GOVERNED_AGGREGATE_CAPABILITY, operator_id: GOVERNED_AGGREGATE_OPERATOR, operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION, result: composedResult };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented") throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);

  switch (capabilityId) {
    case "temporal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeTemporalOperator(userId, context) };
    case "analysis": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeAnalysisOperator(userId, context) };
    case "behavioral": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeBehavioralOperator(userId, context) };
    case "pattern": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executePatternOperator(userId, context) };
    case "relationship": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeRelationshipOperator(userId, context) };
    case "anomaly": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeAnomalyOperator(userId, context) };
    case "causal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeCausalOperator(userId, context) };
    case "predictive": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executePredictiveOperator(userId, context) };
    case "scenario": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeScenarioOperator(userId, context) };
    case "decision": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeDecisionOperator(userId, context) };
    case "recommendation": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeRecommendationOperator(userId, context) };
    case "outcome": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeOutcomeOperator(userId, context) };
    case "learning": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeLearningOperator(userId, context) };
    case "emergent": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await executeEmergentOperator(userId, context) };
    default: throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
