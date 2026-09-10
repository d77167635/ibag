import type { CapabilityPlan } from "./capabilityPlanner.js";
import { dispatchGovernedCapability } from "./capabilityDispatcher.js";
import type { CapabilityExecutionContext, CapabilityOperatorResult } from "./capabilityOperators.js";

export const RECURSIVE_CAPABILITY_EXECUTOR_VERSION = "iris-recursive-capability-executor-v1" as const;

export type ExecutionBudget = {
  maxNodes: number;
  maxEdges: number;
  maxCompositions: number;
};

type CapabilityDispatcher = (request: {
  userId: string;
  capabilityId: string;
  context?: CapabilityExecutionContext;
}) => Promise<CapabilityOperatorResult>;

export type RecursiveCapabilityExecutionResult = {
  executor_version: typeof RECURSIVE_CAPABILITY_EXECUTOR_VERSION;
  status: "COMPLETED" | "PARTIAL" | "BLOCKED" | "EXECUTION_BUDGET_EXCEEDED" | "FAILED";
  ordered_capabilities: string[];
  executed_capabilities: string[];
  results: Record<string, CapabilityOperatorResult>;
  failed_capability: string | null;
  error: string | null;
  resource_usage: {
    nodes: number;
    edges: number;
    compositions: number;
  };
};

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Execute the capability graph produced by the governed planner.
 *
 * The planner supplies a dependency-ordered graph. This executor deliberately
 * does not impose a semantic depth ceiling. Resource budgets are execution
 * controls only and therefore terminate with EXECUTION_BUDGET_EXCEEDED rather
 * than inventing a maximum intelligence level.
 *
 * The dispatcher is injectable for deterministic structural/runtime tests; the
 * production default is the governed capability dispatcher.
 */
export async function executeRecursiveCapabilityPlan(
  userId: string,
  plan: CapabilityPlan,
  context: CapabilityExecutionContext = {},
  budget: ExecutionBudget = { maxNodes: 10_000, maxEdges: 30_000, maxCompositions: 5_000 },
  dispatcher: CapabilityDispatcher = dispatchGovernedCapability,
): Promise<RecursiveCapabilityExecutionResult> {
  if (!finitePositive(budget.maxNodes) || !finitePositive(budget.maxEdges) || !finitePositive(budget.maxCompositions)) {
    throw new Error("INVALID_EXECUTION_BUDGET");
  }

  if (plan.status === "BLOCKED") {
    return {
      executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
      status: "BLOCKED",
      ordered_capabilities: [...plan.ordered_capabilities],
      executed_capabilities: [],
      results: {},
      failed_capability: null,
      error: plan.limitations.join(" | ") || "Capability plan is blocked.",
      resource_usage: { nodes: 0, edges: 0, compositions: 0 },
    };
  }

  if (plan.resource_estimate.nodes > budget.maxNodes || plan.resource_estimate.edges > budget.maxEdges || plan.resource_estimate.compositions > budget.maxCompositions) {
    return {
      executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
      status: "EXECUTION_BUDGET_EXCEEDED",
      ordered_capabilities: [...plan.ordered_capabilities],
      executed_capabilities: [],
      results: {},
      failed_capability: null,
      error: "The planned capability graph exceeds the execution budget; semantic hierarchy depth remains unbounded.",
      resource_usage: {
        nodes: plan.resource_estimate.nodes,
        edges: plan.resource_estimate.edges,
        compositions: plan.resource_estimate.compositions,
      },
    };
  }

  const results: Record<string, CapabilityOperatorResult> = {};
  const executed: string[] = [];
  let edges = 0;
  let compositions = 0;

  for (const capabilityId of plan.ordered_capabilities) {
    if (executed.length >= budget.maxNodes) {
      return {
        executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
        status: "EXECUTION_BUDGET_EXCEEDED",
        ordered_capabilities: [...plan.ordered_capabilities],
        executed_capabilities: executed,
        results,
        failed_capability: null,
        error: "Node execution budget exhausted before the planned graph completed.",
        resource_usage: { nodes: executed.length, edges, compositions },
      };
    }

    const contract = plan.contracts.find((candidate) => candidate.capability_id === capabilityId);
    const dependencies = Array.isArray(contract?.dependencies)
      ? contract.dependencies.filter((dependency): dependency is string => typeof dependency === "string")
      : [];

    edges += dependencies.length;
    compositions += contract?.recursive || contract?.cross_domain ? 1 : 0;
    if (edges > budget.maxEdges || compositions > budget.maxCompositions) {
      return {
        executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
        status: "EXECUTION_BUDGET_EXCEEDED",
        ordered_capabilities: [...plan.ordered_capabilities],
        executed_capabilities: executed,
        results,
        failed_capability: null,
        error: "Execution budget exhausted while traversing the governed dependency graph.",
        resource_usage: { nodes: executed.length, edges, compositions },
      };
    }

    const dependencyResults: Record<string, CapabilityOperatorResult> = {};
    for (const dependency of dependencies) {
      const dependencyResult = results[dependency];
      if (!dependencyResult) {
        return {
          executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
          status: "FAILED",
          ordered_capabilities: [...plan.ordered_capabilities],
          executed_capabilities: executed,
          results,
          failed_capability: capabilityId,
          error: `DEPENDENCY_RESULT_MISSING: ${capabilityId} requires ${dependency}.`,
          resource_usage: { nodes: executed.length, edges, compositions },
        };
      }
      dependencyResults[dependency] = dependencyResult;
    }

    try {
      const result = await dispatcher({
        userId,
        capabilityId,
        context: {
          ...context,
          dependencyResults,
        },
      });
      results[capabilityId] = result;
      executed.push(capabilityId);
    } catch (error) {
      return {
        executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
        status: "FAILED",
        ordered_capabilities: [...plan.ordered_capabilities],
        executed_capabilities: executed,
        results,
        failed_capability: capabilityId,
        error: error instanceof Error ? error.message : String(error),
        resource_usage: { nodes: executed.length, edges, compositions },
      };
    }
  }

  return {
    executor_version: RECURSIVE_CAPABILITY_EXECUTOR_VERSION,
    status: "COMPLETED",
    ordered_capabilities: [...plan.ordered_capabilities],
    executed_capabilities: executed,
    results,
    failed_capability: null,
    error: null,
    resource_usage: { nodes: executed.length, edges, compositions },
  };
}
