/**
 * Canonical execution contract for corrected Iris capabilities.
 * This contract deliberately separates implementation from certification.
 */
export type CapabilityExecutionStatus = "REQUESTED" | "PLANNED" | "RUNNING" | "VALIDATING" | "CERTIFIED" | "PUBLISHED" | "FAILED" | "STALE" | "SUPERSEDED";
export type EpistemicState = "OBSERVED" | "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE" | "LIMITED";

export interface CapabilityEvidenceRequirement {
  domain: string;
  required: boolean;
  minimum_coverage?: number;
  freshness_days?: number;
}

export interface CapabilityDependency {
  capability_id: string;
  relationship: "requires" | "enhances" | "invalidates";
}

export interface CapabilityContract<I = unknown, O = unknown> {
  capability_id: string;
  version: string;
  semantic_definition: string;
  inputs: string[];
  output_schema: string;
  required_evidence: CapabilityEvidenceRequirement[];
  dependencies: CapabilityDependency[];
  execution_method: string;
  epistemic_ceiling: EpistemicState;
  validation_rules: string[];
  refresh_policy: string;
  failure_policy: string;
  presentation_policy: string;
  accepts: (input: I) => boolean;
  validateOutput: (output: O) => boolean;
}

export interface CapabilityExecutionEnvelope<O = unknown> {
  result_id: string;
  capability_id: string;
  capability_version: string;
  status: CapabilityExecutionStatus;
  epistemic_state: EpistemicState;
  tenant_id: string;
  evidence_scope: string[];
  observation_window: { from: string | null; to: string | null };
  information_cutoff: string;
  analysis_time: string;
  ontology_version: string;
  model_version: string;
  parameters: Record<string, unknown>;
  result: O;
  limitations: string[];
  lineage: string[];
}

export function createCapabilityResultId(capabilityId: string, analysisTime: string, parameterFingerprint: string): string {
  return `${capabilityId}:${analysisTime}:${parameterFingerprint}`;
}
