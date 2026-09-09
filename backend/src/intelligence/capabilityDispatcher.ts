import { computeFullIntelligence } from "./orchestrator.js";
import { computeMultiWindowFlow } from "./temporal.js";
import { computeCategoryDrift, type CategoryDrift } from "./behavioral.js";
import { computeCanonicalAnomalies } from "./anomalies.js";
import { computeFinancialReasoning } from "./relational.js";
import { computeForwardProjection } from "./predictive.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const GOVERNED_AGGREGATE_CAPABILITY = "iris.full_intelligence";
export const GOVERNED_AGGREGATE_OPERATOR = "computeFullIntelligence";
export const GOVERNED_AGGREGATE_OPERATOR_VERSION = "1";

export type CapabilityDependencyResult = {
  capability_id: string;
  operator_id: string;
  operator_version: string;
  tenant_id: string;
  epistemic_state: "OBSERVED" | "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE" | "LIMITED";
  result: unknown;
};

type DispatchRequest = {
  userId: string;
  capabilityId: string;
  parameters?: Record<string, unknown>;
  dependencyResults?: ReadonlyMap<string, CapabilityDependencyResult>;
  dependencyRequirements?: readonly { capability_id: string; relationship?: "requires" | "enhances" | "invalidates" }[];
};

function positiveInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new Error(`INVALID_CAPABILITY_PARAMETER: ${name}`);
  return value;
}

function validAsOf(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("INVALID_CAPABILITY_PARAMETER: asOf");
  return value;
}

function validWindows(value: unknown): readonly number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) throw new Error("INVALID_CAPABILITY_PARAMETER: windows");
  const windows = value.map((entry) => positiveInteger(entry, "windows"));
  if (windows.some((entry) => entry === undefined)) throw new Error("INVALID_CAPABILITY_PARAMETER: windows");
  return windows as number[];
}

function requireDependencies(
  capabilityId: string,
  requirements: readonly { capability_id: string; relationship?: "requires" | "enhances" | "invalidates" }[] | undefined,
  results: ReadonlyMap<string, CapabilityDependencyResult> | undefined,
): ReadonlyMap<string, CapabilityDependencyResult> {
  if (!requirements?.length) return results ?? new Map();
  if (!results) throw new Error(`CAPABILITY_DEPENDENCY_RESULTS_MISSING: ${capabilityId}`);
  for (const requirement of requirements) {
    if (requirement.relationship === "enhances" || requirement.relationship === "invalidates") continue;
    const dependency = results.get(requirement.capability_id);
    if (!dependency) throw new Error(`CAPABILITY_DEPENDENCY_RESULT_MISSING: ${capabilityId}->${requirement.capability_id}`);
    if (dependency.tenant_id === "" || dependency.tenant_id === undefined) throw new Error(`CAPABILITY_DEPENDENCY_TENANT_MISSING: ${capabilityId}->${requirement.capability_id}`);
    if (dependency.capability_id !== requirement.capability_id) throw new Error(`CAPABILITY_DEPENDENCY_ID_MISMATCH: ${capabilityId}->${requirement.capability_id}`);
    if (["SCENARIO", "INSUFFICIENT_EVIDENCE"].includes(dependency.epistemic_state)) {
      throw new Error(`CAPABILITY_DEPENDENCY_EPISTEMIC_BLOCKED: ${capabilityId}->${requirement.capability_id}:${dependency.epistemic_state}`);
    }
  }
  return results;
}

function dispatchResult(userId: string, capabilityId: string, operatorId: string, operatorVersion: string, result: unknown, epistemicState: CapabilityDependencyResult["epistemic_state"]): CapabilityDependencyResult {
  return { capability_id: capabilityId, operator_id: operatorId, operator_version: operatorVersion, tenant_id: userId, epistemic_state: epistemicState, result };
}

