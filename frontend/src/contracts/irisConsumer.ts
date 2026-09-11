export type ConsumerEvidenceState = "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence" | "unknown";
export type ConsumerReportState = "ready" | "limited" | "suppressed";
export type ConsumerRuntimeLineageState = "resolved" | "partially_resolved" | "unresolved";

export interface ConsumerReportRuntimeLineage {
  resolution_state: ConsumerRuntimeLineageState;
  report_id: string;
  analysis_definition_id: string;
  feature_ids: string[];
  capability_ids: string[];
  intelligence_node_ids: string[];
  upstream_intelligence_node_ids: string[];
  run_evidence_ids: string[];
  evidence_lineage_present: boolean;
  run_id: string;
  execution_id: string;
  limitation: string | null;
}

export interface ConsumerReportProduct {
  report_id: string; analysis_id: string; analysis_name: string; family: string; output: string; purpose: string;
  state: ConsumerReportState; evidence_publication_state: ConsumerEvidenceState; evidence_coverage: number;
  blockers: string[]; missing_evidence: string[]; headline_intelligence_node_id: string | null; headline_reason: string | null;
  runtime_lineage: ConsumerReportRuntimeLineage | null; qualification: string | null;
  provenance: { source: "Iris analysis atlas"; analytical_definition_id: string; provider_observations_created: false; financial_values_created: false; money_movement_executed: false };
}

export interface IrisConsumerIntelligenceResponse {
  run_id: string; execution_id: string | null; run_status: string; certified: boolean; certification_gate: unknown; generated_at: string | null;
  selected_report_ids: string[]; report_catalog: unknown[];
  intelligence_output_runtime: { outputs: ConsumerReportProduct[]; publishable: ConsumerReportProduct[]; ready_outputs: ConsumerReportProduct[]; limited_outputs: ConsumerReportProduct[]; suppressed_outputs: ConsumerReportProduct[] };
  publication_boundary: unknown; [key: string]: unknown;
}

export interface IrisReverseLineageResponse {
  resolution_state: "resolved" | "unresolved";
  evidence_id: string; run_id: string; execution_id: string;
  intelligence_node_ids: string[]; capability_ids: string[]; report_ids: string[];
  limitation: string | null;
  traversal: "evidence -> intelligence -> report";
  catalog_metadata_is_not_evidence: true;
}
