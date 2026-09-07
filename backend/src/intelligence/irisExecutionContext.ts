import type { IrisEvidenceReference, IrisExecutionPolicy, IrisResourceBudget, IrisRun } from "./irisExecutionTypes.js";

export interface IrisExecutionContext {
  readonly run: IrisRun;
  readonly evidence: readonly IrisEvidenceReference[];
  readonly temporal: {
    readonly as_of: string;
    readonly evidence_boundary: string | null;
  };
  readonly resource_budget: IrisResourceBudget;
  readonly execution_policy: IrisExecutionPolicy;
}

export function createExecutionContext(run: IrisRun, evidence: IrisEvidenceReference[]): IrisExecutionContext {
  return Object.freeze({
    run,
    evidence: Object.freeze([...evidence]),
    temporal: Object.freeze({ as_of: run.as_of, evidence_boundary: run.evidence_boundary }),
    resource_budget: Object.freeze({ ...run.resource_budget }),
    execution_policy: Object.freeze({ ...run.execution_policy, resource_budget: Object.freeze({ ...run.execution_policy.resource_budget }) }),
  });
}

/**
 * Converts the immutable execution boundary into the canonical date used by
 * temporal intelligence. This is deliberately strict: governed executions
 * must never silently fall back to the process clock.
 */
export function executionAsOfDate(context: IrisExecutionContext): Date {
  const date = new Date(context.temporal.as_of);
  if (!Number.isFinite(date.getTime())) throw new Error("IRIS_EXECUTION_CONTEXT_INVALID_AS_OF");
  return date;
}

export function executionEvidenceBoundary(context: IrisExecutionContext): string | null {
  return context.temporal.evidence_boundary;
}
