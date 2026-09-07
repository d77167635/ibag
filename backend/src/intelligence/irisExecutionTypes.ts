export type IrisRunStatus =
  | "PLANNED" | "EXECUTING" | "EXECUTED" | "VALIDATING" | "VALIDATED" | "CERTIFYING" | "CERTIFIED"
  | "FAILED" | "VALIDATION_FAILED" | "NOT_CERTIFIED";
export type IrisExecutionState = "PLANNED" | "EXECUTING" | "EXECUTED" | "FAILED";
export type IrisValidationState = "UNKNOWN" | "PASS" | "FAIL" | "LIMITED";
export type IrisCertificationState = "PENDING" | "CERTIFIED" | "NOT_CERTIFIED";
export type IrisDeliveryState = "PENDING" | "DELIVERED" | "WITHHELD";
export type IrisEvidenceState = "OBSERVED" | "CALCULATED" | "INFERRED" | "LIMITED" | "INSUFFICIENT_EVIDENCE";

export interface IrisResourceBudget {
  max_execution_time_ms: number;
  max_memory_budget_mb: number;
  max_graph_nodes: number;
  max_graph_edges: number;
  max_compositions: number;
  max_investigations: number;
  max_provider_acquisitions: number;
  max_concurrent_runs: number;
}
export interface IrisExecutionPolicy {
  version: string;
  certification_policy_version: string;
  resource_budget: IrisResourceBudget;
  allow_limited_delivery: boolean;
}
export interface IrisEvidenceReference {
  evidence_type: string;
  provider?: string | null;
  product?: string | null;
  receipt_id?: string | null;
  product_observation_id?: string | null;
  raw_observation_id?: string | null;
  source_field_id?: string | null;
  effective_at?: string | null;
  acquired_at?: string | null;
  evidence_hash: string;
}
export interface IrisRun {
  id: string; request_id: string; user_id: string; request_surface: string; request_mode: string;
  requested_capabilities: string[]; status: IrisRunStatus; as_of: string; evidence_boundary: string | null;
  evidence_version: string | null; resource_budget: IrisResourceBudget; execution_policy: IrisExecutionPolicy;
  planner_version: string; orchestrator_version: string; certification_policy_version: string;
  financial_context_hash: string | null; evidence_manifest_hash: string | null; started_at: string | null;
  completed_at: string | null; failure_code: string | null; failure_message: string | null; created_at: string; updated_at: string;
}
export interface IrisExecutionInput {
  id?: string; execution_id: string; input_type: string; reference_type: string; reference_id: string; role: string; hash: string;
}
export interface IrisExecutionOutput {
  id?: string; execution_id: string; output_key: string; output_type: string; value: unknown; hash: string;
  evidence_state: IrisEvidenceState; uncertainty?: Record<string, unknown> | null;
}
export interface IrisExecutionRecord {
  id: string; run_id: string; user_id: string; capability_id: string; operator_id: string; operator_version: string;
  execution_state: IrisExecutionState; started_at: string; completed_at: string | null; input_hash: string | null;
  output_hash: string | null; evidence_state: IrisEvidenceState; input_manifest: unknown; output_snapshot: unknown;
  validation_status: IrisValidationState; certification_status: IrisCertificationState; resource_usage: Record<string, unknown> | null;
  error_code: string | null; error_message: string | null;
}
export interface IrisValidationResult {
  id: string; run_id: string; execution_id: string | null; user_id: string; rule_id: string; rule_version: string;
  status: IrisValidationState; severity: "INFO" | "WARNING" | "CRITICAL"; expected: unknown; actual: unknown;
  details: Record<string, unknown> | null; created_at: string;
}
export interface IrisCertification {
  id: string; run_id: string; execution_id: string | null; user_id: string; result_id: string | null; policy_version: string;
  status: IrisCertificationState; validation_snapshot: unknown; reconciliation_snapshot: unknown; evidence_snapshot: unknown;
  certification_hash: string | null; certified_at: string | null; created_at: string;
}
export interface IrisResult {
  result_id: string; run_id: string; capability_id: string; generated_at: string; evidence_as_of: string | null;
  evidence_version: string | null; observation_window: Record<string, unknown> | null; execution_state: IrisExecutionState;
  validation_state: IrisValidationState; certification_state: IrisCertificationState; delivery_state: IrisDeliveryState;
  evidence_state: IrisEvidenceState; values: unknown; uncertainty: Record<string, unknown> | null;
  limitations: string[]; provenance: IrisEvidenceReference[];
}