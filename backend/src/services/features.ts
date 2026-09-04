import { supabaseAdmin } from "../config/supabase.js";

/**
 * Iris features are user-controllable intelligence capabilities. A feature
 * may consume one or more Plaid evidence domains, but it is never itself a
 * Plaid product. Availability/evidence is evaluated separately from the
 * user's enabled preference.
 */
export const FEATURE_REGISTRY = {
  financial_life_state: { label: "Financial Life State", group: "Foundation", defaultEnabled: true },
  spending_intelligence: { label: "Spending Intelligence", group: "Money", defaultEnabled: true },
  cash_flow_intelligence: { label: "Cash Flow Intelligence", group: "Money", defaultEnabled: true },
  income_intelligence: { label: "Income Intelligence", group: "Money", defaultEnabled: true },
  liquidity_intelligence: { label: "Liquidity Intelligence", group: "Money", defaultEnabled: true },
  debt_intelligence: { label: "Debt Intelligence", group: "Money", defaultEnabled: true },
  debt_cost_intelligence: { label: "Debt Cost Intelligence", group: "Money", defaultEnabled: true },
  net_worth_intelligence: { label: "Net Worth Intelligence", group: "Money", defaultEnabled: true },
  investment_intelligence: { label: "Investment Intelligence", group: "Money", defaultEnabled: true },
  behavioral_intelligence: { label: "Behavioral Intelligence", group: "Understanding", defaultEnabled: true },
  pattern_detection: { label: "Pattern Detection", group: "Understanding", defaultEnabled: true },
  category_drift: { label: "Category Drift Detection", group: "Understanding", defaultEnabled: true },
  anomaly_detection: { label: "Unusual Activity Detection", group: "Understanding", defaultEnabled: true },
  recurring_intelligence: { label: "Recurring & Obligation Intelligence", group: "Understanding", defaultEnabled: true },
  forecasting: { label: "Financial Forecasting", group: "Future", defaultEnabled: true },
  risk_intelligence: { label: "Risk Intelligence", group: "Future", defaultEnabled: true },
  opportunity_intelligence: { label: "Opportunity Intelligence", group: "Future", defaultEnabled: true },
  scenario_intelligence: { label: "Scenario Intelligence", group: "Future", defaultEnabled: true },
  decision_intelligence: { label: "Decision Intelligence", group: "Future", defaultEnabled: true },
  financial_education: { label: "Financial Education", group: "Learn", defaultEnabled: true },
  explainability: { label: "Explainability & Evidence", group: "Trust", defaultEnabled: true },
  relational_reasoning: { label: "Relational Reasoning", group: "Trust", defaultEnabled: true },
  roundup: { label: "Round-Ups", group: "Iris Features", defaultEnabled: true },
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
  if (!(key in FEATURE_REGISTRY)) throw new Error(`Unknown feature key: ${key}`);
  const { error } = await supabaseAdmin.from("user_feature_flags").upsert(
    { user_id: userId, feature_key: key, enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id,feature_key" }
  );
  if (error) throw error;
}
