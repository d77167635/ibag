import { supabaseAdmin } from "../config/supabase.js";
import {
  IRIS_FEATURE_REGISTRY,
  type IrisFeatureDefinition,
} from "../contracts/irisFeatureRegistry.js";
import { IRIS_STANDARD_CAPABILITY_IDS } from "../intelligence/irisCatalog.js";

/**
 * User feature controls are a projection of the authoritative Iris Feature
 * Registry and the canonical Iris intelligence preference row.
 *
 * There is deliberately no second feature-state store here. A feature's
 * capabilityId maps to `iris_user_intelligence_preferences.selected_capability_ids`,
 * which is also the preference consumed by the governed Iris publication
 * context. This keeps the feature UI and actual intelligence activation on the
 * same source of truth.
 *
 * Plaid products remain a separate boundary. Changing an Iris feature changes
 * only Iris publication preference; it never activates a provider product and
 * never creates evidence.
 */
export type IrisUserFeature = IrisFeatureDefinition;

export const FEATURE_REGISTRY: Record<string, IrisUserFeature> = Object.fromEntries(
  IRIS_FEATURE_REGISTRY.map((feature) => [feature.featureId, feature]),
) as Record<string, IrisUserFeature>;

export type FeatureKey = keyof typeof FEATURE_REGISTRY;

async function getSelectedCapabilityIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("iris_user_intelligence_preferences")
    .select("selected_capability_ids")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!data) return [...IRIS_STANDARD_CAPABILITY_IDS];
  return Array.isArray(data.selected_capability_ids)
    ? data.selected_capability_ids.filter((value: unknown): value is string => typeof value === "string")
    : [];
}

export async function getFeatureFlags(userId: string): Promise<Record<FeatureKey, boolean>> {
  const selected = new Set(await getSelectedCapabilityIds(userId));
  const result = {} as Record<FeatureKey, boolean>;
  for (const key of Object.keys(FEATURE_REGISTRY) as FeatureKey[]) {
    result[key] = selected.has(FEATURE_REGISTRY[key].capabilityId);
  }
  return result;
}

export async function setFeatureFlag(userId: string, key: FeatureKey, enabled: boolean) {
  const feature = FEATURE_REGISTRY[key];
  if (!feature) throw new Error(`Unknown Iris feature: ${key}`);

  const selected = new Set(await getSelectedCapabilityIds(userId));
  if (enabled) selected.add(feature.capabilityId);
  else selected.delete(feature.capabilityId);

  const { error } = await supabaseAdmin
    .from("iris_user_intelligence_preferences")
    .upsert({
      user_id: userId,
      catalog_version: "IRIS_CATALOG_V1",
      selected_capability_ids: [...selected],
      standard_name: "Custom Iris Standard",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw error;
}
