import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type DependencyReadTracker = {
  dependencies: Record<string, CapabilityOperatorResult>;
  consumed_dependency_ids: Set<string>;
};

/**
 * Tracks actual property reads on dependency results during operator execution.
 * This proves runtime consumption at the JavaScript object boundary; it does not
 * claim that a read was semantically sufficient for the operator's mathematical
 * transformation. Semantic sufficiency remains a contract/validation concern.
 */
export function trackDependencyReads(
  dependencies: Record<string, CapabilityOperatorResult>,
): DependencyReadTracker {
  const consumed_dependency_ids = new Set<string>();
  const tracked: Record<string, CapabilityOperatorResult> = {};

  for (const [id, dependency] of Object.entries(dependencies)) {
    tracked[id] = new Proxy(dependency, {
      get(target, property, receiver) {
        consumed_dependency_ids.add(id);
        return Reflect.get(target, property, receiver);
      },
    });
  }

  return { dependencies: tracked, consumed_dependency_ids };
}
