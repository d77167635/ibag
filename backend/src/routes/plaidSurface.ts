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
const CANONICAL_CATALOG = PLAID_PRODUCT_CATALOG_V2.filter((definition) => CANONICAL_SET.has(definition.key));

function canonicalState(definition: (typeof CANONICAL_CATALOG)[number], observed: Set<string>, active: Set<string>, consented: Set<string>, available: Set<string>) { if (definition.plaidProductStates.some((p) => observed.has(p))) return "observed"; if (definition.plaidProductStates.some((p) => active.has(p))) return "active"; if (definition.plaidProductStates.some((p) => consented.has(p))) return "consented"; if (definition.plaidProductStates.some((p) => available.has(p))) return "available"; return "not_available"; }

function nestedFieldInventory(rows: any[]) {
  const stats = new Map<string, { path: string; present: number; null_count: number; examples: unknown[] }>();
  const recordCount = rows.length;
  const visit = (value: unknown, path: string, depth = 0) => {
    if (!path || depth > 16) return;
    const current = stats.get(path) ?? { path, present: 0, null_count: 0, examples: [] };
    current.present += 1;
    if (value === null) current.null_count += 1;
    else if (current.examples.length < 3 && typeof value !== "object") current.examples.push(value);
    stats.set(path, current);
    if (Array.isArray(value)) { value.forEach((v) => visit(v, `${path}[]`, depth + 1)); return; }
    if (value && typeof value === "object") for (const [key, child] of Object.entries(value as Record<string, unknown>)) visit(child, `${path}.${key}`, depth + 1);
  };
  for (const row of rows) visit(row?.raw_response, "root");
  return [...stats.values()].sort((a, b) => a.path.localeCompare(b.path)).map((x) => ({ ...x, record_count: recordCount, absent: Math.max(0, recordCount - x.present) }));
}
function topLevelFields(rows: any[]) { const fields = new Set<string>(); for (const row of rows) { const payload = row?.raw_response; if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue; for (const key of Object.keys(payload)) fields.add(key); } return [...fields].sort(); }

