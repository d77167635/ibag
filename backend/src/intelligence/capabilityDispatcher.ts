import { computeFullIntelligence } from "./orchestrator.js";
import { computeMultiWindowFlow } from "./temporal.js";
import { computeCategoryDrift } from "./behavioral.js";
import { computeCanonicalAnomalies } from "./anomalies.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeForwardProjection } from "./predictive.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

type DispatchRequest = {
  userId: string;
  capabilityId: string;
  parameters?: Record<string, unknown>;
};

function positiveInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`INVALID_CAPABILITY_PARAMETER: ${name}`);
  }
  return value;
}

function validAsOf(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error("INVALID_CAPABILITY_PARAMETER: asOf");
  }
  return value;
}

function validWindows(value: unknown): readonly number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("INVALID_CAPABILITY_PARAMETER: windows");
  }
  const windows = value.map((entry) => positiveInteger(entry, "windows"));
  if (windows.some((entry) => entry === undefined)) {
    throw new Error("INVALID_CAPABILITY_PARAMETER: windows");
  }
  return windows as number[];
}

/**
 * Single governed runtime boundary for independently executable capabilities.
 *
 * The aggregate remains available for compatibility, but corrected Iris now
 * exposes independently dispatchable operators where repository implementations
 * already satisfy the basic execution contract. Planned catalog entries are
 * rejected truthfully rather than silently falling back to the aggregate.
 */
export async function dispatchGovernedCapability({ userId, capabilityId, parameters = {} }: DispatchRequest) {
  if (!userId) throw new Error("INVALID_CAPABILITY_REQUEST: userId");

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
      const windows = validWindows(parameters.windows);
      const asOf = validAsOf(parameters.asOf);
      const result = await computeMultiWindowFlow(userId, windows, asOf);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "behavioral": {
      const recentDays = positiveInteger(parameters.recentDays, "recentDays");
      const baselineDays = positiveInteger(parameters.baselineDays, "baselineDays");
      if (recentDays !== undefined && baselineDays !== undefined && recentDays > baselineDays) {
        throw new Error("INVALID_CAPABILITY_PARAMETER: recentDays_exceeds_baselineDays");
      }
      const result = await computeCategoryDrift(userId, recentDays, baselineDays);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "anomaly": {
      const windowDays = positiveInteger(parameters.windowDays, "windowDays");
      const result = await computeCanonicalAnomalies(userId, windowDays);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "relationship": {
      const asOf = validAsOf(parameters.asOf);
      const result = await computeFinancialReasoning(userId, asOf);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    case "predictive": {
      const horizonDays = positiveInteger(parameters.horizonDays, "horizonDays");
      const asOf = validAsOf(parameters.asOf);
      const result = await computeForwardProjection(userId, horizonDays, asOf);
      return { capability_id: capabilityId, operator_id: operator.operator_id, operator_version: operator.version, result };
    }
    default:
      throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
