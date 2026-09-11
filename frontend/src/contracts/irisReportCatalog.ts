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

export type IrisReportCatalogResponse = {
  catalog_version: string;
  product_boundary: string;
  provider_boundary: string;
  catalog: IrisReportCatalogProduct[];
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