/** Single governed runtime boundary for independently executable capabilities. */
export async function dispatchGovernedCapability({ userId, capabilityId, parameters = {}, dependencyResults, dependencyRequirements }: DispatchRequest) {
  if (!userId) throw new Error("INVALID_CAPABILITY_REQUEST: userId");

  if (capabilityId === GOVERNED_AGGREGATE_CAPABILITY) {
    const result = await computeFullIntelligence(userId);
    return dispatchResult(userId, GOVERNED_AGGREGATE_CAPABILITY, GOVERNED_AGGREGATE_OPERATOR, GOVERNED_AGGREGATE_OPERATOR_VERSION, result, "CALCULATED");
  }

  const operator = getCapabilityOperator(capabilityId);
  if (!operator) throw new Error(`CAPABILITY_NOT_REGISTERED: ${capabilityId}`);
  if (operator.status !== "implemented") throw new Error(`CAPABILITY_NOT_RUNTIME_WIRED: ${capabilityId}`);
  const dependencies = requireDependencies(capabilityId, dependencyRequirements, dependencyResults);

  switch (capabilityId) {
    case "temporal": {
      const windows = validWindows(parameters.windows);
      const asOf = validAsOf(parameters.asOf);
      const result = await computeMultiWindowFlow(userId, windows, asOf);
      return dispatchResult(userId, capabilityId, operator.operator_id, operator.version, result, "CALCULATED");
    }
    case "behavioral": {
      const recentDays = positiveInteger(parameters.recentDays, "recentDays");
      const baselineDays = positiveInteger(parameters.baselineDays, "baselineDays");
      if (recentDays !== undefined && baselineDays !== undefined && recentDays > baselineDays) throw new Error("INVALID_CAPABILITY_PARAMETER: recentDays_exceeds_baselineDays");
      const temporal = dependencies.get("temporal")?.result;
      const temporalWindows = Array.isArray(temporal) ? temporal.map((flow) => (flow as { windowDays?: unknown }).windowDays).filter((value): value is number => typeof value === "number") : [];
      if (baselineDays !== undefined && temporalWindows.length && !temporalWindows.includes(baselineDays)) throw new Error("CAPABILITY_DEPENDENCY_SCOPE_MISMATCH: behavioral requires a matching temporal baseline window");
      const result: CategoryDrift[] = await computeCategoryDrift(userId, recentDays, baselineDays, temporalWindows);
      return dispatchResult(userId, capabilityId, operator.operator_id, operator.version, result, "CALCULATED");
    }
    case "anomaly": {
      const windowDays = positiveInteger(parameters.windowDays, "windowDays");
      const temporal = dependencies.get("temporal")?.result;
      const temporalWindows = Array.isArray(temporal) ? temporal.map((flow) => (flow as { windowDays?: unknown }).windowDays).filter((value): value is number => typeof value === "number") : [];
      if (windowDays !== undefined && temporalWindows.length && !temporalWindows.includes(windowDays)) throw new Error("CAPABILITY_DEPENDENCY_SCOPE_MISMATCH: anomaly requires a matching temporal window");
      const result = await computeCanonicalAnomalies(userId, windowDays);
      return dispatchResult(userId, capabilityId, operator.operator_id, operator.version, result, "CALCULATED");
    }
    case "relationship": {
      const asOf = validAsOf(parameters.asOf);
      const result = await computeFinancialReasoning(userId, asOf);
      return dispatchResult(userId, capabilityId, operator.operator_id, operator.version, result, "CALCULATED");
    }
    case "predictive": {
      const horizonDays = positiveInteger(parameters.horizonDays, "horizonDays");
      const asOf = validAsOf(parameters.asOf);
      const temporal = dependencies.get("temporal")?.result;
      if (!Array.isArray(temporal) || !temporal.length) throw new Error("CAPABILITY_DEPENDENCY_RESULT_INVALID: predictive requires temporal results");
      const result = await computeForwardProjection(userId, horizonDays, asOf, temporal);
      return dispatchResult(userId, capabilityId, operator.operator_id, operator.version, result, "PREDICTED");
    }
    default:
      throw new Error(`CAPABILITY_DISPATCH_UNIMPLEMENTED: ${capabilityId}`);
  }
}
