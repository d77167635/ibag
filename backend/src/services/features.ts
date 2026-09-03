import { supabaseAdmin } from "../config/supabase.js";

/**
 * Every capability Iris intelligence produces (as opposed to raw Plaid
 * data) is independently toggleable. This is the registry of what those
 * capabilities are — adding a new intelligence layer means adding one
 * entry here, not touching every call site.
 *
 * `defaultEnabled: false` is used for features that write/move things
 * (round-up sweeps) or that some users may find noisy (anomaly alerts) —
 * everything else defaults on, since it's read-only analysis.
 */
export const FEATURE_REGISTRY = {
  roundup: { label: "Round-Up savings", defaultEnabled: true },
  anomaly_detection: { label: "Unusual transaction alerts", defaultEnabled: true },
  category_drift: { label: "Spending pattern drift", defaultEnabled: true },
  debt_cost_intelligence: { label: "Debt interest cost estimate", defaultEnabled: true },
  relational_reasoning: { label: "Risk & opportunity analysis", defaultEnabled: true },
} as const;

export type FeatureKey = keyof typeof FEATURE_REGISTRY;

export async function getFeatureFlags(userId: string): Promise<Record<FeatureKey, boolean>> {
  const { data, error } = await supabaseAdmin
    .from("user_feature_flags")
    .select("feature_key, enabled")
    .eq("user_id", userId);

  if (error) throw error;

  const overrides = new Map((data ?? []).map((r) => [r.feature_key, r.enabled]));

  const result = {} as Record<FeatureKey, boolean>;
  for (const key of Object.keys(FEATURE_REGISTRY) as FeatureKey[]) {
    result[key] = overrides.has(key) ? Boolean(overrides.get(key)) : FEATURE_REGISTRY[key].defaultEnabled;
  }
  return result;
}

export async function setFeatureFlag(userId: string, key: FeatureKey, enabled: boolean) {
  if (!(key in FEATURE_REGISTRY)) {
    throw new Error(`Unknown feature key: ${key}`);
  }
  const { error } = await supabaseAdmin.from("user_feature_flags").upsert(
    { user_id: userId, feature_key: key, enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id,feature_key" }
  );
  if (error) throw error;
}
