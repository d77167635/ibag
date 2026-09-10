import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator } from "./capabilityOperators.js";
import { executeOutcomeOperator } from "./outcomeOperator.js";
import { executeLearningOperator } from "./learningOperator.js";
import { executeEmergentOperator } from "./emergentOperator.js";
import { executeTemporalOperator, executeAnalysisOperator, executeBehavioralOperator, executePatternOperator, executeRelationshipOperator, executeAnomalyOperator, executePredictiveOperator } from "./governedOperators.js";
import { executeCausalOperator, executeScenarioOperator, executeDecisionOperator, executeRecommendationOperator } from "./advancedOperators.js";
import { loadCapabilityExecutionContext, type CapabilityExecutionContext } from "./capabilityExecutionContext.js";
import { synthesizeCapabilityGraph } from "./supervisorySynthesis.js";
import { supabaseAdmin } from "../config/supabase.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type AggregateDispatch = {
  capability_id: typeof GOVERNED_AGGREGATE_CAPABILITY;
  operator_id: typeof GOVERNED_AGGREGATE_OPERATOR;
  operator_version: typeof GOVERNED_AGGREGATE_OPERATOR_VERSION;
  result: Awaited<ReturnType<typeof computeFullIntelligence>>;
};

type DispatchRequest = { userId: string; capabilityId: string; executionId?: string };
type GovernedResult = Record<string, unknown>;

function composeOperatorResult(result: unknown, context: Awaited<ReturnType<typeof loadCapabilityExecutionContext>>): unknown {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  const graphSynthesis = synthesizeCapabilityGraph(context.dependencyIds, context.dependencyOutputs);
  return { ...(result as GovernedResult), dependency_composition: graphSynthesis };
}

async function finish<T>(context: CapabilityExecutionContext, result: T): Promise<T> {
  const budget = context.resourceBudget?.max_execution_time_ms;
  if (budget) {
    const { data, error } = await supabaseAdmin.from("iris_execution_records").select("started_at").eq("id", context.executionId).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(`CAPABILITY_RESOURCE_USAGE_READ_FAILED:${error.message}`);
    const startedAt = data?.started_at;
    if (startedAt) {
      const elapsed = Date.now() - Date.parse(startedAt);
      if (Number.isFinite(elapsed) && elapsed > budget) throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:execution_time_ms:${elapsed}>${budget}`);
    }
  }
  return result;
}

export function dispatchGovernedCapability(request: { userId: string; capabilityId: typeof GOVERNED_AGGREGATE_CAPABILITY; executionId?: string }): Promise<AggregateDispatch>;
export function dispatchGovernedCapability(request: DispatchRequest): Promise<{ capability_id: string; operator_id: string; operator_version: string; result: unknown }>;

/** Single runtime dispatcher. Every governed operator receives durable dependency context for its execution record. */
export async function dispatchGovernedCapability({ userId, capabilityId, executionId }: DispatchRequest) {
  const context = await loadCapabilityExecutionContext(userId, capabilityId, executionId);

  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    const graphSynthesis = synthesizeCapabilityGraph(context.dependencyIds, context.dependencyOutputs);
    const composedResult = {
      ...result,
      supervisory_composition: {
        dependency_capabilities: context.dependencyIds,
        dependency_output_hashes: graphSynthesis.output_hashes,
        dependency_outputs_consumed: graphSynthesis.graph_complete,
        dependency_evidence_state: graphSynthesis.evidence_state,
        dependency_evidence_distribution: graphSynthesis.evidence_state_distribution,
        dependency_uncertainty_present: graphSynthesis.uncertainty_present,
        dependency_lineage: graphSynthesis.dependency_lineage,
        graph_synthesis: graphSynthesis,
        recursion_depth: context.recursionDepth,
        execution_id: context.executionId,
        run_id: context.runId,
      },
    } as Awaited<ReturnType<typeof computeFullIntelligence>>;
    return { capability_id: GOVERNED_AGGREGATE_CAPABILITY, operator_id: GOVERNED_AGGREGATE_OPERATOR, operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION, result: await finish(context, composedResult) };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented") throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);

  switch (capabilityId) {
    case "temporal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeTemporalOperator(userId, context), context)) };
    case "analysis": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeAnalysisOperator(userId, context), context)) };
    case "behavioral": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeBehavioralOperator(userId, context), context)) };
    case "pattern": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executePatternOperator(userId, context), context)) };
    case "relationship": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeRelationshipOperator(userId, context), context)) };
    case "anomaly": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeAnomalyOperator(userId, context), context)) };
    case "causal": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeCausalOperator(userId, context), context)) };
    case "predictive": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executePredictiveOperator(userId, context), context)) };
    case "scenario": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeScenarioOperator(userId, context), context)) };
    case "decision": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeDecisionOperator(userId, context), context)) };
    case "recommendation": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeRecommendationOperator(userId, context), context)) };
    case "outcome": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeOutcomeOperator(userId, context), context)) };
    case "learning": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeLearningOperator(userId, context), context)) };
    case "emergent": return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result: await finish(context, composeOperatorResult(await executeEmergentOperator(userId, context), context)) };
    default: throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
