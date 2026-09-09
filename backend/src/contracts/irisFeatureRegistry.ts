/**
 * Authoritative Iris feature boundary.
 *
 * Plaid products answer what source capabilities exist. Iris features answer
 * what intelligence the user can activate. These are intentionally separate:
 * activating a feature never activates a provider product and never fabricates
 * evidence.
 */
import { IRIS_CATALOG, IRIS_CATALOG_EXPANSION } from "../intelligence/irisCatalog.js";
import type { IrisCatalogCapability } from "../intelligence/irisCatalog.js";

export type IrisFeatureActivation = "enabled" | "disabled";
export type IrisFeatureReadiness = "ready" | "limited" | "insufficient_evidence" | "blocked";

export interface IrisFeatureDefinition {
  featureId: string;
  capabilityId: string;
  name: string;
  description: string;
  family: string;
  depth: IrisCatalogCapability["depth"];
  requiredEvidence: string[];
  intelligenceOutputs: string[];
  uiSurfaces: string[];
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
  capability.atlas_ids.length > 0 ? capability.atlas_ids : [`capability.${capability.id}`];

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

/**
 * One authoritative feature registry derived from the existing Iris
 * capability catalog. No second copy of capability names or descriptions is
 * maintained here.
 */
export const IRIS_FEATURE_REGISTRY: IrisFeatureDefinition[] = ALL_CAPABILITIES.map((capability) => ({
  featureId: `feature.${capability.id}`,
  capabilityId: capability.id,
  name: capability.name,
  description: capability.description,
  family: capability.family,
  depth: capability.depth,
  requiredEvidence: defaultEvidence(capability),
  intelligenceOutputs: defaultOutputs(capability),
  uiSurfaces: defaultSurfaces(capability),
}));

export function getIrisFeature(featureId: string): IrisFeatureDefinition | null {
  return IRIS_FEATURE_REGISTRY.find((feature) => feature.featureId === featureId) ?? null;
}

export function getIrisFeatureByCapability(capabilityId: string): IrisFeatureDefinition | null {
  return IRIS_FEATURE_REGISTRY.find((feature) => feature.capabilityId === capabilityId) ?? null;
}

/**
 * Deterministic readiness evaluator. `evidenceCoverage` is supplied by the
 * evidence engine; this function does not inspect provider data and therefore
 * cannot accidentally turn catalog metadata into observed evidence.
 */
export function evaluateIrisFeatureState(
  feature: IrisFeatureDefinition,
  input: {
    activation: IrisFeatureActivation;
    evidenceCoverage: number;
    blockers?: string[];
  },
): IrisFeatureState {
  const coverage = Math.max(0, Math.min(1, input.evidenceCoverage));
  const blockers = [...(input.blockers ?? [])];

  if (input.activation === "disabled") {
    return {
      featureId: feature.featureId,
      activation: "disabled",
      readiness: "blocked",
      evidenceCoverage: coverage,
      blockers: ["feature_disabled", ...blockers],
      available: false,
    };
  }

  if (blockers.length > 0) {
    return {
      featureId: feature.featureId,
      activation: "enabled",
      readiness: "blocked",
      evidenceCoverage: coverage,
      blockers,
      available: false,
    };
  }

  if (coverage >= 1) {
    return {
      featureId: feature.featureId,
      activation: "enabled",
      readiness: "ready",
      evidenceCoverage: coverage,
      blockers: [],
      available: true,
    };
  }

  if (coverage > 0) {
    return {
      featureId: feature.featureId,
      activation: "enabled",
      readiness: "limited",
      evidenceCoverage: coverage,
      blockers: ["partial_evidence"],
      available: true,
    };
  }

  return {
    featureId: feature.featureId,
    activation: "enabled",
    readiness: "insufficient_evidence",
    evidenceCoverage: 0,
    blockers: ["evidence_required"],
    available: false,
  };
}
