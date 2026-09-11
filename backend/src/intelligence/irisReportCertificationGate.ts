import type { IrisReportRuntimeLineage } from "./irisReportRuntimeLineage.js";
import type { IrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";
import type { ReportEvidenceBoundary } from "./irisReportEvidenceBoundary.js";

export type IrisReportCertificationGate = {
  certified: boolean;
  reasons: string[];
  lineage_verified: boolean;
  semantic_dependency_reads_verified: boolean;
  semantic_sufficiency_verified: boolean;
  evidence_boundary_satisfied: boolean;
};

/** Certification is conjunctive: structural dependency reads cannot substitute for semantic sufficiency. */
export function evaluateIrisReportCertificationGate(input: {
  executionStatus: string;
  runtimeLineage: IrisReportRuntimeLineage | null;
  semanticConsumption: IrisReportSemanticConsumption | null;
  evidenceBoundary: ReportEvidenceBoundary;
}): IrisReportCertificationGate {
  const reasons: string[] = [];
  const lineageVerified = input.runtimeLineage?.resolution_state === "resolved";
  const semanticDependencyReadsVerified = input.semanticConsumption?.state === "verified";
  const semanticSufficiencyVerified = input.semanticConsumption?.semantic_sufficiency_certified === true;
  const evidenceSatisfied = input.evidenceBoundary.state === "satisfied";
  const executionSucceeded = input.executionStatus === "EXECUTED" || input.executionStatus === "CERTIFIED" || input.executionStatus === "SUCCEEDED";
  if (!executionSucceeded) reasons.push("execution_not_succeeded");
  if (!lineageVerified) reasons.push("runtime_lineage_not_resolved");
  if (!semanticDependencyReadsVerified) reasons.push("declared_semantic_dependency_reads_not_verified");
  if (!semanticSufficiencyVerified) reasons.push("semantic_sufficiency_not_certified");
  if (!evidenceSatisfied) reasons.push("evidence_boundary_not_satisfied");
  return { certified: reasons.length === 0, reasons, lineage_verified: lineageVerified, semantic_dependency_reads_verified: semanticDependencyReadsVerified, semantic_sufficiency_verified: semanticSufficiencyVerified, evidence_boundary_satisfied: evidenceSatisfied };
}
