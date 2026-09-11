export type IrisReportCatalogProduct = {
  reportId: string;
  analysisId: string;
  name: string;
  description: string;
  family: string;
  outputType: string;
  requiredEvidenceInputs: string[];
};

export type IrisReportCatalogResponse = {
  catalog: IrisReportCatalogProduct[];
  activation: { report_ids: string[] };
};
