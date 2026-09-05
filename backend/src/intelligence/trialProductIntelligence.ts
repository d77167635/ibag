import { supabaseAdmin } from "../config/supabase.js";

type RawObservation = { id: string; item_id: string; product: string; raw_response: any; evidence_state: string; acquired_at: string };
type ProductAuthority = { id: string; item_id: string; product: string; acquired_at: string };

export type IrisProductIntent = "overview" | "cash_flow" | "spending" | "liquidity" | "debt" | "roundups" | "anomaly" | "explanation" | "provider_data" | "unknown";
const CORE_PRODUCTS = new Set(["transactions", "balance"]);
const CONSUMPTION: Record<string, string[]> = {
  auth: ["account_integrity"], identity: ["identity_context", "account_integrity"], assets: ["asset_position", "net_worth"],
  liabilities: ["debt_health", "net_worth", "cash_flow_risk"], investments: ["portfolio", "net_worth", "financial_state"],
  statements: ["statement_reconciliation", "history"], transactions: ["cash_flow", "spending", "behavior", "roundups", "forecasting"],
  balance: ["liquidity", "cash_flow", "net_worth", "financial_state"],
};

const REQUIRED: Record<IrisProductIntent, string[][]> = {
  overview: [["transactions"], ["balance"]], cash_flow: [["transactions"]], spending: [["transactions"]],
  liquidity: [["balance"], ["transactions"]], debt: [["liabilities"]], roundups: [["transactions"]], anomaly: [["transactions"]],
  explanation: [], provider_data: [], unknown: [],
};
const OPTIONAL: Record<IrisProductIntent, string[][]> = {
  overview: [["liabilities"], ["assets", "investments"], ["statements"]], cash_flow: [["balance"], ["statements"]], spending: [["balance"], ["statements"]],
  liquidity: [["transactions"]], debt: [["balance"], ["transactions"]], roundups: [["balance"]], anomaly: [["balance"]], explanation: [], provider_data: [], unknown: [],
};

export const COMBINATION_LIBRARY = [
  { key: "cash_flow_state", products: ["transactions", "balance"], analyses: ["cash_flow", "liquidity", "forecasting"] },
  { key: "debt_liquidity", products: ["liabilities", "balance", "transactions"], analyses: ["debt_health", "cash_flow_risk", "liquidity"] },
  { key: "net_worth_state", products: ["assets", "investments", "liabilities", "balance"], analyses: ["asset_position", "portfolio", "net_worth"] },
  { key: "statement_reconciliation", products: ["statements", "transactions", "balance"], analyses: ["statement_reconciliation", "history", "cash_flow"] },
  { key: "account_integrity", products: ["auth", "identity", "balance"], analyses: ["account_integrity", "identity_context"] },
  { key: "behavior_and_forecast", products: ["transactions", "balance", "statements"], analyses: ["behavior", "forecasting", "history"] },
  { key: "full_financial_state", products: ["transactions", "balance", "assets", "investments", "liabilities", "statements", "auth", "identity"], analyses: ["financial_state", "net_worth", "cash_flow", "spending", "debt_health", "portfolio", "history", "account_integrity"] },
] as const;

export type ObservedByItem = Map<string, Set<string>>;

