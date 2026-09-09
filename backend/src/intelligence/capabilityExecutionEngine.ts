import { dispatchGovernedCapability, type CapabilityDependencyResult } from "./capabilityDispatcher.js";
import type { CapabilityPlan } from "./capabilityPlanner.js";

export type ExecutedCapability = CapabilityDependencyResult & {
  execution_index: number;
  dependencies: string[];
};

function dependencyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object" && "capability_id" in entry && typeof entry.capability_id === "string") return [entry.capability_id];
    return [];
  });
}

/**
 * Executes the planned DAG in deterministic topological order. A child receives
 * only the dependency results explicitly declared by its governed contract.
 * No child is permitted to synthesize a missing dependency or reach into the
 * complete runtime result set.
 */
export async function executeCapabilityPlan(userId: string, plan: CapabilityPlan, parameters: Record<string, unknown> = {}): Promise<ReadonlyMap<string, ExecutedCapability>> {
  if (plan.status === "BLOCKED") throw new Error(`CAPABILITY_PLAN_BLOCKED: ${plan.limitations.join(" | ")}`);

  const contracts = new Map(plan.contracts.map(contract => [contract.capability_id, contract]));
  const results = new Map<string, ExecutedCapability>();
  const ordered = [...plan.ordered_capabilities];

  for (let index = 0; index < ordered.length; index += 1) {
    const capabilityId = ordered[index];
    const contract = contracts.get(capabilityId);
    if (!contract) throw new Error(`CAPABILITY_CONTRACT_MISSING_AT_EXECUTION: ${capabilityId}`);

    const dependencyResults = new Map<string, CapabilityDependencyResult>();
    const dependencies = dependencyIds(contract.dependencies);
    for (const dependencyId of dependencies) {
      const dependency = results.get(dependencyId);
      if (!dependency) throw new Error(`CAPABILITY_DEPENDENCY_RESULT_MISSING: ${capabilityId}->${dependencyId}`);
      if (dependency.tenant_id !== userId) throw new Error(`CAPABILITY_DEPENDENCY_TENANT_MISMATCH: ${capabilityId}->${dependencyId}`);
      const dependencyContract = contracts.get(dependencyId);
      if (!dependencyContract) throw new Error(`CAPABILITY_DEPENDENCY_CONTRACT_MISSING: ${capabilityId}->${dependencyId}`);
      if (dependency.operator_version !== dependencyContract.operator_version) {
        throw new Error(`CAPABILITY_DEPENDENCY_VERSION_MISMATCH: ${capabilityId}->${dependencyId}`);
      }
      dependencyResults.set(dependencyId, dependency);
    }

    const dispatched = await dispatchGovernedCapability({
      userId,
      capabilityId,
      parameters,
      dependencyResults,
      dependencyRequirements: dependencies.map(capability_id => ({ capability_id, relationship: "requires" as const })),
    });

    if (dispatched.tenant_id !== userId) throw new Error(`CAPABILITY_RESULT_TENANT_MISMATCH: ${capabilityId}`);
    if (dispatched.capability_id !== capabilityId) throw new Error(`CAPABILITY_RESULT_ID_MISMATCH: ${capabilityId}`);
    if (dispatched.operator_version !== contract.operator_version) throw new Error(`CAPABILITY_RESULT_VERSION_MISMATCH: ${capabilityId}`);

    results.set(capabilityId, { ...dispatched, execution_index: index, dependencies });
  }

  return results;
}
