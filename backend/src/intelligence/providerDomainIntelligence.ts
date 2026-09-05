import { supabaseAdmin } from "../config/supabase.js";
import { getCertifiedEvidenceBoundary } from "./certifiedEvidenceBoundary.js";

const PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
type Product = typeof PRODUCTS[number];
type RawProduct = { id: string; item_id: string; product: string; raw_response: any; acquired_at: string };
type RawCore = { id: string; account_id: string; item_id: string; raw_response?: any; acquired_at: string };
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

function currencyOf(row: any): string | null {
  const value = row?.raw_response?.balances?.iso_currency_code ?? row?.raw_response?.iso_currency_code ?? row?.iso_currency_code;
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : null;
}

function sameCurrency(rows: RawCore[]): { currency: string | null; safe: boolean } {
  const currencies = new Set(rows.map(currencyOf).filter((v): v is string => Boolean(v)));
  if (currencies.size === 1) return { currency: [...currencies][0], safe: true };
  if (currencies.size === 0) return { currency: null, safe: false };
  return { currency: null, safe: false };
}

/**
 * Converts current same-Item Plaid evidence into analytical inputs.
 * Provider monetary values remain in provider units (Plaid dollars) at this boundary;
 * no database money columns are mutated. Aggregations are permitted only when currency
 * is known and consistent. Account balances are the mutually-exclusive net-worth basis;
 * Assets report balances and investment holdings are never added on top of those balances.
 */
