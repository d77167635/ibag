import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator, type CapabilityOperatorResult } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type DispatchRequest = {
  userId: string;
  capabilityId: string;
};

/**
 * Single runtime dispatcher for governed capabilities.
 *
 * The aggregate capability remains the legacy/full-system execution boundary.
 * Independently implemented capabilities must resolve to a distinct operator;
 * they never silently fall back to the aggregate computation.
 */
export async function dispatchGovernedCapability({ userId, capabilityId }: DispatchRequest): Promise<CapabilityOperatorResult> {
  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    return {
      capability_id: GOVERNED_AGGREGATE_CAPABILITY,
      operator_id: GOVERNED_AGGREGATE_OPERATOR,
      operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION,
      evidence_state: "CALCULATED",
      result,
    };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented" || !operator.execute) {
    throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);
  }

  return operator.execute(userId);
}
