import { supabaseAdmin } from "../config/supabase.js";
import { getPlaidAccessToken } from "./tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG } from "../config/plaidProductCatalog.js";

const WEIGHT: Record<string, number> = {
  financial_state: 12, cash_flow: 11, liquidity: 11, spending: 10, income: 10,
  bills: 10, debt: 10, credit: 9, net_worth: 9, investments: 9, forecasting: 9,
  stability: 9, behavior: 8, patterns: 8, recurring: 8, risk: 8, portfolio: 8,
  assets: 7, merchant_analysis: 7, classification: 6, history: 6, evidence: 6,
  reconciliation: 6, available_funds: 6, account_verification: 4, account_identity: 3,
  ownership_evidence: 3, fraud_risk: 5, data_exchange: 5, data_coverage: 5,
  permissioned_data: 5, connected_apps: 4, data_relationships: 4, permissions_context: 4,
  consent: 4, permissions: 4, data_governance: 4, trust: 4, institution_connection: 3,
  account_linkage: 3,
};

const score = (capabilities: string[]) => capabilities.reduce((sum, capability) => sum + (WEIGHT[capability] ?? 1), 0);

function providerStatus(definition: (typeof PLAID_PRODUCT_CATALOG)[number], raw: any) {
  const active = new Set<string>([...(raw.products ?? []), ...(raw.billed_products ?? [])]);
  const consented = new Set<string>(raw.consented_products ?? []);
  const available = new Set<string>(raw.available_products ?? []);
  if (definition.plaidProductStates.some((state) => active.has(state))) return "active" as const;
  if (definition.plaidProductStates.some((state) => consented.has(state))) return "consented" as const;
  if (definition.plaidProductStates.some((state) => available.has(state))) return "available" as const;
  return "not_available" as const;
}

export async function selectPlaidProducts(userId: string) {
  const [{ data: subscription, error: subscriptionError }, { data: items, error: itemsError }] = await Promise.all([
    supabaseAdmin.from("ibag_user_plan_subscriptions").select("plan_key,status,starts_at,ends_at").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("plaid_items").select("id,user_id,institution_name,status,last_synced_at,plaid_access_token").eq("user_id", userId),
  ]);
  if (subscriptionError) throw subscriptionError;
  if (itemsError) throw itemsError;
  if (!subscription || subscription.status !== "active") {
    return { strategy: "iris_evidence_weighted_product_selection_v3", plan: { status: "not_entitled" }, catalog_size: PLAID_PRODUCT_CATALOG.length, selected: [], all_eligible_products: [], items: [] };
  }
  if (subscription.ends_at && new Date(subscription.ends_at).getTime() <= Date.now()) {
    return { strategy: "iris_evidence_weighted_product_selection_v3", plan: { key: subscription.plan_key, status: "expired" }, catalog_size: PLAID_PRODUCT_CATALOG.length, selected: [], all_eligible_products: [], items: [] };
  }

  const { data: entitlements, error: entitlementError } = await supabaseAdmin
    .from("ibag_plan_plaid_products")
    .select("product_key,enabled")
    .eq("plan_key", subscription.plan_key)
    .eq("enabled", true);
  if (entitlementError) throw entitlementError;
  const entitled = new Set((entitlements ?? []).map((row) => row.product_key));
  const definitions = PLAID_PRODUCT_CATALOG.filter((definition) => entitled.has(definition.key));

  const { data: terms, error: termsError } = await supabaseAdmin
    .from("ibag_plaid_product_commercial_terms")
    .select("product_key,billing_model,plaid_price_cents,user_price_cents,price_unit,pricing_status,pass_through_enabled")
    .in("product_key", definitions.map((definition) => definition.key));
  if (termsError) throw termsError;
  const termByProduct = new Map((terms ?? []).map((term) => [term.product_key, term]));

  const aggregate = new Map<string, any>();
  const itemResults: any[] = [];
  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const candidates = definitions.map((definition) => {
        const status = providerStatus(definition, raw);
        const commercial = termByProduct.get(definition.key);
        return {
          product: definition.key,
          display_name: definition.displayName,
          category: definition.category,
          description: definition.description,
          status,
          plan_eligible: true,
          available_to_iris: status !== "not_available",
          phase1_relevant: definition.phase1Relevant,
          capabilities: definition.irisCapabilities,
          intelligence_score: score(definition.irisCapabilities),
          commercial: commercial ?? { billing_model: "included_unless_plaid_charges", pricing_status: "contract_dependent", pass_through_enabled: true },
        };
      }).sort((a, b) => b.intelligence_score - a.intelligence_score || a.display_name.localeCompare(b.display_name));
      for (const candidate of candidates) {
        const prior = aggregate.get(candidate.product);
        aggregate.set(candidate.product, {
          ...candidate,
          item_count: (prior?.item_count ?? 0) + 1,
          active_item_count: (prior?.active_item_count ?? 0) + (candidate.status === "active" ? 1 : 0),
          consented_item_count: (prior?.consented_item_count ?? 0) + (candidate.status === "consented" ? 1 : 0),
          available_item_count: (prior?.available_item_count ?? 0) + (candidate.status === "available" ? 1 : 0),
        });
      }
      itemResults.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, candidates });
    } catch (error) {
      console.error(`Iris Plaid product selection failed for ${item.id}:`, error);
      itemResults.push({ institution_name: item.institution_name, status: "selection_unavailable", last_synced_at: item.last_synced_at, candidates: [] });
    }
  }

  const eligible = [...aggregate.values()].sort((a, b) => b.intelligence_score - a.intelligence_score || a.product.localeCompare(b.product));
  return {
    strategy: "iris_evidence_weighted_product_selection_v3",
    plan: { key: subscription.plan_key, status: subscription.status, starts_at: subscription.starts_at, ends_at: subscription.ends_at, entitled_product_count: definitions.length },
    catalog_size: PLAID_PRODUCT_CATALOG.length,
    selected: eligible.filter((candidate) => candidate.available_to_iris),
    all_eligible_products: eligible,
    items: itemResults,
    principles: [
      "The full iBag Plaid catalog is the candidate universe.",
      "The user's active iBag plan is a hard entitlement gate.",
      "Plaid Item availability, consent and active product state are evaluated independently from plan entitlement.",
      "Iris ranks eligible products by the Financial Life State capabilities they can unlock.",
      "Available or consented is not observed; product data must be retrieved before it can support Iris intelligence.",
      "Commercial terms are configuration, with Plaid charges passed through according to iBag policy when applicable.",
      "Iris never silently requests consent, activates a product, or performs money movement in Phase 1.",
    ],
  };
}
