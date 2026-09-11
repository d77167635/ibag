import type { CapabilityPlan } from "./capabilityPlanner.js";
import { dispatchGovernedCapability } from "./capabilityDispatcher.js";
import type { CapabilityExecutionContext, CapabilityOperatorResult } from "./capabilityOperators.js";
import { trackDependencyReads } from "./semanticDependencyTracker.js";
import { buildSemanticDependencyProof } from "./semanticDependencyProof.js";
import { persistSemanticDependencyProof } from "./semanticDependencyPersistence.js";
import { validateSemanticDependencyPaths } from "./semanticDependencyContract.js";

export const RECURSIVE_CAPABILITY_EXECUTOR_VERSION = "iris-recursive-capability-executor-v8" as const;
export type ExecutionBudget = { maxNodes: number; maxEdges: number; maxCompositions: number };
type CapabilityDispatcher = (request: { userId: string; capabilityId: string; context?: CapabilityExecutionContext }) => Promise<CapabilityOperatorResult>;
export type RecursiveCapabilityExecutionResult = { executor_version: typeof RECURSIVE_CAPABILITY_EXECUTOR_VERSION; status: "COMPLETED" | "PARTIAL" | "BLOCKED" | "EXECUTION_BUDGET_EXCEEDED" | "FAILED"; ordered_capabilities: string[]; executed_capabilities: string[]; results: Record<string, CapabilityOperatorResult>; failed_capability: string | null; error: string | null; resource_usage: { nodes: number; edges: number; compositions: number }; dependency_consumption: Record<string, string[]> };
function finiteNonNegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function finish(plan: CapabilityPlan, status: RecursiveCapabilityExecutionResult["status"], executed_capabilities: string[], results: Record<string, CapabilityOperatorResult>, failed_capability: string | null, error: string | null, nodes: number, edges: number, compositions: number, dependency_consumption: Record<string, string[]> = {}): RecursiveCapabilityExecutionResult { return { executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION, status, ordered_capabilities: [...plan.ordered_capabilities], executed_capabilities, results, failed_capability, error, resource_usage: { nodes, edges, compositions }, dependency_consumption }; }

