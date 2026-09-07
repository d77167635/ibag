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
