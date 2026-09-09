import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { PLAID_PRODUCT_CATALOG_V2 } from "../config/plaidProductCatalogV2.js";

export const plaidSurfaceRouter = Router();

const CANONICAL_PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
const CANONICAL_SET = new Set<string>(CANONICAL_PRODUCTS);
const ACCOUNT_SCOPED_PRODUCTS = new Set(["transactions", "balance", "liabilities"]);

function runtimeState(definition: (typeof PLAID_PRODUCT_CATALOG_V2)[number], observed: Set<string>, active: Set<string>, consented: Set<string>, available: Set<string>) {
  if (definition.plaidProductStates.length === 0) return "public_surface";
  if (definition.plaidProductStates.some((p) => observed.has(p))) return "observed";
  if (definition.plaidProductStates.some((p) => active.has(p))) return "active";
  if (definition.plaidProductStates.some((p) => consented.has(p))) return "consented";
  if (definition.plaidProductStates.some((p) => available.has(p))) return "available";
  return "not_available";
}

/**
 * Authenticated, read-only Plaid provider surface.
 *
 * This endpoint is deliberately broader than Iris financial evidence. It exposes
 * the complete catalog plus live Item state, while provider-domain evidence is
 * separately surfaced only where an authoritative raw observation exists.
 * Nothing in this route is an Iris interpretation or a financial calculation.
 */
