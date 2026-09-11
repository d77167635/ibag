export type ConsumerEvidenceState =
  | "observed"
  | "calculated"
  | "inferred"
  | "limited"
  | "insufficient_evidence"
  | "unknown";

export type ConsumerReportState = "ready" | "limited" | "suppressed";

export interface ConsumerReportProduct {
  report_id: string;
  analysis_id: string;
  analysis_name: string;
  family: string;
  output: string;
  purpose: string;
  state: ConsumerReportState;
  evidence_publication_state: ConsumerEvidenceState;
  evidence_coverage: number;
  blockers: string[];
  missing_evidence: string[];
  qualification: string | null;
  provenance: {
    source: "Iris analysis atlas";
    analytical_definition_id: string;
    provider_observations_created: false;
    financial_values_created: false;
    money_movement_executed: false;
  };
}

export interface IrisConsumerIntelligenceResponse {
  run_id: string;
  execution_id: string | null;
  run_status: string;
  certified: boolean;
  certification_gate: unknown;
  generated_at: string | null;
  selected_report_ids: string[];
  report_catalog: unknown[];
  intelligence_output_runtime: {
    outputs: ConsumerReportProduct[];
    publishable: ConsumerReportProduct[];
    ready_outputs: ConsumerReportProduct[];
    limited_outputs: ConsumerReportProduct[];
    suppressed_outputs: ConsumerReportProduct[];
  };
  publication_boundary: unknown;
  [key: string]: unknown;
}
