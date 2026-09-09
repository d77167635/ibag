import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import { IRIS_STANDARD_CAPABILITY_IDS } from "./irisCatalog.js";
import { buildIrisFeatureRuntime } from "./irisFeatureRuntime.js";
import { buildIrisIntelligenceOutputRuntime } from "./irisIntelligenceOutputRuntime.js";

/**
 * Builds the single publication context shared by Iris intelligence surfaces.
 * Atlas readiness is analytical evidence, not a raw provider-observation claim.
 */
export async function buildIrisPublicationContext(userId: string, atlasDefinitions: Array<{
  id: string;
  evidence_ready?: boolean;
  missing_inputs?: string[];
  family?: string;
  name?: string;
  purpose?: string;
  output?: string;
}>) {
  const { data: preference, error } = await supabaseAdmin
    .from("iris_user_intelligence_preferences")
    .select("selected_capability_ids")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const selectedIds = preference && Array.isArray(preference.selected_capability_ids)
    ? preference.selected_capability_ids.filter((id: unknown): id is string => typeof id === "string")
    : [...IRIS_STANDARD_CAPABILITY_IDS];

  const activations = Object.fromEntries(
    IRIS_FEATURE_REGISTRY.map((feature) => [
      feature.featureId,
      selectedIds.includes(feature.capabilityId) ? "enabled" : "disabled",
    ]),
  );

  const readyAtlasIds = new Set(
    atlasDefinitions.filter((definition) => definition.evidence_ready === true).map((definition) => definition.id),
  );

  const evidenceCoverage = Object.fromEntries(
    IRIS_FEATURE_REGISTRY.map((feature) => {
      const required = feature.requiredEvidence;
      if (required.length === 0) return [feature.featureId, 0];
      const satisfied = required.filter((id) => readyAtlasIds.has(id)).length;
      return [feature.featureId, satisfied / required.length];
    }),
  );

  const featureRuntime = buildIrisFeatureRuntime({ activations, evidenceCoverage });
  const intelligenceOutputRuntime = buildIrisIntelligenceOutputRuntime(
    { definitions: atlasDefinitions.map((definition) => ({
      id: definition.id,
      family: definition.family ?? "unknown",
      name: definition.name ?? definition.id,
      purpose: definition.purpose ?? "",
      output: definition.output ?? "",
      evidence_ready: definition.evidence_ready === true,
      missing_inputs: definition.missing_inputs ?? [],
    })) },
    featureRuntime,
  );

  return {
    selected_capability_ids: selectedIds,
    feature_runtime: featureRuntime,
    intelligence_output_runtime: intelligenceOutputRuntime,
    publication_boundary: {
      atlas_readiness_is_not_raw_provider_observation: true,
      catalog_metadata_is_not_evidence: true,
      feature_activation_does_not_activate_provider_products: true,
      limited_outputs_require_explicit_qualification: true,
      suppressed_outputs_are_not_normal_intelligence_claims: true,
    },
  };
}
