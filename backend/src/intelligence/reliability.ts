import type { EvidenceGraph } from "./evidenceGraph.js";

export type ReliabilityDimension = {
  score: number | null;
  status: "supported" | "limited" | "unavailable";
  basis: string;
};

export type IrisReliabilityAssessment = {
  architecture_version: "IRIS_RELIABILITY_V1";
  overall: ReliabilityDimension;
  dimensions: {
    evidence_completeness: ReliabilityDimension;
    source_fidelity: ReliabilityDimension;
    temporal_freshness: ReliabilityDimension;
    lineage_integrity: ReliabilityDimension;
    analytical_determinism: ReliabilityDimension;
    uncertainty_coverage: ReliabilityDimension;
  };
  policy: {
    score_is_not_probability: true;
    downstream_cannot_exceed_upstream_evidence: true;
    missing_evidence_is_not_penalized_as_negative_evidence: true;
  };
};

function bounded(value: number) { return Math.max(0, Math.min(1, value)); }
function dimension(score: number | null, status: ReliabilityDimension["status"], basis: string): ReliabilityDimension { return { score: score === null ? null : bounded(score), status, basis }; }

export function assessReliability(evidenceGraph: EvidenceGraph): IrisReliabilityAssessment {
  const nodes = evidenceGraph.nodes ?? [];
  const evidenceNodes = nodes.filter((node: any) => node.type === "evidence");
  const limitedNodes = evidenceNodes.filter((node: any) => node.status === "limited" || node.status === "insufficient_evidence");
  const observedNodes = evidenceNodes.filter((node: any) => node.status === "observed");
  const totalEvidence = evidenceNodes.length;

  const evidenceCompleteness = totalEvidence > 0 ? observedNodes.length / totalEvidence : null;
  const uncertaintyNodes = nodes.filter((node: any) => node.type === "uncertainty");
  const uncertaintyCoverage = totalEvidence > 0 ? bounded(1 - Math.max(0, uncertaintyNodes.filter((node: any) => node.status === "unresolved").length - 0) / Math.max(1, totalEvidence)) : null;

  const integritySignals = nodes.filter((node: any) => node.type === "integrity");
  const lineageScore = integritySignals.length === 0 ? null : integritySignals.every((node: any) => node.status !== "failed") ? 1 : 0;

  const sourceSignals = nodes.filter((node: any) => node.type === "provider_source" || node.type === "source_fidelity");
  const sourceScore = sourceSignals.length === 0 ? null : sourceSignals.every((node: any) => node.status !== "failed") ? 1 : sourceSignals.some((node: any) => node.status === "limited") ? 0.5 : 1;

  const temporalSignals = evidenceNodes.filter((node: any) => node.observed_at || node.acquired_at || node.timestamp);
  const temporalScore = temporalSignals.length > 0 ? bounded(temporalSignals.filter((node: any) => node.status === "observed").length / temporalSignals.length) : null;

  const analyticalScore = totalEvidence > 0 ? bounded((observedNodes.length + (totalEvidence - limitedNodes.length) * 0.25) / Math.max(1, totalEvidence * 1.25)) : null;
  const available = [evidenceCompleteness, sourceScore, temporalScore, lineageScore, analyticalScore, uncertaintyCoverage].filter((v): v is number => v !== null);
  const overallScore = available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;

  return {
    architecture_version: "IRIS_RELIABILITY_V1",
    overall: dimension(overallScore, overallScore === null ? "unavailable" : overallScore >= 0.8 ? "supported" : "limited", "Multidimensional evidence-quality assessment; not a probability or forecast confidence.") ,
    dimensions: {
      evidence_completeness: dimension(evidenceCompleteness, evidenceCompleteness === null ? "unavailable" : evidenceCompleteness >= 0.8 ? "supported" : "limited", "Observed evidence nodes divided by evidence nodes required by the graph."),
      source_fidelity: dimension(sourceScore, sourceScore === null ? "unavailable" : sourceScore >= 0.8 ? "supported" : "limited", "Provider-source and source-fidelity signals available in the evidence graph."),
      temporal_freshness: dimension(temporalScore, temporalScore === null ? "unavailable" : temporalScore >= 0.8 ? "supported" : "limited", "Availability of timestamped observed evidence; age itself is not treated as a provider assertion."),
      lineage_integrity: dimension(lineageScore, lineageScore === null ? "unavailable" : lineageScore >= 0.8 ? "supported" : "limited", "Integrity signals in the evidence graph."),
      analytical_determinism: dimension(analyticalScore, analyticalScore === null ? "unavailable" : analyticalScore >= 0.8 ? "supported" : "limited", "Deterministic analytical coverage supported by available evidence."),
      uncertainty_coverage: dimension(uncertaintyCoverage, uncertaintyCoverage === null ? "unavailable" : uncertaintyCoverage >= 0.8 ? "supported" : "limited", "Whether known uncertainty is represented in the graph; unresolved uncertainty does not become negative evidence."),
    },
    policy: {
      score_is_not_probability: true,
      downstream_cannot_exceed_upstream_evidence: true,
      missing_evidence_is_not_penalized_as_negative_evidence: true,
    },
  };
}
