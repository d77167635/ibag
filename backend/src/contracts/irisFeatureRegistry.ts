import { IRIS_ANALYSIS_ATLAS } from "../intelligence/irisAnalysisAtlas.js";

export type IrisFeatureActivation = "enabled" | "disabled";
export type IrisFeatureReadiness = "ready" | "limited" | "insufficient_evidence" | "blocked";
export type IrisEvidenceStatus = "observed" | "validated" | "fresh" | "stale" | "retired" | "missing";

export interface IrisFeatureDefinition {
  featureId: string;
  name: string;
  description: string;
  requiredEvidence: string[];
  requiredAnalysisIds: string[];
  defaultActivation: IrisFeatureActivation;
}

export interface IrisFeatureState {
  featureId: string;
  activation: IrisFeatureActivation;
  readiness: IrisFeatureReadiness;
  evidenceCoverage: number;
  blockers: string[];
  available: boolean;
}

function requiredEvidenceForAnalyses(analysisIds: string[], featureId: string): string[] {
  const keys = new Set<string>();
  for (const analysisId of analysisIds) {
    const definition = IRIS_ANALYSIS_ATLAS.find((analysis) => analysis.id === analysisId);
    for (const input of definition?.inputs ?? []) keys.add(input);
  }
  if (keys.size === 0) keys.add(`feature:${featureId}:evidence`);
  return [...keys].sort();
}

/**
 * Authoritative executable feature registry. Analysis-definition IDs and
 * semantic evidence requirement keys are deliberately separate namespaces.
 */
export const IRIS_FEATURE_REGISTRY: IrisFeatureDefinition[] = IRIS_ANALYSIS_ATLAS.map((analysis) => {
  const featureId = analysis.capabilityId ?? analysis.id;
  return {
    featureId,
    name: analysis.name,
    description: analysis.description,
    requiredEvidence: requiredEvidenceForAnalyses([analysis.id], featureId),
    requiredAnalysisIds: [analysis.id],
    defaultActivation: "enabled",
  };
});

export const IRIS_FEATURE_REGISTRY_VERSION = "IRIS_FEATURE_REGISTRY_V2" as const;

/**
 * Deterministic readiness evaluator. Evidence may be supplied as an already
 * computed coverage value or as per-evidence statuses. This contract never
 * queries a provider and cannot turn catalog metadata into observed evidence.
 */
export function evaluateIrisFeatureState(
  feature: IrisFeatureDefinition,
  input: {
    activation: IrisFeatureActivation;
    evidenceCoverage?: number;
    evidenceStatusById?: Record<string, IrisEvidenceStatus>;
    blockers?: string[];
  },
): IrisFeatureState {
  let coverage = input.evidenceCoverage ?? 0;
  const evidenceStatusById = input.evidenceStatusById;
  if (evidenceStatusById) {
    const required = feature.requiredEvidence;
    const validStatuses = new Set<IrisEvidenceStatus>(["observed", "validated", "fresh"]);
    const satisfied = required.filter((id) => validStatuses.has(evidenceStatusById[id] ?? "missing")).length;
    coverage = required.length === 0 ? 1 : satisfied / required.length;
  }
  coverage = Math.max(0, Math.min(1, coverage));
  const blockers = [...(input.blockers ?? [])];

  if (input.activation === "disabled") {
    return { featureId: feature.featureId, activation: "disabled", readiness: "blocked", evidenceCoverage: coverage, blockers: ["feature_disabled", ...blockers], available: false };
  }
  if (blockers.length > 0) {
    return { featureId: feature.featureId, activation: "enabled", readiness: "blocked", evidenceCoverage: coverage, blockers, available: false };
  }
  if (coverage >= 1) {
    return { featureId: feature.featureId, activation: "enabled", readiness: "ready", evidenceCoverage: coverage, blockers: [], available: true };
  }
  if (coverage > 0) {
    return { featureId: feature.featureId, activation: "enabled", readiness: "limited", evidenceCoverage: coverage, blockers: ["partial_evidence"], available: true };
  }
  return { featureId: feature.featureId, activation: "enabled", readiness: "insufficient_evidence", evidenceCoverage: 0, blockers: ["insufficient_evidence"], available: false };
}