/** Pure selection contract: all required groups must be satisfied by one and the same Item. */
export function chooseIrisCombinations(observedByItem: ObservedByItem, intent: IrisProductIntent) {
  const requiredGroups = REQUIRED[intent] ?? [];
  const required = requiredGroups.map((group) => ({
    acceptable_products: group,
    satisfied_on_item: [...observedByItem.entries()]
      .filter(([, products]) => group.some((p) => products.has(p)))
      .map(([item_id]) => item_id),
  }));
  const optional = (OPTIONAL[intent] ?? []).map((group) => ({
    acceptable_products: group,
    satisfied_on_item: [...observedByItem.entries()]
      .filter(([, products]) => group.some((p) => products.has(p)))
      .map(([item_id]) => item_id),
  }));

  // Required groups are conjunctive and must resolve to one Item. This is the
  // critical anti-cross-Item invariant: satisfying group A on Item X and group
  // B on Item Y does not certify the intent.
  const requiredItemIds = [...observedByItem.entries()]
    .filter(([, products]) => requiredGroups.every((group) => group.some((p) => products.has(p))))
    .map(([item_id]) => item_id);

  const candidates = COMBINATION_LIBRARY.map((combo) => {
    const matchingItems = [...observedByItem.entries()]
      .filter(([, products]) => combo.products.every((product) => products.has(product)))
      .map(([item_id]) => item_id);
    return {
      ...combo,
      evidence_ready: matchingItems.length > 0,
      matching_item_ids: matchingItems,
      missing_products: combo.products.filter((product) => ![...observedByItem.values()].some((products) => products.has(product))),
    };
  });

  return {
    intent,
    required,
    optional,
    evidence_ready: requiredGroups.length === 0 || requiredItemIds.length > 0,
    required_item_ids: requiredItemIds,
    ready_combinations: candidates.filter((c) => c.evidence_ready),
    blocked_combinations: candidates.filter((c) => !c.evidence_ready).map(({ key, missing_products }) => ({ key, missing_products })),
    cross_item_combination_forbidden: true,
  };
}

function arrayAt(value: any, ...paths: string[][]): any[] { for (const path of paths) { let cursor = value; for (const key of path) cursor = cursor?.[key]; if (Array.isArray(cursor)) return cursor; } return []; }
function numericSum(rows: any[], fields: string[]): number | null { const values = rows.map((row) => { for (const field of fields) { const value = Number(row?.[field]); if (Number.isFinite(value)) return value; } return null; }).filter((v): v is number => v !== null); return values.length ? values.reduce((a, b) => a + b, 0) : null; }
function summarize(product: string, payload: any) {
  switch (product) {
    case "auth": { const accounts = arrayAt(payload, ["accounts"]); return { account_records: accounts.length, auth_response_received: true }; }
    case "identity": { const identity = payload?.identity ?? payload; const owners = arrayAt(identity, ["owners"], ["accounts"]); return { identity_records: owners.length || (identity ? 1 : 0), identity_response_received: true }; }
    case "assets": { const reports = arrayAt(payload, ["report", "items"], ["report", "accounts"], ["items"], ["accounts"]); return { asset_records: reports.length, asset_value_observed: numericSum(reports, ["value", "current_value", "balance"]) }; }
    case "liabilities": { const liabilities = [...arrayAt(payload, ["liabilities", "credit"], ["credit"]), ...arrayAt(payload, ["liabilities", "student"], ["student"]), ...arrayAt(payload, ["liabilities", "mortgage"], ["mortgage"])]; return { liability_records: liabilities.length, liability_balance_observed: numericSum(liabilities, ["last_statement_balance", "current_balance", "balance"]) }; }
    case "investments": { const holdings = arrayAt(payload, ["holdings"], ["investment_holdings"]); const securities = arrayAt(payload, ["securities"]); return { holding_records: holdings.length, security_records: securities.length, holding_value_observed: numericSum(holdings, ["institution_value", "market_value", "quantity"]) }; }
    case "statements": { const statements = arrayAt(payload, ["statements"], ["items"]); return { statement_records: statements.length, statement_response_received: true }; }
    default: return { response_received: true };
  }
}

