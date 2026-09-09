/**
 * Authoritative Iris feature boundary.
 *
 * Plaid products answer what source capabilities exist. Iris features answer
 * what intelligence the user can activate. These are intentionally separate:
 * activating a feature never activates a provider product and never fabricates
 * evidence.
 */
import { IRIS_CATALOG } from "../intelligence/irisCatalog.js";
import { IRIS_CATALOG_EXPANSION } from "../intelligence/irisCatalogExpansion.js";
import type { IrisCatalogCapability } from "../intelligence/irisCatalog.js";

export type IrisFeatureActivation = "enabled" | "disabled";
export type IrisFeatureReadiness = "ready" | "limited" | "insufficient_evidence" | "blocked";
export type IrisEvidenceStatus = "observed" | "validated" | "fresh" | "stale" | "limited" | "insufficient_evidence" | "retired" | "missing";

export interface IrisFeatureDefinition {
  featureId: string;
  version: string;
  capabilityId: string;
  name: string;
  description: string;
  family: string;
  depth: IrisCatalogCapability["depth"];
  prerequisites: string[];
  requiredEvidence: string[];
  evidencePolicy: "all";
  intelligenceOutputs: string[];
  uiSurfaces: string[];
  educationSurfaces: string[];
  interactionModes: string[];
}

export interface IrisFeatureState {
  featureId: string;
  activation: IrisFeatureActivation;
  readiness: IrisFeatureReadiness;
  evidenceCoverage: number;
  blockers: string[];
  available: boolean;
}

const ALL_CAPABILITIES = [...IRIS_CATALOG, ...IRIS_CATALOG_EXPANSION];

const defaultEvidence = (capability: IrisCatalogCapability): string[] =>
  capability.atlas_ids.length > 0 ? [...new Set(capability.atlas_ids)] : [`capability.${capability.id}`];

const defaultPrerequisites = (capability: IrisCatalogCapability): string[] => {
  if (capability.depth === "core") return ["evidence_validated"];
  if (capability.depth === "advanced") return ["evidence_validated", "analytical_readiness"];
  return ["evidence_validated", "analytical_readiness", "provenance_complete"];
};

const defaultOutputs = (capability: IrisCatalogCapability): string[] => [
  `${capability.family}.observations`,
  `${capability.family}.analysis`,
  `${capability.family}.explanations`,
];

const defaultSurfaces = (capability: IrisCatalogCapability): string[] => [
  "iris_dashboard",
  `workspace:${capability.family}`,
  "iris_interaction",
];

const defaultEducation = (_capability: IrisCatalogCapability): string[] => [
  "what_it_means",
  "why_it_matters",
  "evidence_and_limits",
];

const defaultInteraction = (_capability: IrisCatalogCapability): string[] => [
  "inspect",
  "explain",
  "trace",
  "compare",
];

/** One authoritative feature registry derived from the complete Iris capability catalogs. */
export const IRIS_FEATURE_REGISTRY: IrisFeatureDefinition[] = ALL_CAPABILITIES.map((capability) => ({
  featureId: `feature.${capability.id}`,
  version: "1.0.0",
  capabilityId: capability.id,
  name: capability.name,
  description: capability.description,
  family: capability.family,
  depth: capability.depth,
  prerequisites: defaultPrerequisites(capability),
  requiredEvidence: defaultEvidence(capability),
  evidencePolicy: "all",
  intelligenceOutputs: defaultOutputs(capability),
  uiSurfaces: defaultSurfaces(capability),
  educationSurfaces: defaultEducation(capability),
  interactionModes: defaultInteraction(capability),
}));

export function getIrisFeature(featureId: string): IrisFeatureDefinition | null {
  return IRIS_FEATURE_REGISTRY.find((feature) => feature.featureId === featureId) ?? null;
}

export function getIrisFeatureByCapability(capabilityId: string): IrisFeatureDefinition | null {
  return IRIS_FEATURE_REGISTRY.find((feature) => feature.capabilityId === capabilityId) ?? null;
}

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
  if (input.evidenceStatusById) {
    const required = feature.requiredEvidence;
    const validStatuses = new Set<IrisEvidenceStatus>(["observed", "validated", "fresh"]);
    const satisfied = required.filter((id) => validStatuses.has(input.evidenceStatusById[id] ?? "missing")).length;
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
  return { featureId: feature.featureId, activation: "enabled", readiness: "insufficient_evidence", evidenceCoverage: 0, blockers: ["evidence_required"], available: false };
}
