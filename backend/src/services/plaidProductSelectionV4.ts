import { supabaseAdmin } from "../config/supabase.js";
import { getPlaidAccessToken } from "./tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG_V2 } from "../config/plaidProductCatalogV2.js";
import { evaluatePlaidProductDecision, type PlaidBilledState, type PlaidProductState } from "../contracts/plaidProductDecision.js";

const WEIGHT: Record<string, number> = {
  financial_state: 12, cash_flow: 11, liquidity: 11, spending: 10, income: 10,
  bills: 10, debt: 10, credit: 9, net_worth: 9, investments: 9, forecasting: 9,
  stability: 9, behavior: 8, patterns: 8, recurring: 8, risk: 8, portfolio: 8,
  assets: 7, merchant_analysis: 7, classification: 6, history: 6, evidence: 6,
  reconciliation: 6, available_funds: 6, account_verification: 4, account_identity: 3,
  ownership_evidence: 3, fraud_risk: 5, data_exchange: 5, data_coverage: 5,
  permissioned_data: 5, connected_apps: 4, data_relationships: 4, permissions_context: 4,
  consent: 4, permissions: 4, data_governance: 4, trust: 4, institution_connection: 3,
  account_linkage: 3, credit_risk: 8, freshness: 6, employment: 7, recurring_payments: 6,
};

const score = (capabilities: string[]) => capabilities.reduce((sum, capability) => sum + (WEIGHT[capability] ?? 1), 0);

function providerStateFor(definition: (typeof PLAID_PRODUCT_CATALOG_V2)[number], raw: any): PlaidProductState {
  const products = new Set<string>(raw.products ?? []);
  const available = new Set<string>(raw.available_products ?? []);
  const consented = new Set<string>(raw.consented_products ?? []);
  if (definition.plaidProductStates.some((state) => products.has(state))) return "active";
  if (definition.plaidProductStates.some((state) => consented.has(state))) return "consented";
  if (definition.plaidProductStates.some((state) => available.has(state))) return "available";
  return definition.plaidProductStates.length === 0 ? "unsupported" : "not_available";
}

function consentStateFor(definition: (typeof PLAID_PRODUCT_CATALOG_V2)[number], raw: any) {
  const consented = new Set<string>(raw.consented_products ?? []);
  return definition.plaidProductStates.some((state) => consented.has(state)) ? "consented" as const : "not_consented" as const;
}

function billedStateFor(definition: (typeof PLAID_PRODUCT_CATALOG_V2)[number], raw: any): PlaidBilledState {
  const billed = new Set<string>(raw.billed_products ?? []);
  if (definition.plaidProductStates.some((state) => billed.has(state))) return "billed";
  if (Array.isArray(raw.billed_products)) return "not_billed";
  return "unknown";
}

function commercialState(term: any): "included" | "pass_through" | "unknown" {
  if (!term) return "unknown";
  if (term.pass_through_enabled && (term.plaid_price_cents ?? 0) > 0) return "pass_through";
  if (term.pricing_status === "active" && (term.plaid_price_cents ?? 0) === 0) return "included";
  if (term.billing_model === "included") return "included";
  return "unknown";
}

