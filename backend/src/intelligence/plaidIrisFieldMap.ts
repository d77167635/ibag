import { supabaseAdmin } from "../config/supabase.js";
import { buildCompletePlaidFieldArchitecture } from "./plaidFieldArchitecture.js";

/**
 * Compatibility wrapper for existing Iris consumers.
 * The authoritative source architecture is now the complete provider field
 * universe, not the historical fixed 12-layer presentation mapping.
 */
export async function buildPlaidIrisFieldMap(userId: string) {
  const architecture = await buildCompletePlaidFieldArchitecture(userId);

  const canonicalProducts = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"];
  const observedCanonical = canonicalProducts.filter((product) => architecture.fields.some((field: any) => field.product === product));

  const authorityResult = await supabaseAdmin
    .from("plaid_product_observations")
    .select("id,item_id,product,lifecycle_state,evidence_state,observed_at,acquired_at,is_current,provider_object_id")
    .eq("user_id", userId)
    .eq("provider", "plaid")
    .eq("is_current", true);
  if (authorityResult.error) throw authorityResult.error;

  const authority = authorityResult.data ?? [];
  const authorityByProduct = Object.fromEntries(canonicalProducts.map((product) => [
    product,
    authority.filter((row: any) => row.product === product).map((row: any) => ({
      id: row.id,
      item_id: row.item_id,
      lifecycle_state: row.lifecycle_state,
      evidence_state: row.evidence_state,
      observed_at: row.observed_at,
      acquired_at: row.acquired_at,
      is_current: row.is_current,
      provider_object_id: row.provider_object_id,
    })),
  ]));

  return {
    architecture_version: "IRIS_PLAID_COMPLETE_FIELD_LINEAGE_V2",
    source: "plaid",
    exact_provider_values: true,
    fabricated_values: false,
    provider_field_universe: architecture,
    iris_input_field_universe: architecture.fields,
    canonical_products: canonicalProducts,
    canonical_products_with_current_fields: observedCanonical,
    product_authorities: authorityByProduct,
    data_records: architecture.records,
    fields: architecture.fields,
    by_product: architecture.by_product,
    hierarchy: architecture.hierarchy,
    tier_definitions: architecture.tier_definitions,
    counts: {
      ...architecture.counts,
      canonical_products: canonicalProducts.length,
      canonical_products_with_current_fields: observedCanonical.length,
    },
    rules: [
      ...architecture.rules,
      "The provider field universe is the Iris input universe; Supabase is persistence/evidence storage only.",
      "The old fixed 12 presentation layers are not an architecture contract.",
      "Products/capabilities are applications over the field and intelligence universe, not tiers.",
    ],
  };
}
