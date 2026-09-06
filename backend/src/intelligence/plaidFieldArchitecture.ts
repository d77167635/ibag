import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

const PROTECTED_KEYS = /(?:access.?token|refresh.?token|secret|api.?key|password|authorization|client.?secret)/i;
function stableId(parts: string[]) { return `plaid-field-${createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 24)}`; }
function safeValue(key: string, value: unknown) { return PROTECTED_KEYS.test(key) ? { protected: true, value: null } : { protected: false, value }; }

type SourceRecord = { source_table: string; id: string; user_id: string; item_id: string; product: string; account_id?: string | null; raw_response: unknown; acquired_at: string; provider_object_id?: string | null };

function flatten(value: unknown, path: string, source: SourceRecord, out: any[]) {
  if (value === null || typeof value !== "object") {
    const name = path.split(".").pop()?.replace(/\[\d+\]$/, "") ?? path;
    const safe = safeValue(name, value);
    out.push({ field_id: stableId([source.source_table, source.id, path]), source_table: source.source_table, product: source.product, source_record_id: source.id, item_id: source.item_id, account_id: source.account_id ?? null, path, field_name: name, exact_provider_field_name: name, value: safe.value, protected: safe.protected, value_type: value === null ? "null" : typeof value, evidence_state: "observed", acquired_at: source.acquired_at, provider_object_id: source.provider_object_id ?? null, lineage: `plaid:${source.product}:${source.id}:${path}` });
    return;
  }
  if (Array.isArray(value)) { value.forEach((child, index) => flatten(child, `${path}[${index}]`, source, out)); return; }
  Object.keys(value as Record<string, unknown>).sort().forEach((key) => flatten((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key, source, out));
}

function addHierarchy(root: any, field: any) {
  const segments = field.path.replace(/^\$\.?/, "").split(".").filter(Boolean);
  let node = root;
  segments.forEach((segment: string, index: number) => {
    const clean = segment.replace(/\[\d+\]$/, "[]");
    node.children ??= [];
    let child = node.children.find((x: any) => x.name === clean);
    if (!child) { child = { name: clean, depth: index + 1, children: [], field_count: 0 }; node.children.push(child); }
    child.field_count += 1;
    node = child;
  });
}

/** Provider/source field architecture. Structural depth is descriptive, not a fixed tier model. */
export async function buildCompletePlaidFieldArchitecture(userId: string) {
  const [rawProducts, rawTransactions, rawBalances, rawLiabilities, accounts] = await Promise.all([
    supabaseAdmin.from("plaid_raw_product_observations").select("id,user_id,item_id,product,raw_response,acquired_at,provider_object_id").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_transactions").select("id,user_id,account_id,raw_response,acquired_at,provider_object_id").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id,user_id,account_id,raw_response,acquired_at,provider_object_id").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id,user_id,account_id,raw_response,acquired_at,provider_object_id").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id,plaid_account_id,name,official_name,mask,type,subtype,current_balance,available_balance,credit_limit,balance_updated_at,roundup_enabled,created_at").eq("user_id", userId),
  ]);
  const failures = [rawProducts.error, rawTransactions.error, rawBalances.error, rawLiabilities.error, accounts.error].filter(Boolean);
  if (failures.length) throw failures[0];
  const accountToItem = new Map<string, string>((accounts.data ?? []).map((a: any) => [a.id, a.item_id]));
  const records: SourceRecord[] = [];
  for (const row of rawProducts.data ?? []) records.push({ source_table: "plaid_raw_product_observations", id: row.id, user_id: row.user_id, item_id: row.item_id, product: row.product, raw_response: row.raw_response, acquired_at: row.acquired_at, provider_object_id: row.provider_object_id });
  for (const row of rawTransactions.data ?? []) { const itemId = accountToItem.get(row.account_id); if (itemId) records.push({ source_table: "plaid_raw_transactions", id: row.id, user_id: row.user_id, item_id: itemId, product: "transactions", account_id: row.account_id, raw_response: row.raw_response, acquired_at: row.acquired_at, provider_object_id: row.provider_object_id }); }
  for (const row of rawBalances.data ?? []) { const itemId = accountToItem.get(row.account_id); if (itemId) records.push({ source_table: "plaid_raw_balances", id: row.id, user_id: row.user_id, item_id: itemId, product: "balance", account_id: row.account_id, raw_response: row.raw_response, acquired_at: row.acquired_at, provider_object_id: row.provider_object_id }); }
  for (const row of rawLiabilities.data ?? []) { const itemId = accountToItem.get(row.account_id); if (itemId) records.push({ source_table: "plaid_raw_liabilities", id: row.id, user_id: row.user_id, item_id: itemId, product: "liabilities", account_id: row.account_id, raw_response: row.raw_response, acquired_at: row.acquired_at, provider_object_id: row.provider_object_id }); }

  const occurrences: any[] = [];
  for (const record of records) if (record.raw_response !== null && record.raw_response !== undefined) flatten(record.raw_response, "$", record, occurrences);
  const unique = new Map<string, any>();
  for (const field of occurrences) {
    const key = `${field.product}|${field.path.replace(/\[\d+\]/g, "[]")}`;
    const existing = unique.get(key);
    if (!existing) unique.set(key, { ...field, canonical_path: field.path.replace(/\[\d+\]/g, "[]"), occurrence_count: 1, source_record_ids: [field.source_record_id] });
    else { existing.occurrence_count += 1; if (!existing.source_record_ids.includes(field.source_record_id)) existing.source_record_ids.push(field.source_record_id); }
  }
  const hierarchy: any = { name: "Plaid", depth: 0, children: [], field_count: unique.size };
  for (const field of unique.values()) addHierarchy(hierarchy, field);
  const products = [...new Set(records.map((r) => r.product))].sort();
  const byProduct = Object.fromEntries(products.map((product) => { const productFields = [...unique.values()].filter((f) => f.product === product); return [product, { field_count: productFields.length, record_count: records.filter((r) => r.product === product).length, fields: productFields }]; }));
  const relationalAccountFields = (accounts.data ?? []).flatMap((account: any) => Object.entries(account).filter(([key]) => !PROTECTED_KEYS.test(key)).map(([key, value]) => ({ field_id: stableId(["plaid_accounts", account.id, key]), source_table: "plaid_accounts", product: "account", source_record_id: account.id, item_id: account.item_id, account_id: account.id, path: `$.${key}`, field_name: key, exact_provider_field_name: key, value, protected: false, value_type: value === null ? "null" : typeof value, evidence_state: "observed", lineage: `plaid:account:${account.id}:${key}` })));
  const maxDepth = [...unique.values()].reduce((m, f) => Math.max(m, f.canonical_path.split(".").length), 0);
  const structuralDepth = { payload_max_depth: maxDepth, hierarchy_max_depth: maxDepth + 1, dynamic: true, derived_from_actual_observed_fields: true };
  return {
    architecture_version: "PLAID_COMPLETE_SOURCE_FIELD_ARCHITECTURE_V2",
    source: "plaid",
    source_boundary: "provider observations only; Supabase is persistence and evidence storage, not an Iris intelligence source",
    exact_provider_field_names: true, exact_provider_values: true, fabricated_values: false,
    structural_depth: structuralDepth,
    products_and_capabilities: products,
    records,
    fields: [...unique.values(), ...relationalAccountFields],
    provider_payload_fields: [...unique.values()], relational_account_fields: relationalAccountFields, by_product: byProduct, hierarchy,
    counts: { records: records.length, provider_payload_field_occurrences: occurrences.length, unique_provider_fields: unique.size, relational_account_fields: relationalAccountFields.length, total_fields: unique.size + relationalAccountFields.length, products_or_capabilities: products.length, max_payload_depth: maxDepth },
    rules: [
      "Provider field names and paths are preserved exactly; no provider field is renamed or flattened into a substitute semantic field.",
      "Provider payload values are copied exactly when not protected credentials.",
      "Protected credential fields remain represented as protected metadata but their values are never exposed.",
      "Only current observed provider evidence is included in the live provider field universe.",
      "Array indexes are normalized only for canonical grouping; original occurrence paths remain available.",
      "Structural depth is generated from actual provider payload nesting and has no fixed maximum.",
      "Canonical product labels are views over the source field universe, not architectural ceilings."
    ]
  };
}