/** Execute the governed dependency graph with execution budgets, never a semantic depth ceiling. */
export async function executeRecursiveCapabilityPlan(userId: string, plan: CapabilityPlan, context: CapabilityExecutionContext = {}, budget: ExecutionBudget = { maxNodes: 10_000, maxEdges: 30_000, maxCompositions: 5_000 }, dispatcher: CapabilityDispatcher = dispatchGovernedCapability): Promise<RecursiveCapabilityExecutionResult> {
  if (!finiteNonNegative(budget.maxNodes) || !finiteNonNegative(budget.maxEdges) || !finiteNonNegative(budget.maxCompositions)) throw new Error("INVALID_EXECUTION_BUDGET");
  if (plan.status === "BLOCKED") return finish(plan, "BLOCKED", [], {}, null, plan.limitations.join(" | ") || "Capability plan is blocked.", 0, 0, 0);
  const ordered = plan.ordered_capabilities;
  const unique = new Set(ordered);
  if (unique.size !== ordered.length) return finish(plan, "FAILED", [], {}, null, "INVALID_CAPABILITY_GRAPH: duplicate capability path detected.", 0, 0, 0);
  if (plan.resource_estimate.nodes > budget.maxNodes || plan.resource_estimate.edges > budget.maxEdges || plan.resource_estimate.compositions > budget.maxCompositions) return finish(plan, "EXECUTION_BUDGET_EXCEEDED", [], {}, null, "The planned capability graph exceeds the execution budget; semantic hierarchy depth remains unbounded.", plan.resource_estimate.nodes, plan.resource_estimate.edges, plan.resource_estimate.compositions);

  const contractById = new Map(plan.contracts.map((contract) => [contract.capability_id, contract]));
  const results: Record<string, CapabilityOperatorResult> = {};
  const graphNodeIds: Record<string, string> = {};
  const dependencyConsumption: Record<string, string[]> = {};
  const executed: string[] = [];
  let edges = 0;
  let compositions = 0;

  for (const capabilityId of ordered) {
    if (executed.length >= budget.maxNodes) return finish(plan, "EXECUTION_BUDGET_EXCEEDED", executed, results, null, "Node execution budget exhausted before the planned graph completed.", executed.length, edges, compositions, dependencyConsumption);
    const contract = contractById.get(capabilityId);
    if (!contract) return finish(plan, "FAILED", executed, results, capabilityId, `CAPABILITY_CONTRACT_MISSING: ${capabilityId}.`, executed.length, edges, compositions, dependencyConsumption);
    const dependencies = Array.isArray(contract.dependencies) ? contract.dependencies.filter((dependency): dependency is string => typeof dependency === "string" && dependency.length > 0) : [];
    edges += dependencies.length;
    if (contract.recursive || contract.cross_domain) compositions += 1;
    if (edges > budget.maxEdges || compositions > budget.maxCompositions) return finish(plan, "EXECUTION_BUDGET_EXCEEDED", executed, results, null, "Execution budget exhausted while traversing the governed dependency graph.", executed.length, edges, compositions, dependencyConsumption);

    const dependencyResults: Record<string, CapabilityOperatorResult> = {};
    const dependencyNodeIds: Record<string, string> = {};
    for (const dependency of dependencies) {
      if (!unique.has(dependency)) return finish(plan, "FAILED", executed, results, capabilityId, `DEPENDENCY_NOT_IN_PLAN: ${capabilityId} requires ${dependency}.`, executed.length, edges, compositions, dependencyConsumption);
      const dependencyResult = results[dependency];
      if (!dependencyResult) return finish(plan, "FAILED", executed, results, capabilityId, `DEPENDENCY_RESULT_MISSING: ${capabilityId} requires ${dependency}.`, executed.length, edges, compositions, dependencyConsumption);
      dependencyResults[dependency] = dependencyResult;
      const dependencyNodeId = graphNodeIds[dependency];
      if (dependencyNodeId) dependencyNodeIds[dependency] = dependencyNodeId;
    }

    try {
      const tracked = trackDependencyReads(dependencyResults);
      const operatorResult = await dispatcher({ userId, capabilityId, context: { ...context, dependencyResults: tracked.dependencies } });
      const consumed = [...tracked.consumed_dependency_ids].sort();
      dependencyConsumption[capabilityId] = consumed;
      if (!operatorResult || operatorResult.capability_id !== capabilityId) return finish(plan, "FAILED", executed, results, capabilityId, `INVALID_OPERATOR_RESULT: ${capabilityId}.`, executed.length, edges, compositions, dependencyConsumption);
      const missingReads = dependencies.filter((dependency) => !tracked.consumed_dependency_ids.has(dependency));
      if (missingReads.length) return finish(plan, "FAILED", executed, results, capabilityId, `SEMANTIC_DEPENDENCY_NOT_READ: ${capabilityId} did not read declared dependency result(s): ${missingReads.join(", ")}.`, executed.length, edges, compositions, dependencyConsumption);
      const missingSemanticPaths = validateSemanticDependencyPaths(capabilityId, tracked.consumed_dependency_paths);
      if (missingSemanticPaths.length) return finish(plan, "FAILED", executed, results, capabilityId, `SEMANTIC_TRANSFORMATION_REQUIREMENT_NOT_MET: ${capabilityId} did not access required dependency path(s): ${missingSemanticPaths.join(", ")}.`, executed.length, edges, compositions, dependencyConsumption);

      results[capabilityId] = operatorResult;
      executed.push(capabilityId);
      const proof = buildSemanticDependencyProof(capabilityId, consumed, dependencyResults, tracked.consumed_dependency_paths, operatorResult);
      if (context.runId && context.executionId) {
        if (context.persistSemanticDependencyProof) await context.persistSemanticDependencyProof({ capabilityId, dependencyResults, consumedDependencyIds: consumed, result: operatorResult, proof });
        else await persistSemanticDependencyProof({ userId, runId: context.runId, executionId: context.executionId, capabilityId, dependencyResults, consumedDependencyIds: consumed, result: operatorResult, proof });
      }
      if (context.persistGraphNode && context.runId && context.executionId) {
        const graphNode = await context.persistGraphNode({ capabilityId, result: operatorResult, dependencyResults, dependencyNodeIds });
        if (!graphNode?.id) return finish(plan, "FAILED", executed, results, capabilityId, `INTELLIGENCE_GRAPH_NODE_ID_MISSING: ${capabilityId}.`, executed.length, edges, compositions, dependencyConsumption);
        graphNodeIds[capabilityId] = graphNode.id;
      }
      if (context.persistLineage && context.runId && context.executionId) await context.persistLineage({ capabilityId, result: operatorResult, dependencyResults });
    } catch (error) {
      return finish(plan, "FAILED", executed, results, capabilityId, error instanceof Error ? error.message : String(error), executed.length, edges, compositions, dependencyConsumption);
    }
  }
  if (executed.length !== ordered.length) return finish(plan, "PARTIAL", executed, results, null, "CAPABILITY_GRAPH_PARTIAL: not every planned capability executed.", executed.length, edges, compositions, dependencyConsumption);
  return finish(plan, "COMPLETED", executed, results, null, null, executed.length, edges, compositions, dependencyConsumption);
}
