import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator } from "./capabilityOperators.js";
import { executeOutcomeOperator } from "./outcomeOperator.js";
import { executeLearningOperator } from "./learningOperator.js";
import { executeEmergentOperator } from "./emergentOperator.js";

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
 * Every capability marked implemented must have a distinct operator here. A
 * planned capability is rejected rather than silently falling back to the
 * aggregate operator, preserving the distinction between architecture,
 * catalog readiness, and executable runtime state.
 */
export async function dispatchGovernedCapability({ userId, capabilityId }: DispatchRequest) {
  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    return {
      capability_id: GOVERNED_AGGREGATE_CAPABILITY,
      operator_id: GOVERNED_AGGREGATE_OPERATOR,
      operator_version: GOVERNED_AGGREGATE_OPERATOR_VERSION,
      result,
    };
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented") {
    throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);
  }

  switch (capabilityId) {
    case "outcome": {
      const result = await executeOutcomeOperator(userId);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "learning": {
      const result = await executeLearningOperator(userId);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "emergent": {
      const result = await executeEmergentOperator(userId);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    default:
      throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
