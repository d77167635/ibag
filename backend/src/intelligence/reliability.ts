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
    missing_evidence_is_not_negative_evidence: true;
  };
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const makeDimension = (score: number | null, basis: string): ReliabilityDimension => ({ score: score === null ? null : clamp(score), status: score === null ? "unavailable" : score >= 0.8 ? "supported" : "limited", basis });

/** Measures reasoning-quality conditions; never turns evidence quality into a probability. */
export function assessReliability(graph: EvidenceGraph): IrisReliabilityAssessment {
  const nodes = graph.nodes ?? [];
  const providerNodes = nodes.filter((node) => node.kind === "provider");
  const calculationNodes = nodes.filter((node) => node.kind === "calculation");
  const limitationNodes = nodes.filter((node) => node.kind === "limitation");
  const observed = nodes.filter((node) => node.state === "observed");
  const limited = nodes.filter((node) => node.state === "limited" || node.state === "insufficient_evidence");
  const evidenceCount = providerNodes.length + calculationNodes.length;

  const evidenceCompleteness = evidenceCount ? observed.length / evidenceCount : null;
  const sourceNodes = providerNodes.filter((node) => Boolean(node.provider_domain));
  const sourceFidelity = sourceNodes.length ? sourceNodes.filter((node) => node.state === "observed").length / sourceNodes.length : null;
  const timestamped = nodes.filter((node) => Boolean(node.generated_at) || Boolean(node.freshness));
  const temporalFreshness = timestamped.length ? timestamped.filter((node) => node.state !== "limited" && node.state !== "insufficient_evidence").length / timestamped.length : null;
  const integrityLimitations = limitationNodes.filter((node) => /lineage|integrity|account|transaction/i.test(node.label));
  const lineageIntegrity = integrityLimitations.length === 0 ? 1 : integrityLimitations.every((node) => node.state !== "limited" && node.state !== "insufficient_evidence") ? 1 : 0;
  const analyticalDeterminism = calculationNodes.length ? calculationNodes.filter((node) => Boolean(node.calculation_version)).length / calculationNodes.length : null;
  const uncertaintyCoverage = evidenceCount ? clamp(1 - limited.length / evidenceCount) : null;
  const values = [evidenceCompleteness, sourceFidelity, temporalFreshness, lineageIntegrity, analyticalDeterminism, uncertaintyCoverage].filter((value): value is number => value !== null);
  const overall = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  return {
    architecture_version: "IRIS_RELIABILITY_V1",
    overall: makeDimension(overall, "Multidimensional evidence and reasoning-quality assessment; this score is not a probability."),
    dimensions: {
      evidence_completeness: makeDimension(evidenceCompleteness, "Observed provider/calculation evidence represented in the graph."),
      source_fidelity: makeDimension(sourceFidelity, "Provider-domain evidence represented as observed provider nodes."),
      temporal_freshness: makeDimension(temporalFreshness, "Availability of timestamped graph evidence; timestamp presence is not a confidence claim."),
      lineage_integrity: makeDimension(lineageIntegrity, "Integrity-related limitations represented in the graph."),
      analytical_determinism: makeDimension(analyticalDeterminism, "Calculated nodes carrying explicit Iris calculation versions."),
      uncertainty_coverage: makeDimension(uncertaintyCoverage, "Known limitations remain represented rather than silently converted into negative evidence."),
    },
    policy: { score_is_not_probability: true, downstream_cannot_exceed_upstream_evidence: true, missing_evidence_is_not_negative_evidence: true },
  };
}
