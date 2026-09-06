import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";

const PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];

type SourceRow = { id: string; item_id: string; product?: string; account_id?: string; raw_response: any; acquired_at: string };

function stableId(parts: string[]) {
  return `iris-${createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 24)}`;
}

function walk(value: any, path: string, out: any[], context: { userId: string; itemId: string; product: Product; dataId: string; sourceId: string; acquiredAt: string; accountId?: string }) {
  if (value === null || value === undefined || typeof value !== "object") {
    out.push({
      field_id: stableId(["field", context.sourceId, path]),
      data_id: context.dataId,
      source_observation_id: context.sourceId,
      user_id: context.userId,
      item_id: context.itemId,
      product: context.product,
      account_id: context.accountId ?? null,
      path,
      value,
      value_type: value === null ? "null" : typeof value,
      evidence_state: "observed",
      acquired_at: context.acquiredAt,
      lineage: `plaid:${context.product}:${context.sourceId}:${path}`,
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, out, context));
    return;
  }
  Object.keys(value).sort().forEach(key => walk(value[key], path ? `${path}.${key}` : key, out, context));
}

function sourceDataId(product: Product, row: SourceRow) {
  return stableId(["data", product, row.id]);
}

/** Exact provider-field lineage for Iris. This is metadata over Plaid evidence, not a mutation of provider data. */
export async function buildPlaidIrisFieldMap(userId: string) {
  const [{ data: authorities, error: authorityError }, { data: rawProducts, error: productError }, { data: rawTransactions, error: txError }, { data: rawBalances, error: balanceError }, { data: rawLiabilities, error: liabilityError }, { data: accounts, error: accountError }] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_transactions").select("id,account_id,acquired_at,raw_response").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id,account_id,acquired_at,raw_response").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id,account_id,acquired_at,raw_response").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id").eq("user_id", userId),
  ]);
  if (authorityError) throw authorityError;
  if (productError) throw productError;
  if (txError) throw txError;
  if (balanceError) throw balanceError;
  if (liabilityError) throw liabilityError;
  if (accountError) throw accountError;

  const accountToItem = new Map<string, string>((accounts ?? []).map((a: any) => [a.id, a.item_id]));
  const authorityByKey = new Map<string, any>((authorities ?? []).map((a: any) => [`${a.item_id}:${a.product}`, a]));
  const rows: Array<{ product: Product; row: SourceRow }> = [];
  for (const row of rawProducts ?? []) {
    if (PRODUCTS.includes(row.product as Product)) rows.push({ product: row.product as Product, row });
  }
  for (const row of rawTransactions ?? []) {
    const itemId = accountToItem.get(row.account_id);
    if (itemId) rows.push({ product: "transactions", row: { ...row, item_id: itemId } });
  }
  for (const row of rawBalances ?? []) {
    const itemId = accountToItem.get(row.account_id);
    if (itemId) rows.push({ product: "balance", row: { ...row, item_id: itemId } });
  }
  for (const row of rawLiabilities ?? []) {
    const itemId = accountToItem.get(row.account_id);
    if (itemId) rows.push({ product: "liabilities", row: { ...row, item_id: itemId } });
  }

  const byProduct: Record<Product, any[]> = { auth: [], transactions: [], balance: [], identity: [], assets: [], liabilities: [], investments: [], statements: [] };
  const fieldRows: any[] = [];
  const dataRecords: any[] = [];
  for (const { product, row } of rows) {
    const itemId = row.item_id;
    if (!itemId || !row.raw_response || !authorityByKey.has(`${itemId}:${product}`)) continue;
    const dataId = sourceDataId(product, row);
    const fields: any[] = [];
    walk(row.raw_response, "$", fields, { userId, itemId, product, dataId, sourceId: row.id, acquiredAt: row.acquired_at, accountId: row.account_id });
    dataRecords.push({ data_id: dataId, source_observation_id: row.id, user_id: userId, item_id: itemId, product, account_id: row.account_id ?? null, acquired_at: row.acquired_at, field_count: fields.length });
    fieldRows.push(...fields);
    byProduct[product].push({ data_id: dataId, source_observation_id: row.id, item_id: itemId, account_id: row.account_id ?? null, acquired_at: row.acquired_at, fields });
  }

  const uniqueFields = new Map<string, any>();
  for (const field of fieldRows) {
    const key = `${field.product}|${field.path}`;
    const existing = uniqueFields.get(key);
    if (!existing) uniqueFields.set(key, { ...field, occurrence_count: 1, data_ids: [field.data_id], source_observation_ids: [field.source_observation_id] });
    else {
      existing.occurrence_count += 1;
      if (!existing.data_ids.includes(field.data_id)) existing.data_ids.push(field.data_id);
      if (!existing.source_observation_ids.includes(field.source_observation_id)) existing.source_observation_ids.push(field.source_observation_id);
    }
  }

  const layers: Record<string, Product[]> = {
    "01 · Command": [],
    "02 · Financial State": ["balance", "assets", "investments", "liabilities"],
    "03 · Cash Flow": ["transactions", "balance", "statements"],
    "04 · Spending": ["transactions"],
    "05 · iBag": ["transactions", "balance"],
    "06 · Evidence": [...PRODUCTS],
    "07 · Intelligence": [...PRODUCTS],
    "08 · Behavior": ["transactions"],
    "09 · Reasoning": [...PRODUCTS],
    "10 · Decisions": ["transactions", "balance", "liabilities", "investments"],
    "11 · Simulation": ["transactions", "balance", "liabilities", "investments"],
    "12 · Maximum Intelligence": [...PRODUCTS],
  };
  const productToLayers: Record<string, string[]> = {};
  for (const [layer, products] of Object.entries(layers)) for (const product of products) (productToLayers[product] ??= []).push(layer);
  for (const field of uniqueFields.values()) field.iris_layers = productToLayers[field.product] ?? [];

  return {
    architecture_version: "IRIS_PLAID_FIELD_LINEAGE_V1",
    source: "plaid",
    exact_provider_values: true,
    fabricated_values: false,
    data_records: dataRecords,
    fields: [...uniqueFields.values()],
    by_product: byProduct,
    mapping: Object.fromEntries(PRODUCTS.map(product => [product, { iris_layers: productToLayers[product] ?? [], data_records: byProduct[product].length, unique_fields: [...uniqueFields.values()].filter(field => field.product === product).length }])),
    counts: { data_records: dataRecords.length, field_occurrences: fieldRows.length, unique_fields: uniqueFields.size, products_observed: PRODUCTS.filter(product => byProduct[product].length > 0).length },
    rules: ["Every field has a stable field_id.", "Every provider record has a stable data_id.", "Every field retains source observation and Item lineage.", "Values are copied exactly from current observed Plaid evidence; no interpretation replaces the provider value.", "A field may map to multiple Iris layers without duplicating or changing the provider value."]
  };
}
