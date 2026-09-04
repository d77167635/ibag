import { supabaseAdmin } from "../config/supabase.js";
import { getPlaidAccessToken } from "./tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG } from "../config/plaidProductCatalog.js";

const DEFAULT_PLAN = "all_access";

function planAllows(productKey: string): boolean {
  const configured = process.env.IBAG_ALLOWED_PLAID_PRODUCTS?.trim();
  if (!configured) return true;
  return new Set(configured.split(",").map((value) => value.trim()).filter(Boolean)).has(productKey);
}

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

function score(capabilities: string[]) {
  return capabilities.reduce((total, capability) => total + (WEIGHT[capability] ?? 1), 0);
}

function itemStatus(definition: (typeof PLAID_PRODUCT_CATALOG)[number], raw: any) {
  const active = new Set<string>([...(raw.products ?? []), ...(raw.billed_products ?? [])]);
  const consented = new Set<string>(raw.consented_products ?? []);
  const available = new Set<string>(raw.available_products ?? []);
  if (definition.plaidProductStates.some((state) => active.has(state))) return "active" as const;
  if (definition.plaidProductStates.some((state) => consented.has(state))) return "consented" as const;
  if (definition.plaidProductStates.some((state) => available.has(state))) return "available" as const;
  return "not_available" as const;
}

export async function selectPlaidProducts(userId: string) {
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, institution_name, status, last_synced_at, plaid_access_token")
    .eq("user_id", userId);
  if (error) throw error;

  const aggregate = new Map<string, any>();
  const itemResults: any[] = [];

  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const candidates = PLAID_PRODUCT_CATALOG.filter((p) => planAllows(p.key)).map((definition) => {
        const status = itemStatus(definition, raw);
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
          score: score(definition.irisCapabilities),
        };
      }).sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name));

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

  const allEligible = [...aggregate.values()].sort((a, b) => b.score - a.score || a.product.localeCompare(b.product));
  return {
    strategy: "iris_evidence_weighted_product_selection_v2",
    plan: {
      key: DEFAULT_PLAN,
      entitlement_source: process.env.IBAG_ALLOWED_PLAID_PRODUCTS ? "configured_application_policy" : "default_all_access_policy",
      product_restriction_configured: Boolean(process.env.IBAG_ALLOWED_PLAID_PRODUCTS),
    },
    catalog_size: PLAID_PRODUCT_CATALOG.length,
    selected: allEligible.filter((candidate) => candidate.available_to_iris),
    all_eligible_products: allEligible,
    items: itemResults,
    principles: [
      "Evaluate the complete published Plaid catalog, not a hardcoded subset.",
      "Plan entitlement is a gate before Iris selection.",
      "Institution support, consent, provider state and plan entitlement are distinct facts.",
      "Available or consented does not equal observed; Iris must not claim data until the product has actually supplied it.",
      "Iris can select multiple complementary products when their evidence materially improves the Financial Life State.",
      "Product cost is external commercial configuration and is never inferred from provider state.",
      "Iris never silently requests consent, activates a product, or performs money movement in Phase 1.",
    ],
  };
}