export async function buildProviderDomainIntelligence(userId: string) {
  const [{ data: authorities, error: authorityError }, { data: rawProducts, error: rawError }, { data: accounts, error: accountError }, { data: rawTransactions, error: txError }, { data: rawBalances, error: balanceError }, { data: rawLiabilities, error: liabilityError }] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id,type,subtype,current_balance,available_balance,credit_limit").eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_transactions").select("id,account_id,acquired_at,raw_response").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id,account_id,acquired_at,raw_response").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_liabilities").select("id,account_id,raw_response,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);
  if (authorityError) throw authorityError;
  if (rawError) throw rawError;
  if (accountError) throw accountError;
  if (txError) throw txError;
  if (balanceError) throw balanceError;
  if (liabilityError) throw liabilityError;

  const accountToItem = new Map<string, string>((accounts ?? []).map((a: any) => [a.id, a.item_id]));
  const attach = (rows: any[]): RawCore[] => rows.map(r => ({ id: r.id, account_id: r.account_id, acquired_at: r.acquired_at, raw_response: r.raw_response, item_id: accountToItem.get(r.account_id)! })).filter(r => Boolean(r.item_id));
  const txRows = attach(rawTransactions ?? []);
  const balanceRows = attach(rawBalances ?? []);
  const liabilityRows = attach(rawLiabilities ?? []);
  const raw = (rawProducts ?? []) as RawProduct[];
  const auth = (authorities ?? []) as Authority[];

  const byItem = new Map<string, Set<string>>();
  const add = (itemId: string, product: string) => {
    const set = byItem.get(itemId) ?? new Set<string>();
    set.add(product);
    byItem.set(itemId, set);
  };
  for (const a of auth) add(a.item_id, a.product);
  for (const row of txRows) add(row.item_id, "transactions");
  for (const row of balanceRows) add(row.item_id, "balance");
  for (const row of liabilityRows) add(row.item_id, "liabilities");

  const certifiedItemIds = [...byItem.entries()]
    .filter(([, products]) => PRODUCTS.every(product => products.has(product)))
    .map(([itemId]) => itemId)
    .sort();
  const selectedItemId = certifiedItemIds[0] ?? null;
  const boundary = await getCertifiedEvidenceBoundary(userId);
  const selectedProducts = selectedItemId ? byItem.get(selectedItemId) ?? new Set<string>() : new Set<string>();
  const result: any = {
    architecture_version: "IRIS_PROVIDER_DOMAIN_INTELLIGENCE_V2",
    evidence_boundary: boundary,
    selected_item_id: selectedItemId,
    evidence_ready: selectedItemId !== null && PRODUCTS.every(product => selectedProducts.has(product)),
    domains: {},
    utilization: { products: [], analyses: [], source_observations: {}, same_item: true },
    limitations: [] as string[],
  };
  if (!selectedItemId) {
    result.limitations.push("No single active Item currently contains all eight canonical Plaid evidence domains.");
    return result;
  }

  const source = (product: Product) => {
    const authority = auth.find(a => a.item_id === selectedItemId && a.product === product);
    const specialized = product === "transactions" ? txRows.filter(r => r.item_id === selectedItemId) : product === "balance" ? balanceRows.filter(r => r.item_id === selectedItemId) : product === "liabilities" ? liabilityRows.filter(r => r.item_id === selectedItemId) : [];
    const generic = raw.filter(r => r.item_id === selectedItemId && r.product === product);
    const authoritativeSpecialized = product === "transactions" || product === "balance" || product === "liabilities";
    const ids = authoritativeSpecialized ? specialized.map(r => r.id) : generic.map(r => r.id);
    return { authority, specialized, generic, ids, authoritativeSpecialized };
  };

  const authSource = source("auth");
  const identitySource = source("identity");
  const assetSource = source("assets");
  const investmentSource = source("investments");
  const statementSource = source("statements");
  const liabilitySource = source("liabilities");
  const transactionSource = source("transactions");
  const balanceSource = source("balance");

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
  const liabilityPayloads = liabilitySource.specialized.map(r => r.raw_response).filter(Boolean);
  const liabilityRecords = liabilityPayloads.flatMap((payload: any) => [
    ...arrayAt(payload, ["liabilities", "credit"], ["credit"]),
    ...arrayAt(payload, ["liabilities", "student"], ["student"]),
    ...arrayAt(payload, ["liabilities", "mortgage"], ["mortgage"]),
  ]);

  const accountRows = (accounts ?? []).filter((a: any) => a.item_id === selectedItemId);
  const balanceCurrency = sameCurrency(balanceSource.specialized);
  const depositoryBalances = accountRows.filter((a: any) => String(a.type ?? "").toLowerCase() === "depository");
  const investmentAccountBalances = accountRows.filter((a: any) => String(a.type ?? "").toLowerCase() === "investment");
  const debtAccountBalances = accountRows.filter((a: any) => ["credit", "loan"].includes(String(a.type ?? "").toLowerCase()));
  const liquidBalance = balanceCurrency.safe ? sumNumbers(depositoryBalances, ["current_balance"]) : null;
  const investmentAccountBalance = balanceCurrency.safe ? sumNumbers(investmentAccountBalances, ["current_balance"]) : null;
  const debtAccountBalance = balanceCurrency.safe ? sumNumbers(debtAccountBalances, ["current_balance"]) : null;
  const liabilityBalance = sumNumbers(liabilityRecords, ["last_statement_balance", "current_balance", "balance"]);
  const liabilityCurrency = new Set(liabilityRows.flatMap((r: any) => [r.raw_response?.liabilities?.credit?.[0]?.iso_currency_code, r.raw_response?.credit?.[0]?.iso_currency_code]).filter(Boolean));
  const netWorth = balanceCurrency.safe && (liquidBalance !== null || investmentAccountBalance !== null || debtAccountBalance !== null)
    ? (liquidBalance ?? 0) + (investmentAccountBalance ?? 0) - (debtAccountBalance ?? 0)
    : null;

  const statementAccountIds = new Set(statementAccounts.map((a: any) => String(a?.account_id ?? "")).filter(Boolean));
  const transactionAccountIds = new Set(txRows.filter(r => r.item_id === selectedItemId).map(r => r.account_id));
  const statementTransactionAccountOverlap = [...statementAccountIds].filter(id => transactionAccountIds.has(id)).length;

  result.domains = {
    auth: { account_records: authAccounts.length, source_observation_ids: authSource.ids, response_received: Boolean(authPayload) },
    identity: { record_count: identityAccounts.length, source_observation_ids: identitySource.ids, response_received: Boolean(identityPayload) },
    assets: { asset_items: assetItems.length, report_received: Boolean(assetPayload), source_observation_ids: assetSource.ids, numeric_value_used_for_net_worth: false },
    investments: { holding_records: investmentHoldings.length, security_records: investmentSecurities.length, holding_value_observed: sumNumbers(investmentHoldings, ["institution_value", "market_value"]), source_observation_ids: investmentSource.ids, numeric_holdings_used_for_net_worth: false },
    liabilities: { liability_records: liabilityRecords.length, liability_balance_observed: liabilityBalance, source_observation_ids: liabilitySource.ids, liability_currency_count: liabilityCurrency.size },
    statements: { statement_records: statements.length, statement_accounts: statementAccounts.length, transaction_account_overlap: statementTransactionAccountOverlap, source_observation_ids: statementSource.ids, response_received: Boolean(statementPayload), dollar_reconciliation: null },
    transactions: { transaction_records: transactionSource.specialized.length, source_observation_ids: transactionSource.ids },
    balance: { balance_records: balanceSource.specialized.length, currency: balanceCurrency.currency, currency_safe_for_aggregation: balanceCurrency.safe, liquid_balance_observed: liquidBalance, source_observation_ids: balanceSource.ids },
  };

  const usedProducts: Product[] = [...PRODUCTS];
  const usedAnalyses = ["asset_position", "portfolio", "net_worth", "debt_health", "statement_reconciliation", "history", "account_integrity", "identity_context"];
  const consumptionPlans: Array<{ product: Product; analyses: string[] }> = [
    { product: "assets", analyses: ["asset_position"] },
    { product: "investments", analyses: ["portfolio"] },
    { product: "liabilities", analyses: ["debt_health"] },
    { product: "balance", analyses: ["net_worth", "debt_health", "account_integrity"] },
    { product: "transactions", analyses: ["net_worth", "debt_health", "statement_reconciliation", "history"] },
    { product: "statements", analyses: ["statement_reconciliation", "history"] },
    { product: "auth", analyses: ["account_integrity"] },
    { product: "identity", analyses: ["identity_context", "account_integrity"] },
  ];

  const consumptionRows: any[] = [];
  for (const plan of consumptionPlans) {
    const s = source(plan.product);
    const authority = s.authority;
    if (!authority) continue;
    if (s.authoritativeSpecialized && !s.specialized.length) continue;
    if (!s.authoritativeSpecialized && !s.generic.length) continue;
    const sourceIds = s.ids;
    const rawObservationId = sourceIds[0] ?? null;
    if (!rawObservationId) continue;
    const sourceKind = s.authoritativeSpecialized
      ? plan.product === "transactions" ? "plaid_raw_transactions" : plan.product === "balance" ? "plaid_raw_balances" : "plaid_raw_liabilities"
      : "plaid_raw_product_observations";
    for (const analysisKey of plan.analyses) {
      consumptionRows.push({
        user_id: userId,
        item_id: selectedItemId,
        product: plan.product,
        analysis_key: analysisKey,
        evidence_observation_id: authority.id,
        raw_observation_id: rawObservationId,
        dedupe_observation_id: rawObservationId,
        details: {
          evidence_state: "observed",
          source_kind: sourceKind,
          source_observation_ids: sourceIds,
          selected_item_id: selectedItemId,
          combination_key: "full_financial_state",
          authoritative_source: true,
          actual_analysis_use: true,
          provider_units: "plaid_currency_units",
          currency: plan.product === "balance" ? balanceCurrency.currency : null,
        },
      });
    }
  }
  if (consumptionRows.length) {
    const { error } = await supabaseAdmin.from("iris_product_consumption").upsert(consumptionRows, { onConflict: "user_id,item_id,product,analysis_key,dedupe_observation_id", ignoreDuplicates: true });
    if (error) throw error;
  }

  result.utilization = {
    products: usedProducts.filter(product => {
      const s = source(product);
      return Boolean(s.authority && (s.authoritativeSpecialized ? s.specialized.length : s.generic.length));
    }),
    analyses: usedAnalyses,
    source_observations: Object.fromEntries(usedProducts.map(product => [product, source(product).ids])),
    same_item: true,
    rule: "Only current observed provider evidence from the selected eight-product Item is used. Specialized account-scoped sources are authoritative for transactions, balance, and liabilities. Assets report balances and investment holdings are not added to net worth because those values overlap account balances.",
  };

  result.derived = {
    net_worth: netWorth,
    net_worth_components: {
      liquid_assets: liquidBalance,
      investment_accounts: investmentAccountBalance,
      debt_accounts: debtAccountBalance,
      liabilities_product_balance: liabilityBalance,
      basis: "mutually_exclusive_plaid_account_balances",
      assets_report_excluded_from_net_worth: true,
      investment_holdings_excluded_from_net_worth: true,
    },
    portfolio: {
      market_value: sumNumbers(investmentHoldings, ["institution_value", "market_value"]),
      holdings: investmentHoldings.length,
      securities: investmentSecurities.length,
      source_observation_ids: investmentSource.ids,
    },
    statement_reconciliation: {
      statement_records: statements.length,
      statement_accounts: statementAccounts.length,
      transaction_records: txRows.filter(r => r.item_id === selectedItemId).length,
      transaction_account_overlap: statementTransactionAccountOverlap,
      statement_to_transaction_coverage: statementAccounts.length > 0 ? statementTransactionAccountOverlap / statementAccounts.length : null,
      dollar_reconciliation: null,
      limitation: "A count/account-overlap coverage measure is not a dollar reconciliation; no dollar reconciliation is asserted without statement-period and transaction-amount matching.",
    },
    account_integrity: {
      auth_records: authAccounts.length,
      identity_records: identityAccounts.length,
      balance_accounts: accountRows.length,
      identity_auth_match: authAccounts.length > 0 && identityAccounts.length > 0 ? authAccounts.length === identityAccounts.length : null,
    },
    liability_state: {
      liability_records: liabilityRecords.length,
      liability_balance: liabilityBalance,
      account_balance_basis: debtAccountBalance,
    },
  };

  if (!balanceCurrency.safe) result.limitations.push("Plaid balance evidence does not expose one unambiguous currency across the selected Item; monetary aggregation is withheld.");
  if (assetItems.length) result.limitations.push("Plaid Assets report is observed and consumed for asset-position evidence, but its account balances are excluded from net worth to prevent overlap with canonical account balances.");
  if (investmentHoldings.length) result.limitations.push("Plaid Investments holdings are observed and consumed for portfolio analysis, but their values are excluded from net worth to prevent overlap with investment account balances.");
  if (liabilityBalance !== null && debtAccountBalance !== null) result.limitations.push("Plaid Liabilities balance is retained as a separate product observation and not subtracted again from account-balance net worth.");
  return result;
}
