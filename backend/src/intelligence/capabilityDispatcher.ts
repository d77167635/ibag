import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator, type CapabilityExecutionContext, type CapabilityOperatorResult, type GovernedCapabilityResult } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type DispatchRequest = { userId: string; capabilityId: string; context?: CapabilityExecutionContext };

/** Single runtime dispatcher. Implemented capabilities never silently fall back to the aggregate operator. */
export async function dispatchGovernedCapability({ userId, capabilityId, context }: DispatchRequest): Promise<CapabilityOperatorResult> {
  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId, context);
    return {
      capability_id: GOVERNED_AGGREGATE_CAPABILITY,
      operator_id: GOVERNED_AGGREGATE_OPERATOR,
      operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION,
      evidence_state: "CALCULATED",
      result: result as GovernedCapabilityResult,
    };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented" || !operator.execute) throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);
  return operator.execute(userId, context);
}