plaidSurfaceRouter.get("/dashboard/plaid/surface", requireAuth, async (req: AuthedRequest, res) => {
  const [{ data: items, error }, { data: observations, error: observationError }, { data: rawProducts, error: rawProductError }, { data: rawTransactions, error: rawTransactionError }, { data: rawBalances, error: rawBalanceError }, { data: rawLiabilities, error: rawLiabilityError }, { data: accounts, error: accountError }] = await Promise.all([
    supabaseAdmin.from("plaid_items").select("id, user_id, institution_name, status, last_synced_at, plaid_access_token").eq("user_id", req.userId!),
    supabaseAdmin.from("plaid_product_observations").select("id, item_id, product, lifecycle_state, evidence_state, observed_at, is_current, acquired_at, effective_at, provider_object_id, provenance, observation_version, observation_hash").eq("user_id", req.userId!).eq("provider", "plaid").eq("is_current", true),
    supabaseAdmin.from("plaid_raw_product_observations").select("id, item_id, product, raw_response, provider_object_id, acquired_at, effective_at, evidence_state, provenance, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_transactions").select("id, account_id, plaid_transaction_id, raw_response, fetched_at, observation_hash, observation_version, supersedes_id, is_current, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance, observation_version, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id, account_id, raw_response, fetched_at, observation_hash, provider, provider_object_id, effective_at, acquired_at, evidence_state, provenance, observation_version, is_current").eq("user_id", req.userId!).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id, item_id, plaid_account_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, created_at").eq("user_id", req.userId!),
  ]);
  const failures = [error, observationError, rawProductError, rawTransactionError, rawBalanceError, rawLiabilityError, accountError].filter(Boolean);
  if (failures.length) return res.status(500).json({ error: "Unable to assemble Plaid source surface" });
  const observedByItem = new Map<string, Set<string>>();
  for (const row of observations ?? []) { if (row.lifecycle_state !== "observed" || row.evidence_state !== "observed") continue; const set = observedByItem.get(row.item_id) ?? new Set<string>(); set.add(row.product); observedByItem.set(row.item_id, set); }
  const rawEvidence = [
    ...(rawProducts ?? []).filter((r: any) => CANONICAL_SET.has(r.product) && !ACCOUNT_SCOPED_PRODUCTS.has(r.product)).map((r: any) => ({ ...r, source_domain: r.product })),
    ...(rawTransactions ?? []).map((r: any) => ({ ...r, product: "transactions", source_domain: "transactions" })),
    ...(rawBalances ?? []).map((r: any) => ({ ...r, product: "balance", source_domain: "balance" })),
    ...(rawLiabilities ?? []).map((r: any) => ({ ...r, product: "liabilities", source_domain: "liabilities" })),
  ];
  const itemSummaries: any[] = [];
  const counts = new Map<string, { observed: number; active: number; consented: number; available: number; unavailable: number; items: number }>();
  for (const definition of CANONICAL_CATALOG) counts.set(definition.key, { observed: 0, active: 0, consented: 0, available: 0, unavailable: 0, items: 0 });
  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token); const response = await plaidClient.itemGet({ access_token: token }); const raw = response.data.item as any;
      const active = new Set<string>([...(raw.products ?? []), ...(raw.billed_products ?? [])]); const consented = new Set<string>(raw.consented_products ?? []); const available = new Set<string>(raw.available_products ?? []); const observed = observedByItem.get(item.id) ?? new Set<string>();
      const productStates = CANONICAL_CATALOG.map((definition) => ({ key: definition.key, displayName: definition.displayName, status: canonicalState(definition, observed, active, consented, available), observed: definition.plaidProductStates.some((p) => observed.has(p)) }));
      for (const stateRow of productStates) { const c = counts.get(stateRow.key)!; c.items++; if (stateRow.status === "observed") c.observed++; else if (stateRow.status === "active") c.active++; else if (stateRow.status === "consented") c.consented++; else if (stateRow.status === "available") c.available++; else c.unavailable++; }
      itemSummaries.push({ item_id: item.id, institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, products: productStates });
    } catch { const observed = observedByItem.get(item.id) ?? new Set<string>(); itemSummaries.push({ item_id: item.id, institution_name: item.institution_name, status: "provider_state_unavailable", last_synced_at: item.last_synced_at, products: CANONICAL_CATALOG.map((definition) => ({ key: definition.key, displayName: definition.displayName, status: observed.has(definition.key) ? "observed" : "not_available", observed: observed.has(definition.key) })) }); }
  }
  const products = CANONICAL_CATALOG.map((definition) => { const c = counts.get(definition.key)!; return { ...definition, status: c.observed ? "observed" : items?.length ? c.active ? "active" : c.consented ? "consented" : c.available ? "available" : "not_available" : "not_connected", item_count: c.items, observed_item_count: c.observed, active_item_count: c.active, consented_item_count: c.consented, available_item_count: c.available, unavailable_item_count: c.unavailable }; });
  const canonicalEvidenceItem = itemSummaries.find((i) => CANONICAL_PRODUCTS.every((product) => i.products?.some((p: any) => p.key === product && p.status === "observed")))?.item_id ?? null;
  const fieldInventory = Object.fromEntries(CANONICAL_PRODUCTS.map((product) => { const rows = rawEvidence.filter((r: any) => r.product === product && r.item_id === canonicalEvidenceItem); const fields = topLevelFields(rows); return [product, { product, field_count: fields.length, fields, nested_field_inventory: nestedFieldInventory(rows), source_observation_count: rows.length, same_item: true, evidence_state: "observed" }]; }));
  const evidenceFieldInventory = Object.fromEntries(CANONICAL_PRODUCTS.map((product) => { const rows = rawEvidence.filter((r: any) => r.product === product); return [product, { product, record_count: rows.length, nested_field_inventory: nestedFieldInventory(rows), same_item_required_for_certification: true }]; }));
  res.json({ catalog_version: "2026-09-06-canonical-8-field-map-v2", source: "plaid_runtime_item_state_and_provider_domain_evidence", canonical_products: [...CANONICAL_PRODUCTS], items: itemSummaries, products, accounts: accounts ?? [], provider_evidence: rawEvidence, provider_evidence_counts: Object.fromEntries(CANONICAL_PRODUCTS.map((p) => [p, rawEvidence.filter((r: any) => r.product === p).length])), field_inventory: fieldInventory, evidence_field_inventory: evidenceFieldInventory, product_state_legend: { observed: "Direct live Plaid domain response recorded as current evidence.", active: "Plaid reports the product active but a current provider-domain observation is not recorded.", consented: "Plaid reports consent without current observed evidence.", available: "Plaid reports availability without current observed evidence.", not_available: "No current provider state for this canonical domain." }, source_boundary: "This surface contains only the eight canonical Plaid/Iris evidence domains. Raw source-of-truth records are read only. Nested field inventory is derived from observed raw provider responses and distinguishes present, null and absent-by-record; it does not claim that an optional field should exist when Plaid did not return it." });
});
