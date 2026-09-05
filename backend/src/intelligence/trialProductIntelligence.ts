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

// Required groups determine whether an answer can run. Optional groups enrich
// the answer but never block a valid evidence-grounded response.
const REQUIRED: Record<IrisProductIntent, string[][]> = {
  overview: [["transactions", "balance"]], cash_flow: [["transactions"]], spending: [["transactions"]],
  liquidity: [["balance", "transactions"]], debt: [["liabilities"]], roundups: [["transactions"]], anomaly: [["transactions"]],
  explanation: [], provider_data: [], unknown: [],
};
const OPTIONAL: Record<IrisProductIntent, string[][]> = {
  overview: [["liabilities"], ["assets", "investments"], ["statements"]], cash_flow: [["balance"], ["statements"]], spending: [["balance"], ["statements"]],
  liquidity: [["transactions"]], debt: [["balance"], ["transactions"]], roundups: [["balance"]], anomaly: [["balance"]], explanation: [], provider_data: [], unknown: [],
};

const COMBINATION_LIBRARY = [
  { key: "cash_flow_state", products: ["transactions", "balance"], analyses: ["cash_flow", "liquidity", "forecasting"] },
  { key: "debt_liquidity", products: ["liabilities", "balance", "transactions"], analyses: ["debt_health", "cash_flow_risk", "liquidity"] },
  { key: "net_worth_state", products: ["assets", "investments", "liabilities", "balance"], analyses: ["asset_position", "portfolio", "net_worth"] },
  { key: "statement_reconciliation", products: ["statements", "transactions", "balance"], analyses: ["statement_reconciliation", "history", "cash_flow"] },
  { key: "account_integrity", products: ["auth", "identity", "balance"], analyses: ["account_integrity", "identity_context"] },
  { key: "behavior_and_forecast", products: ["transactions", "balance", "statements"], analyses: ["behavior", "forecasting", "history"] },
  { key: "full_financial_state", products: ["transactions", "balance", "assets", "investments", "liabilities", "statements", "auth", "identity"], analyses: ["financial_state", "net_worth", "cash_flow", "spending", "debt_health", "portfolio", "history", "account_integrity"] },
] as const;

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

function evaluateGroups(groups: string[][], observed: Set<string>) { return groups.map((group) => ({ acceptable_products: group, observed_products: group.filter((product) => observed.has(product)), satisfied: group.some((product) => observed.has(product)) })); }
function chooseCombinations(observedProducts: string[], intent: IrisProductIntent) {
  const observed = new Set(observedProducts);
  const required = evaluateGroups(REQUIRED[intent] ?? [], observed);
  const optional = evaluateGroups(OPTIONAL[intent] ?? [], observed);
  const candidates = COMBINATION_LIBRARY.map((combo) => { const missing_products = combo.products.filter((product) => !observed.has(product)); return { ...combo, evidence_ready: missing_products.length === 0, missing_products }; });
  return {
    intent, required, optional, evidence_ready: required.every((r) => r.satisfied),
    ready_combinations: candidates.filter((c) => c.evidence_ready),
    blocked_combinations: candidates.filter((c) => !c.evidence_ready).map(({ key, missing_products }) => ({ key, missing_products })),
  };
}

/** Converts certified provider observations into bounded Iris evidence inputs. */
export async function buildTrialProductIntelligence(userId: string, intent: IrisProductIntent = "unknown") {
  const [{ data: authorityRows, error: authorityError }, { data: rawProducts, error: rawProductError }, { count: transactionCount, error: transactionError }, { count: balanceCount, error: balanceError }] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations").select("id,item_id,product,acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,evidence_state,acquired_at").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed").order("acquired_at", { ascending: false }),
    supabaseAdmin.from("plaid_raw_transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_balances").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);
  if (authorityError) throw authorityError; if (rawProductError) throw rawProductError; if (transactionError) throw transactionError; if (balanceError) throw balanceError;
  const authorities = (authorityRows ?? []) as ProductAuthority[];
  const rawObserved = (rawProducts ?? []) as RawObservation[];
  const observedProducts = [...new Set(authorities.map((r) => r.product))];
  const summaries: any[] = rawObserved.map((row) => ({ item_id: row.item_id, product: row.product, acquired_at: row.acquired_at, ...summarize(row.product, row.raw_response) }));
  const transactionAuthority = authorities.find((r) => r.product === "transactions");
  const balanceAuthority = authorities.find((r) => r.product === "balance");
  if (transactionAuthority) summaries.push({ item_id: transactionAuthority.item_id, product: "transactions", acquired_at: transactionAuthority.acquired_at, transaction_raw_observation_count: transactionCount ?? 0 });
  if (balanceAuthority) summaries.push({ item_id: balanceAuthority.item_id, product: "balance", acquired_at: balanceAuthority.acquired_at, balance_raw_observation_count: balanceCount ?? 0 });

  const consumptionRows: any[] = [];
  for (const row of rawObserved) {
    const authority = authorities.find((a) => a.item_id === row.item_id && a.product === row.product);
    if (!authority) continue;
    for (const analysisKey of CONSUMPTION[row.product] ?? []) consumptionRows.push({ user_id: userId, item_id: row.item_id, product: row.product, analysis_key: analysisKey, evidence_observation_id: authority.id, raw_observation_id: row.id, details: { evidence_state: row.evidence_state, acquired_at: row.acquired_at, source_kind: "plaid_raw_product_observations" } });
  }
  const coreConsumption = authorities.filter((a) => CORE_PRODUCTS.has(a.product)).flatMap((a) => (CONSUMPTION[a.product] ?? []).map((analysisKey) => ({ item_id: a.item_id, product: a.product, analysis_key: analysisKey, evidence_observation_id: a.id, source_kind: a.product === "transactions" ? "plaid_raw_transactions" : "plaid_raw_balances" })));
  if (consumptionRows.length) {
    const { error: consumptionError } = await supabaseAdmin.from("iris_product_consumption").upsert(consumptionRows, { onConflict: "user_id,item_id,product,analysis_key,raw_observation_id", ignoreDuplicates: true });
    if (consumptionError) throw consumptionError;
  }
  return {
    observed_products: observedProducts,
    summaries,
    by_product: Object.fromEntries(summaries.map((s) => [s.product, s])),
    consumed_products: [...new Set([...consumptionRows.map((r) => r.product), ...coreConsumption.map((r) => r.product)])],
    consumed_analyses: [...new Set([...consumptionRows.map((r) => r.analysis_key), ...coreConsumption.map((r) => r.analysis_key)])],
    core_consumption: coreConsumption,
    selection: chooseCombinations(observedProducts, intent),
    evidence_rule: "Only current Plaid product observations with lifecycle_state=observed and evidence_state=observed are selectable; each product must retain a real provider-source mirror appropriate to that product.",
  };
}
