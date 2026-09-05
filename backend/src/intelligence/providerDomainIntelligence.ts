import { supabaseAdmin } from "../config/supabase.js";
import { getCertifiedEvidenceBoundary } from "./certifiedEvidenceBoundary.js";

const PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
type RawProduct = { id: string; item_id: string; product: string; raw_response: any; acquired_at: string };
type RawCore = { id: string; account_id: string; acquired_at: string; item_id: string };
type Authority = { id: string; item_id: string; product: string; acquired_at: string };

function arrayAt(value: any, ...paths: string[][]): any[] {
  for (const path of paths) {
    let cursor = value;
    for (const key of path) cursor = cursor?.[key];
    if (Array.isArray(cursor)) return cursor;
  }
  return [];
}
function numberAt(value: any, fields: string[]): number | null {
  for (const field of fields) {
    const n = Number(value?.[field]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function sumNumbers(rows: any[], fields: string[]): number | null {
  const values = rows.map(row => numberAt(row, fields)).filter((n): n is number => n !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}
function uniqueById(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = String(row?.statement_id ?? row?.id ?? row?.statement_date ?? JSON.stringify(row));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Converts current, same-Item Plaid provider evidence into actual analytical inputs.
 * This module is deliberately deterministic and never invents a value when Plaid did
 * not provide one. Every returned domain carries its authoritative source IDs.
 */
export async function buildProviderDomainIntelligence(userId: string) {
  const [{ data: authorities, error: authorityError }, { data: rawProducts, error: rawError }, { data: accounts, error: accountError }, { data: rawTransactions, error: txError }, { data: rawBalances, error: balanceError }, { data: rawLiabilities, error: liabilityError }] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id").eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_transactions").select("id,account_id,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id,account_id,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id,account_id,raw_response,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);
  if (authorityError) throw authorityError;
  if (rawError) throw rawError;
  if (accountError) throw accountError;
  if (txError) throw txError;
  if (balanceError) throw balanceError;
  if (liabilityError) throw liabilityError;

  const accountToItem = new Map<string, string>((accounts ?? []).map((a: any) => [a.id, a.item_id]));
  const attach = (rows: any[]): RawCore[] => rows.map(r => ({ id: r.id, account_id: r.account_id, acquired_at: r.acquired_at, item_id: accountToItem.get(r.account_id)! })).filter(r => Boolean(r.item_id));
  const txRows = attach(rawTransactions ?? []);
  const balanceRows = attach(rawBalances ?? []);
  const liabilityRows = attach(rawLiabilities ?? []);
  const raw = (rawProducts ?? []) as RawProduct[];
  const auth = (authorities ?? []) as Authority[];

  const byItem = new Map<string, Set<string>>();
  for (const a of auth) {
    const set = byItem.get(a.item_id) ?? new Set<string>();
    set.add(a.product);
    byItem.set(a.item_id, set);
  }
  for (const row of txRows) (byItem.get(row.item_id) ?? new Set<string>()).add("transactions");
  for (const row of balanceRows) (byItem.get(row.item_id) ?? new Set<string>()).add("balance");
  for (const row of liabilityRows) (byItem.get(row.item_id) ?? new Set<string>()).add("liabilities");

  const certifiedItemIds = [...byItem.entries()].filter(([, products]) => PRODUCTS.every(product => products.has(product))).map(([itemId]) => itemId);
  const selectedItemId = certifiedItemIds.sort()[0] ?? null;
  const boundary = await getCertifiedEvidenceBoundary(userId);
  const selectedProducts = selectedItemId ? byItem.get(selectedItemId) ?? new Set<string>() : new Set<string>();
  const source = (product: Product) => {
    const authority = auth.find(a => a.item_id === selectedItemId && a.product === product);
    const specialized = product === "transactions" ? txRows.filter(r => r.item_id === selectedItemId) : product === "balance" ? balanceRows.filter(r => r.item_id === selectedItemId) : product === "liabilities" ? liabilityRows.filter(r => r.item_id === selectedItemId) : [];
    const generic = raw.filter(r => r.item_id === selectedItemId && r.product === product);
    return { authority, specialized, generic, ids: specialized.length ? specialized.map(r => r.id) : generic.map(r => r.id) };
  };

  const result: any = {
    architecture_version: "IRIS_PROVIDER_DOMAIN_INTELLIGENCE_V1",
    evidence_boundary: boundary,
    selected_item_id: selectedItemId,
    evidence_ready: selectedItemId !== null && PRODUCTS.every(product => selectedProducts.has(product)),
    domains: {},
    utilization: { products: [], analyses: [], source_observations: {} },
    limitations: [] as string[],
  };
  if (!selectedItemId) {
    result.limitations.push("No single active Item currently contains all eight canonical Plaid evidence domains.");
    return result;
  }

  const authSource = source("auth");
  const identitySource = source("identity");
  const assetSource = source("assets");
  const investmentSource = source("investments");
  const statementSource = source("statements");
  const liabilitySource = source("liabilities");

  const authPayload = authSource.generic[0]?.raw_response;
  const identityPayload = identitySource.generic[0]?.raw_response;
  const assetPayload = assetSource.generic[0]?.raw_response;
  const investmentPayload = investmentSource.generic[0]?.raw_response;
  const statementPayload = statementSource.generic[0]?.raw_response;

  const authAccounts = arrayAt(authPayload, ["accounts"]);
  const identityRoot = identityPayload?.identity ?? identityPayload;
  const identityAccounts = arrayAt(identityRoot, ["accounts"], ["owners"]);
  const assetItems = arrayAt(assetPayload, ["report", "items"], ["report", "accounts"], ["items"], ["accounts"]);
  const investmentHoldings = arrayAt(investmentPayload, ["holdings"], ["investment_holdings"]);
  const investmentSecurities = arrayAt(investmentPayload, ["securities"]);
  const statementAccounts = arrayAt(statementPayload, ["accounts"]);
  const statements = uniqueById(statementAccounts.flatMap((a: any) => Array.isArray(a?.statements) ? a.statements : []).concat(arrayAt(statementPayload, ["statements"], ["items"])));
  const liabilityPayloads = liabilityRows.filter(r => r.item_id === selectedItemId).map((r: any) => r.raw_response).filter(Boolean);
  const liabilityRecords = liabilityPayloads.flatMap((payload: any) => [
    ...arrayAt(payload, ["liabilities", "credit"], ["credit"]),
    ...arrayAt(payload, ["liabilities", "student"], ["student"]),
    ...arrayAt(payload, ["liabilities", "mortgage"], ["mortgage"]),
  ]);

  const txCount = txRows.filter(r => r.item_id === selectedItemId).length;
  const balanceCount = balanceRows.filter(r => r.item_id === selectedItemId).length;
  const liabilityBalance = sumNumbers(liabilityRecords, ["last_statement_balance", "current_balance", "balance"]);
  const assetValue = sumNumbers(assetItems.flatMap((item: any) => Array.isArray(item?.accounts) ? item.accounts : [item]), ["value", "current_value", "balance"]);
  const investmentValue = sumNumbers(investmentHoldings, ["institution_value", "market_value"]);
  const liquidBalanceRows = (accounts ?? []).filter((a: any) => a.item_id === selectedItemId && ["depository", "cash management"].includes(String(a.type ?? "").toLowerCase()));
  const liquidBalance = liquidBalanceRows.reduce((sum: number, a: any) => sum + (Number(a.current_balance) || 0), 0);

  result.domains = {
    auth: { account_records: authAccounts.length, source_observation_ids: authSource.ids, response_received: Boolean(authPayload) },
    identity: { account_records: identityAccounts.length, source_observation_ids: identitySource.ids, response_received: Boolean(identityPayload) },
    assets: { asset_items: assetItems.length, asset_value_observed: assetValue, source_observation_ids: assetSource.ids, response_received: Boolean(assetPayload) },
    investments: { holding_records: investmentHoldings.length, security_records: investmentSecurities.length, holding_value_observed: investmentValue, source_observation_ids: investmentSource.ids, response_received: Boolean(investmentPayload) },
    liabilities: { liability_records: liabilityRecords.length, liability_balance_observed: liabilityBalance, source_observation_ids: liabilitySource.ids },
    statements: { statement_records: statements.length, statement_accounts: statementAccounts.length, source_observation_ids: statementSource.ids, response_received: Boolean(statementPayload) },
    transactions: { transaction_records: txCount, source_observation_ids: source("transactions").ids },
    balance: { balance_records: balanceCount, liquid_balance_observed: liquidBalanceRows.length ? liquidBalance : null, source_observation_ids: source("balance").ids },
  };

  const usedProducts: Product[] = ["assets", "investments", "liabilities", "balance", "transactions", "statements", "auth", "identity"];
  const usedAnalyses = ["asset_position", "portfolio", "net_worth", "debt_health", "statement_reconciliation", "history", "account_integrity", "identity_context"];
  result.utilization = {
    products: usedProducts.filter(product => selectedProducts.has(product)),
    analyses: usedAnalyses,
    source_observations: Object.fromEntries(usedProducts.map(product => [product, source(product).ids])),
    same_item: true,
    rule: "Only current observed provider evidence from the selected eight-product Item is used; absent numeric fields remain null.",
  };

  const netWorthComponents = { liquid_assets: liquidBalanceRows.length ? liquidBalance : null, assets: assetValue, investments: investmentValue, liabilities: liabilityBalance };
  result.derived = {
    net_worth: netWorthComponents.liquid_assets !== null || netWorthComponents.assets !== null || netWorthComponents.investments !== null || netWorthComponents.liabilities !== null
      ? (netWorthComponents.liquid_assets ?? 0) + (netWorthComponents.assets ?? 0) + (netWorthComponents.investments ?? 0) - (netWorthComponents.liabilities ?? 0)
      : null,
    net_worth_components: netWorthComponents,
    portfolio: { market_value: investmentValue, holdings: investmentHoldings.length, securities: investmentSecurities.length },
    statement_reconciliation: { statement_records: statements.length, transaction_records: txCount, balance_records: balanceCount, statement_to_transaction_coverage: statements.length > 0 ? txCount / statements.length : null },
    account_integrity: { auth_accounts: authAccounts.length, identity_accounts: identityAccounts.length, balance_accounts: balanceCount, identity_auth_match: authAccounts.length > 0 && identityAccounts.length > 0 ? authAccounts.length === identityAccounts.length : null },
    liability_state: { liability_records: liabilityRecords.length, liability_balance: liabilityBalance },
  };
  if (assetValue === null) result.limitations.push("Plaid Assets evidence is present but contains no directly summable asset value in the current provider payload.");
  if (investmentValue === null) result.limitations.push("Plaid Investments evidence is present but contains no directly summable holding value in the current provider payload.");
  if (liabilityBalance === null) result.limitations.push("Plaid Liabilities evidence is present but contains no directly summable liability balance in the current provider payload.");
  return result;
}
