export const UNIFIED_DASHBOARD_SCHEMA_VERSION = "IRIS_UNIFIED_DASHBOARD_V1" as const;

export interface UnifiedDashboardResponse {
  schema_version: typeof UNIFIED_DASHBOARD_SCHEMA_VERSION;
  generated_at: string;
  user_id: string;
  observed_financial_state: {
    accounts: unknown[];
    recent_transactions: unknown[];
  };
  intelligence: unknown;
  publication: unknown;
  evidence_boundary: unknown;
  provider_lineage: unknown;
  integrity: unknown;
}