export async function selectPlaidProducts(userId: string) {
  const [{ data: subscription, error: subscriptionError }, { data: items, error: itemsError }] = await Promise.all([
    supabaseAdmin.from("ibag_user_plan_subscriptions").select("plan_key,status,starts_at,ends_at").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("plaid_items").select("id,user_id,institution_name,status,last_synced_at,plaid_access_token").eq("user_id", userId),
  ]);
  if (subscriptionError) throw subscriptionError;
  if (itemsError) throw itemsError;

  const base = {
    strategy: "iris_evidence_weighted_product_selection_v8",
    catalog_size: PLAID_PRODUCT_CATALOG_V2.length,
  };
  if (!subscription || subscription.status !== "active" || (subscription.ends_at && new Date(subscription.ends_at).getTime() <= Date.now())) {
    return { ...base, plan: { key: subscription?.plan_key ?? null, status: subscription?.status ?? "not_entitled" }, selected: [], all_eligible_products: [], awaiting_observation: [], items: [] };
  }

  const { data: entitlements, error: entitlementError } = await supabaseAdmin.from("ibag_plan_plaid_products")
    .select("product_key,enabled").eq("plan_key", subscription.plan_key).eq("enabled", true);
  if (entitlementError) throw entitlementError;
  const entitled = new Set((entitlements ?? []).map((row) => row.product_key));
  const definitions = PLAID_PRODUCT_CATALOG_V2;

  const { data: terms, error: termsError } = await supabaseAdmin.from("ibag_plaid_product_commercial_terms")
    .select("product_key,billing_model,plaid_price_cents,user_price_cents,price_unit,pricing_status,pass_through_enabled")
    .in("product_key", definitions.map((definition) => definition.key));
  if (termsError) throw termsError;
  const termByProduct = new Map((terms ?? []).map((term) => [term.product_key, term]));

  const { data: observations, error: observationsError } = await supabaseAdmin.from("plaid_product_observations")
    .select("item_id,product,lifecycle_state,evidence_state,is_current,acquired_at")
    .eq("user_id", userId).eq("provider", "plaid").eq("is_current", true);
  if (observationsError) throw observationsError;
  const observedByItemProduct = new Map<string, any>();
  for (const row of observations ?? []) {
    if (row.lifecycle_state === "observed" && row.evidence_state === "observed") {
      observedByItemProduct.set(`${row.item_id}:${row.product}`, row);
    }
  }

  const aggregate = new Map<string, any>();
  const itemResults: any[] = [];
  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const candidates = definitions.map((definition) => {
        const providerState = providerStateFor(definition, raw);
        const consentState = consentStateFor(definition, raw);
        const billedState = billedStateFor(definition, raw);
        const evidenceObserved = observedByItemProduct.has(`${item.id}:${definition.key}`);
        const commercial = termByProduct.get(definition.key);
        const decision = evaluatePlaidProductDecision({
          productKey: definition.key,
          providerState,
          consentState,
          billedState,
          entitlementState: entitled.has(definition.key) ? "entitled" : "not_entitled",
          commercialState: commercialState(commercial),
          evidenceState: evidenceObserved ? "observed" : providerState === "not_available" || providerState === "unsupported" ? "not_available" : "not_observed",
          intelligenceScore: score(definition.irisCapabilities),
        });
        return {
          product: definition.key,
          display_name: definition.displayName,
          category: definition.category,
          description: definition.description,
          provider_status: providerState,
          consent_status: consentState,
          billed_status: billedState,
          entitlement_status: decision.entitlementState,
          commercial_status: decision.commercialState,
          evidence_status: decision.evidenceState,
          decision: decision.decision,
          available_to_iris: decision.eligibleForIris,
          observed_by_iris: evidenceObserved,
          plan_eligible: decision.entitlementState === "entitled",
          phase1_relevant: definition.phase1Relevant,
          capabilities: definition.irisCapabilities,
          intelligence_score: decision.intelligenceScore,
          blockers: decision.blockers,
          decision_reasons: decision.reasons,
          commercial: commercial ?? { billing_model: "included_unless_plaid_charges", pricing_status: "unknown", pass_through_enabled: false },
        };
      }).sort((a, b) => b.intelligence_score - a.intelligence_score || a.display_name.localeCompare(b.display_name));

      for (const candidate of candidates) {
        const prior = aggregate.get(candidate.product);
        aggregate.set(candidate.product, {
          ...candidate,
          item_count: (prior?.item_count ?? 0) + 1,
          observed_item_count: (prior?.observed_item_count ?? 0) + (candidate.observed_by_iris ? 1 : 0),
          active_item_count: (prior?.active_item_count ?? 0) + (candidate.provider_status === "active" ? 1 : 0),
          consented_item_count: (prior?.consented_item_count ?? 0) + (candidate.consent_status === "consented" ? 1 : 0),
          available_item_count: (prior?.available_item_count ?? 0) + (candidate.provider_status === "available" ? 1 : 0),
          billed_item_count: (prior?.billed_item_count ?? 0) + (candidate.billed_status === "billed" ? 1 : 0),
        });
      }
      itemResults.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, candidates });
    } catch (error) {
      console.error(`Iris Plaid product selection failed for ${item.id}:`, error);
      itemResults.push({ institution_name: item.institution_name, status: "selection_unavailable", last_synced_at: item.last_synced_at, candidates: [] });
    }
  }

  const all = [...aggregate.values()].sort((a, b) => b.intelligence_score - a.intelligence_score || a.product.localeCompare(b.product));
  const selected = all.filter((candidate) => candidate.decision === "selected");
  const awaitingObservation = all.filter((candidate) => candidate.decision === "eligible_awaiting_evidence");
  return {
    ...base,
    plan: { key: subscription.plan_key, status: subscription.status, starts_at: subscription.starts_at, ends_at: subscription.ends_at, entitled_product_count: definitions.filter((definition) => entitled.has(definition.key)).length },
    selected,
    all_eligible_products: all.filter((candidate) => candidate.available_to_iris),
    awaiting_observation: awaitingObservation,
    observed_product_count: selected.length,
    eligible_product_count: all.filter((candidate) => candidate.available_to_iris).length,
    items: itemResults,
    principles: [
      "Catalog, availability, consent, provider authorization, billed state, entitlement, commercial terms, evidence, intelligence value and selection are separate decision dimensions.",
      "The complete Plaid catalog is evaluated; plan entitlement is a hard gate rather than a catalog filter.",
      "Plaid products/authorization, consent, and billed_products are never inferred from one another.",
      "Available, consented, active, billed, or authorized never counts as observed evidence.",
      "Only persisted provider evidence in the observed state can be selected for Iris intelligence.",
      "Commercial terms are explicit; unknown pricing is never silently treated as free.",
      "Iris may identify an eligible product awaiting evidence without claiming that its data has been observed.",
      "Iris never silently requests consent, activates a product, or performs money movement in Phase 1.",
    ],
  };
}