plaidSurfaceRouter.get("/dashboard/plaid/surface", requireAuth, async (req: AuthedRequest, res) => {
  const [{ data: items, error }, { data: observations, error: observationError }, { data: rawProducts, error: rawProductError }, { data: rawTransactions, error: rawTransactionError }, { data: rawBalances, error: rawBalanceError }, { data: rawLiabilities, error: rawLiabilityError }, { data: accounts, error: accountError }] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, user_id, institution_name, status, last_synced_at, plaid_access_token").eq("user_id", req.userId!),
    supabaseAdmin.from("plaid_product_observations").select("id, item_id, product, lifecycle_state, evidence_state, observed_at, is_current, acquired_at, effective_at, provider_object_id, provenance, observation_version, observation_hash").eq("user_id", req.userId!).eq("provider", "plaid").eq("is_current", true),
    supabaseAdmin.from("plaid_raw_product_observations").select("id, item_id, product, raw_response, provider_object_id, acquired_at, effective_at, evidence_state, provenance, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, raw_response, fetched_at, observation_hash, observation_version, supersedes_id, is_current, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, provenance, observation_version, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance, observation_version, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, created_at").eq("user_id", req.userId!),
  ]);
  const failures = [error, observationError, rawProductError, rawTransactionError, rawBalanceError, rawLiabilityError, accountError].filter(Boolean);
  if (failures.length) return res.status(500).json({ error: "Unable to assemble Plaid source surface" });

  const observedByItem = new Map<string, Set<string>>();
  for (const row of observations ?? []) {
    if (row.lifecycle_state !== "observed" || row.evidence_state !== "observed") continue;
    const set = observedByItem.get(row.item_id) ?? new Set<string>();
    set.add(row.product);
    observedByItem.set(row.item_id, set);
  }

  const rawEvidence = [
    ...(rawProducts ?? [])
      .filter((r: any) => CANONICAL_SET.has(r.product) && !ACCOUNT_SCOPED_PRODUCTS.has(r.product))
      .map((r: any) => ({ ...r, source_domain: r.product })),
    ...(rawTransactions ?? []).map((r: any) => ({ ...r, product: "transactions", source_domain: "transactions" })),
    ...(rawBalances ?? []).map((r: any) => ({ ...r, product: "balance", source_domain: "balance" })),
    ...(rawLiabilities ?? []).map((r: any) => ({ ...r, product: "liabilities", source_domain: "liabilities" })),
  ];

  const itemSummaries: any[] = [];
  const counts = new Map<string, { observed: number; active: number; consented: number; available: number; unavailable: number; items: number }>();
  for (const definition of PLAID_PRODUCT_CATALOG_V2) counts.set(definition.key, { observed: 0, active: 0, consented: 0, available: 0, unavailable: 0, items: 0 });

  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const billed = new Set<string>(raw.billed_products ?? []);
      const active = new Set<string>(raw.products ?? []);
      const consented = new Set<string>(raw.consented_products ?? []);
      const available = new Set<string>(raw.available_products ?? []);
      const observed = observedByItem.get(item.id) ?? new Set<string>();
      const productStates = PLAID_PRODUCT_CATALOG_V2.map((definition) => {
        const status = runtimeState(definition, observed, active, consented, available);
        return {
          key: definition.key,
          displayName: definition.displayName,
          category: definition.category,
          scope: definition.plaidProductStates.length ? "item_product_state" : "public_product_surface",
          status,
          observed: status === "observed",
          billed: definition.plaidProductStates.some((p) => billed.has(p)),
          active: definition.plaidProductStates.some((p) => active.has(p)),
          consented: definition.plaidProductStates.some((p) => consented.has(p)),
          available: definition.plaidProductStates.some((p) => available.has(p)),
          plaidProductStates: definition.plaidProductStates,
        };
      });
      for (const stateRow of productStates) {
        const c = counts.get(stateRow.key)!; c.items += 1;
        if (stateRow.status === "observed") c.observed += 1;
        else if (stateRow.status === "active") c.active += 1;
        else if (stateRow.status === "consented") c.consented += 1;
        else if (stateRow.status === "available") c.available += 1;
        else c.unavailable += 1;
      }
      itemSummaries.push({
        item_id: item.id,
        institution_name: item.institution_name,
        status: item.status,
        last_synced_at: item.last_synced_at,
        billed_products: [...billed],
        active_products: [...active],
        consented_products: [...consented],
        available_products: [...available],
        observed_products: [...observed],
        products: productStates,
      });
    } catch {
      const observed = observedByItem.get(item.id) ?? new Set<string>();
      itemSummaries.push({
        item_id: item.id,
        institution_name: item.institution_name,
        status: "provider_state_unavailable",
        last_synced_at: item.last_synced_at,
        billed_products: [],
        active_products: [],
        consented_products: [],
        available_products: [],
        observed_products: [...observed],
        products: PLAID_PRODUCT_CATALOG_V2.map((definition) => ({
          key: definition.key,
          displayName: definition.displayName,
          category: definition.category,
          scope: definition.plaidProductStates.length ? "item_product_state" : "public_product_surface",
          status: definition.plaidProductStates.some((p) => observed.has(p)) ? "observed" : "provider_state_unavailable",
          observed: definition.plaidProductStates.some((p) => observed.has(p)),
          billed: false,
          active: false,
          consented: false,
          available: false,
          plaidProductStates: definition.plaidProductStates,
        })),
      });
    }
  }

  const products = PLAID_PRODUCT_CATALOG_V2.map((definition) => {
    const c = counts.get(definition.key)!;
    return {
      ...definition,
      scope: definition.plaidProductStates.length ? "item_product_state" : "public_product_surface",
      status: definition.plaidProductStates.length
        ? (c.observed ? "observed" : items?.length ? c.active ? "active" : c.consented ? "consented" : c.available ? "available" : "not_available" : "not_connected")
        : "public_surface",
      item_count: c.items,
      observed_item_count: c.observed,
      active_item_count: c.active,
      consented_item_count: c.consented,
      available_item_count: c.available,
      unavailable_item_count: c.unavailable,
    };
  });

  res.json({
    catalog_version: "2026-09-09-complete",
    source: "plaid_runtime_item_state_and_provider_domain_evidence",
    catalog_scope: "complete_supported_plaid_capability_catalog",
    canonical_evidence_products: [...CANONICAL_PRODUCTS],
    items: itemSummaries,
    products,
    accounts: accounts ?? [],
    provider_evidence: rawEvidence,
    provider_evidence_counts: Object.fromEntries(CANONICAL_PRODUCTS.map((p) => [p, rawEvidence.filter((r: any) => r.product === p).length])),
    product_state_legend: {
      observed: "Direct live Plaid domain response recorded as current evidence.",
      active: "Plaid reports the Item product active but current provider-domain evidence is not recorded.",
      consented: "Plaid reports consent without current provider-domain evidence.",
      available: "Plaid reports availability without current provider-domain evidence.",
      not_available: "No current Item provider state for this capability.",
      public_surface: "Public Plaid capability with no Item product-state identity; it is not user observation.",
      provider_state_unavailable: "The Item could not be queried during this request; no provider state is inferred.",
    },
    source_boundary: "This surface contains the complete supported Plaid capability catalog and separate runtime/evidence state. It contains no Iris interpretations, financial calculations, Round-Up controls, or claims that catalog membership implies user observation.",
  });
});
