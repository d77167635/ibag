export type IrisReportCatalogProduct = {
  reportId: string;
  version: string;
  analysisId: string;
  name: string;
  description: string;
  family: string;
  outputType: string;
  requiredEvidenceInputs: string[];
};

export type IrisReportCatalogActivationMode = "all_available" | "explicit";

export type IrisReportDependencyResolutionState = "definition_only";

export type IrisReportDependency = {
  report_id: string;
  analysis_definition_id: string;
  feature_ids: string[];
  required_evidence_keys: string[];
  resolution_state: IrisReportDependencyResolutionState;
  upstream_intelligence_node_ids: string[];
};

export type IrisReportCatalogResponse = {
  catalog_version: string;
  product_boundary: string;
  provider_boundary: string;
  catalog: IrisReportCatalogProduct[];
  dependency_graph: IrisReportDependency[];
  activation: {
    mode: IrisReportCatalogActivationMode;
    count: number;
    report_ids: string[];
  };
  catalog_counts: {
    total: number;
    active: number;
    families: number;
  };
};
