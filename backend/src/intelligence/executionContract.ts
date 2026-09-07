export type EvidenceState =
  | "observed"
  | "calculated"
  | "inferred"
  | "predicted"
  | "scenario"
  | "limited"
  | "insufficient_evidence"
  | "contradicted"
  | "stale";

export interface CapabilityContract {
  capabilityId: string;
  version: string;
  operatorId: string;
  operatorVersion: string;
  evidenceRequirements: string[];
  dependencies: string[];
  validationRules: string[];
  outputType: string;
  recursive: boolean;
  crossDomain: boolean;
}

export interface ExecutionBudget {
  maxExecutionTimeMs: number;
  maxMemoryBytes: number;
  maxGraphNodes: number;
  maxGraphEdges: number;
  maxCompositions: number;
  maxInvestigations: number;
  maxProviderAcquisitions: number;
  maxConcurrentRuns: number;
}

export const DEFAULT_EXECUTION_BUDGET: ExecutionBudget = {
  maxExecutionTimeMs: 30_000,
  maxMemoryBytes: 256 * 1024 * 1024,
  maxGraphNodes: 10_000,
  maxGraphEdges: 50_000,
  maxCompositions: 2_000,
  maxInvestigations: 500,
  maxProviderAcquisitions: 0,
  maxConcurrentRuns: 2,
};

export function normalizeEvidenceState(value: unknown): EvidenceState {
  const normalized = String(value ?? "").toLowerCase();
  const allowed: EvidenceState[] = [
    "observed", "calculated", "inferred", "predicted", "scenario",
    "limited", "insufficient_evidence", "contradicted", "stale",
  ];
  return allowed.includes(normalized as EvidenceState)
    ? normalized as EvidenceState
    : "limited";
}

export function isDirectProviderObservation(state: unknown): boolean {
  return normalizeEvidenceState(state) === "observed";
}
