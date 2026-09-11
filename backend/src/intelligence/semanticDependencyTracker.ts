import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type DependencyReadTracker = { dependencies: Record<string, CapabilityOperatorResult>; consumed_dependency_ids: Set<string>; consumed_dependency_paths: Record<string, Set<string>> };
function proxify(value: unknown, path: string, onRead: (path: string) => void): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return new Proxy(value, { get(target, property, receiver) { if (typeof property === "string") onRead(`${path}.${property}`); const next = Reflect.get(target, property, receiver); return proxify(next, `${path}.${String(property)}`, onRead); }, ownKeys(target) { onRead(path); return Reflect.ownKeys(target); } });
  return new Proxy(value as Record<string, unknown>, { get(target, property, receiver) { const propertyPath = `${path}.${String(property)}`; onRead(propertyPath); const next = Reflect.get(target, property, receiver); return proxify(next, propertyPath, onRead); }, ownKeys(target) { onRead(path); return Reflect.ownKeys(target); } });
}
/** Runtime execution receipt for dependency object/field access; not proof of mathematical sufficiency. */
export function trackDependencyReads(dependencies: Record<string, CapabilityOperatorResult>): DependencyReadTracker {
  const consumed_dependency_ids = new Set<string>();
  const consumed_dependency_paths: Record<string, Set<string>> = {};
  const tracked: Record<string, CapabilityOperatorResult> = {};
  for (const [id, dependency] of Object.entries(dependencies)) { consumed_dependency_paths[id] = new Set<string>(); tracked[id] = proxify(dependency, "root", (path) => { consumed_dependency_ids.add(id); consumed_dependency_paths[id].add(path); }) as CapabilityOperatorResult; }
  return { dependencies: tracked, consumed_dependency_ids, consumed_dependency_paths };
}