/** Converts certified provider observations into bounded Iris evidence inputs. */
export async function buildTrialProductIntelligence(userId: string, intent: IrisProductIntent = "unknown") {
  const [{ data: authorityRows, error: authorityError }, { data: rawProducts, error: rawProductError }, { data: rawTransactions, error: transactionError }, { data: rawBalances, error: balanceError }] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,evidence_state,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed").order("acquired_at", { ascending: false }),
    supabaseAdmin.from("plaid_raw_transactions").select("id,item_id", { count: "exact" }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id,item_id", { count: "exact" }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);
  if (authorityError) throw authorityError; if (rawProductError) throw rawProductError; if (transactionError) throw transactionError; if (balanceError) throw balanceError;
  const authorities = (authorityRows ?? []) as ProductAuthority[];
  const rawObserved = (rawProducts ?? []) as RawObservation[];
  const evidenceKeys = new Set<string>();
  for (const row of rawObserved) evidenceKeys.add(`${row.item_id}:${row.product}`);
  for (const row of (rawTransactions ?? []) as any[]) evidenceKeys.add(`${row.item_id}:transactions`);
  for (const row of (rawBalances ?? []) as any[]) evidenceKeys.add(`${row.item_id}:balance`);
  const eligibleAuthorities = authorities.filter((a) => evidenceKeys.has(`${a.item_id}:${a.product}`));
  const observedByItem = new Map<string, Set<string>>();
  for (const a of eligibleAuthorities) { const set = observedByItem.get(a.item_id) ?? new Set<string>(); set.add(a.product); observedByItem.set(a.item_id, set); }
  const observedProducts = [...new Set(eligibleAuthorities.map((r) => r.product))];
  const summaries: any[] = rawObserved.map((row) => ({ item_id: row.item_id, product: row.product, acquired_at: row.acquired_at, ...summarize(row.product, row.raw_response) }));
  const transactionCountByItem = new Map<string, number>();
  for (const row of (rawTransactions ?? []) as any[]) transactionCountByItem.set(row.item_id, (transactionCountByItem.get(row.item_id) ?? 0) + 1);
  const balanceCountByItem = new Map<string, number>();
  for (const row of (rawBalances ?? []) as any[]) balanceCountByItem.set(row.item_id, (balanceCountByItem.get(row.item_id) ?? 0) + 1);
  for (const authority of eligibleAuthorities.filter((a) => a.product === "transactions")) summaries.push({ item_id: authority.item_id, product: "transactions", acquired_at: authority.acquired_at, transaction_raw_observation_count: transactionCountByItem.get(authority.item_id) ?? 0 });
  for (const authority of eligibleAuthorities.filter((a) => a.product === "balance")) summaries.push({ item_id: authority.item_id, product: "balance", acquired_at: authority.acquired_at, balance_raw_observation_count: balanceCountByItem.get(authority.item_id) ?? 0 });
  const consumptionRows: any[] = [];
  for (const row of rawObserved) {
    const authority = eligibleAuthorities.find((a) => a.item_id === row.item_id && a.product === row.product);
    if (!authority) continue;
    for (const analysisKey of CONSUMPTION[row.product] ?? []) consumptionRows.push({ user_id: userId, item_id: row.item_id, product: row.product, analysis_key: analysisKey, evidence_observation_id: authority.id, raw_observation_id: row.id, details: { evidence_state: row.evidence_state, acquired_at: row.acquired_at, source_kind: "plaid_raw_product_observations" } });
  }
  const coreConsumption = eligibleAuthorities.filter((a) => CORE_PRODUCTS.has(a.product)).flatMap((a) => (CONSUMPTION[a.product] ?? []).map((analysisKey) => ({ item_id: a.item_id, product: a.product, analysis_key: analysisKey, evidence_observation_id: a.id, source_kind: a.product === "transactions" ? "plaid_raw_transactions" : "plaid_raw_balances" })));
  if (consumptionRows.length) {
    const { error: consumptionError } = await supabaseAdmin.from("iris_product_consumption").upsert(consumptionRows, { onConflict: "user_id,item_id,product,analysis_key,raw_observation_id", ignoreDuplicates: true });
    if (consumptionError) throw consumptionError;
  }
  return {
    observed_products: observedProducts,
    observed_by_item: Object.fromEntries([...observedByItem.entries()].map(([item, products]) => [item, [...products]])),
    summaries,
    by_product: Object.fromEntries(summaries.map((s) => [s.product, s])),
    consumed_products: [...new Set([...consumptionRows.map((r) => r.product), ...coreConsumption.map((r) => r.product)])],
    consumed_analyses: [...new Set([...consumptionRows.map((r) => r.analysis_key), ...coreConsumption.map((r) => r.analysis_key)])],
    core_consumption: coreConsumption,
    selection: chooseIrisCombinations(observedByItem, intent),
    evidence_rule: "Only current Plaid product observations with lifecycle_state=observed and evidence_state=observed are selectable, and every selected product must have a matching current observed provider-source mirror on the same Plaid Item. Products from different Items are never combined implicitly.",
  };
}
