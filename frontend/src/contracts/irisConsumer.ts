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
  transformation_edge_ids: string[];
  run_evidence_ids: string[];
  evidence_lineage_present: boolean;
  run_id: string;
  execution_id: string;
  limitation: string | null;
}

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
  headline_intelligence_node_id: string | null;
  headline_reason: string | null;
  runtime_lineage: ConsumerReportRuntimeLineage | null;
  qualification: string | null;
  provenance: {
    source: "Iris analysis atlas";
    analytical_definition_id: string;
    provider_observations_created: false;
    financial_values_created: false;
    money_movement_executed: false;
  };
}

/**
 * The governed /iris/intelligence response deliberately publishes the
 * established intelligence metrics alongside the evidence-gated report
 * publication runtime. These fields mirror the backend route's published
 * response shape; they are not synthetic client-side financial data.
 */
export interface IrisConsumerIntelligenceResponse {
  run_id: string;
  execution_id: string | null;
  run_status: string;
  certified: boolean;
  certification_gate: unknown;
  generated_at: string | null;
  narrative: string;
  net_worth: {
    liquid_assets: number | null;
    as_of: string | null;
  };
  debt_health: {
    revolving_debt: number | null;
    credit_utilization: number | null;
    change_pct_30d: number | null;
    interest_cost_attribution: {
      estimatedMonthlyInterestCost: number | null;
      weightedAvgApr: number | null;
      evidence: string;
    } | null;
    as_of: string | null;
  };
  cash_flow_safety: {
    safeToSpend: number | null;
    currentAvailable: number | null;
    essentialBillsTotal: number;
    upcomingBills: { merchant: string; amount: number; expectedDate: string }[];
    billCollisions: { window_start: string; bills: string[] }[];
    horizonDays: number;
  };
  roundup_projection: {
    dailyRate: number | null;
    projected: number | null;
    basisDays: number;
    projectDays?: number;
  };
  cash_flow: {
    inflow: number | null;
    outflow: number | null;
    net: number | null;
    netChangePct: number | null;
    windowDays: number;
  };
  spending_by_domain: {
    key: string;
    label: string;
    amount: number;
    changePct: number | null;
  }[];
  spending_hierarchy: {
    key: string;
    label: string;
    amount: number;
    pctOfTotal: number;
    subdomains: { label: string; amount: number }[];
  }[];
  balance_history: { date: string; liquidAssets: number }[];
  forward_projection: {
    series: { date: string; balance: number; event: string | null }[];
    basis: string;
  };
  anomalies: {
    merchant: string;
    amount: number;
    typicalAmount: number;
    date: string;
    pctAboveTypical: number;
  }[];
  category_drift: {
    subdomainKey: string;
    subdomainLabel: string;
    recentDailyAvg: number;
    baselineDailyAvg: number;
    deviationPct: number;
    significant: boolean;
    evidence: string;
    baselineTransactionCount: number;
  }[];
  reasoning: {
    risks: {
      key: string;
      severity: "low" | "medium" | "high";
      evidence: string;
      statement: string;
      supportingMetrics: Record<string, number | string | null>;
    }[];
    opportunities: {
      key: string;
      evidence: string;
      statement: string;
      supportingMetrics: Record<string, number | string | null>;
    }[];
    relationalChain: string[];
    unresolvedQuestions: string[];
    priorityFocus: { key: string; reason: string } | null;
    generatedAt: string;
  } | null;
  maximum_intelligence: unknown;
  feature_flags: Record<string, boolean>;
  selected_report_ids: string[];
  report_catalog: unknown[];
  feature_runtime: unknown;
  intelligence_output_runtime: {
    outputs: ConsumerReportProduct[];
    publishable: ConsumerReportProduct[];
    ready_outputs: ConsumerReportProduct[];
    limited_outputs: ConsumerReportProduct[];
    suppressed_outputs: ConsumerReportProduct[];
  };
  report_certification_runtime?: unknown;
  publication_boundary: unknown;
  [key: string]: unknown;
}

export interface IrisReverseLineageResponse {
  resolution_state: "resolved" | "partially_resolved" | "unresolved";
  evidence_id: string;
  run_id: string;
  execution_id: string;
  intelligence_node_ids: string[];
  capability_ids: string[];
  transformation_edge_ids: string[];
  report_ids: string[];
  limitation: string | null;
  traversal: "evidence -> intelligence -> report";
  catalog_metadata_is_not_evidence: true;
}
