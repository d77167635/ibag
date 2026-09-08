import { computeFullIntelligence } from "./orchestrator.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type DispatchRequest = {
  userId: string;
  capabilityId: string;
};

/**
 * The single runtime dispatcher for governed capabilities.
 *
 * Only the aggregate capability is independently wired today. Catalog entries
 * marked planned are deliberately rejected rather than silently falling back to
 * the monolithic aggregate operator. This keeps catalog state and executable
 * runtime state truthful while the individual operators are implemented.
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

  throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
}
