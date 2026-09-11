import type { IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";
import type { IrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";
import type { ReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";

export type IrisReportCertificationGate = {
  certified: boolean;
  reasons: string[];
  lineage_verified: boolean;
  semantic_dependency_reads_verified: boolean;
  evidence_boundary_satisfied: boolean;
};

/** Certification is conjunctive: no single structural signal can certify a report. */
export function evaluateIrisReportCertificationGate(input: {
  executionStatus: string;
  runtimeLineage: IrisReportRuntimeLineage | null;
  semanticConsumption: IrisReportSemanticConsumption | null;
  evidenceBoundary: ReportEvidenceBoundary;
}): IrisReportCertificationGate {
  const reasons: string[] = [];
  const lineageVerified = input.runtimeLineage?.resolution_state === "resolved";
  const semanticVerified = input.semanticConsumption?.state === "verified" && input.semanticConsumption.semantic_sufficiency_certified === false;
  const evidenceSatisfied = input.evidenceBoundary.state === "satisfied";
  if (input.executionStatus !== "SUCCEEDED") reasons.push("execution_not_succeeded");
  if (!lineageVerified) reasons.push("runtime_lineage_not_resolved");
  if (!semanticVerified) reasons.push("declared_semantic_dependency_reads_not_verified");
  if (!evidenceSatisfied) reasons.push("evidence_boundary_not_satisfied");
  return { certified: reasons.length === 0, reasons, lineage_verified: lineageVerified, semantic_dependency_reads_verified: semanticVerified, evidence_boundary_satisfied: evidenceSatisfied };
}
