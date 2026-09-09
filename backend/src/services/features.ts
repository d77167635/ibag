import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import type { IrisFeatureDefinition } from "../contracts/irisFeatureRegistry.js";

/**
 * The user-facing feature API is a projection of the authoritative Iris
 * Feature Registry. There is intentionally no second hand-maintained feature
 * catalog here.
 *
 * Plaid products and Iris features remain separate boundaries. A feature
 * preference controls Iris intelligence only; it never activates a provider
 * product and never creates evidence.
 */
export type IrisUserFeature = IrisFeatureDefinition & {
  defaultEnabled: boolean;
};

export const FEATURE_REGISTRY: Record<string, IrisUserFeature> = Object.fromEntries(
  IRIS_FEATURE_REGISTRY.map((feature) => [
    feature.featureId,
    { ...feature, defaultEnabled: true },
  ]),
) as Record<string, IrisUserFeature>;

export type FeatureKey = keyof typeof FEATURE_REGISTRY;

export async function getFeatureFlags(userId: string): Promise<Record<FeatureKey, boolean>> {
  const { data, error } = await supabaseAdmin
    .from("user_feature_flags")
    .select("feature_key, enabled")
    .eq("user_id", userId);
  if (error) throw error;

  const overrides = new Map((data ?? []).map((row) => [row.feature_key, row.enabled]));
  const result = {} as Record<FeatureKey, boolean>;
  for (const key of Object.keys(FEATURE_REGISTRY) as FeatureKey[]) {
    result[key] = overrides.has(key) ? Boolean(overrides.get(key)) : FEATURE_REGISTRY[key].defaultEnabled;
  }
  return result;
}

export async function setFeatureFlag(userId: string, key: FeatureKey, enabled: boolean) {
  if (!(key in FEATURE_REGISTRY)) throw new Error(`Unknown feature key: ${key}`);
  const { error } = await supabaseAdmin.from("user_feature_flags").upsert(
    { user_id: userId, feature_key: key, enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id,feature_key" },
  );
  if (error) throw error;
}
