import { computeFullIntelligence } from "./orchestrator.js";
import { computeMultiWindowFlow } from "./temporal.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeCanonicalAnomalies } from "./anomalies.js";
import { computeFinancialReasoning } from "./relational.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type DispatchRequest = {
  userId: string;
  capabilityId: string;
  parameters?: Record<string, unknown>;
};

/**
 * Single governed runtime boundary for independently executable capabilities.
 *
 * The aggregate remains available for compatibility, but corrected Iris now
 * exposes independently dispatchable operators where repository implementations
 * already satisfy the basic execution contract. Planned catalog entries are
 * rejected truthfully rather than silently falling back to the aggregate.
 */
export async function dispatchGovernedCapability({ userId, capabilityId, parameters = {} }: DispatchRequest) {
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
    case "temporal": {
      const windows = Array.isArray(parameters.windows)
        ? parameters.windows.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) as any
        : undefined;
      const asOf = typeof parameters.asOf === "string" ? parameters.asOf : undefined;
      const result = await computeMultiWindowFlow(userId, windows, asOf);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "behavioral": {
      const recentDays = typeof parameters.recentDays === "number" ? parameters.recentDays : undefined;
      const baselineDays = typeof parameters.baselineDays === "number" ? parameters.baselineDays : undefined;
      const result = await computeCategoryDrift(userId, recentDays, baselineDays);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "anomaly": {
      const windowDays = typeof parameters.windowDays === "number" ? parameters.windowDays : undefined;
      const result = await computeCanonicalAnomalies(userId, windowDays);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "relationship": {
      const asOf = typeof parameters.asOf === "string" ? parameters.asOf : undefined;
      const result = await computeFinancialReasoning(userId, asOf);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    default:
      throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
