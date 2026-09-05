import { supabaseAdmin } from "../config/supabase.js";

type RawObservation = {
  id: string;
  item_id: string;
  product: string;
  raw_response: any;
  evidence_state: string;
  acquired_at: string;
};

export type IrisProductIntent =
  | "overview"
  | "cash_flow"
  | "spending"
  | "liquidity"
  | "debt"
  | "roundups"
  | "anomaly"
  | "explanation"
  | "provider_data"
  | "unknown";

const CONSUMPTION: Record<string, string[]> = {
  auth: ["account_integrity"],
  identity: ["identity_context", "account_integrity"],
  assets: ["asset_position", "net_worth"],
  liabilities: ["debt_health", "net_worth", "cash_flow_risk"],
  investments: ["portfolio", "net_worth", "financial_state"],
  statements: ["statement_reconciliation", "history"],
  transactions: ["cash_flow", "spending", "behavior", "roundups", "forecasting"],
  balance: ["liquidity", "cash_flow", "net_worth", "financial_state"],
};

// These are evidence requirements, not permissions. Iris can only choose a
// product when the corresponding current raw provider observation is certified.
const INTENT_REQUIREMENTS: Record<IrisProductIntent, string[][]> = {
  overview: [["transactions", "balance"], ["liabilities"], ["assets", "investments"], ["statements"]],
  cash_flow: [["transactions"], ["balance"], ["statements"]],
  spending: [["transactions"]],
  liquidity: [["balance", "transactions"]],
  debt: [["liabilities", "balance"], ["transactions"]],
  roundups: [["transactions"], ["balance"]],
  anomaly: [["transactions", "balance"]],
  explanation: [],
  provider_data: [],
  unknown: [],
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

function arrayAt(value: any, ...paths: string[][]): any[] {
  for (const path of paths) {
    let cursor = value;
    for (const key of path) cursor = cursor?.[key];
    if (Array.isArray(cursor)) return cursor;
  }
  return [];
}

function numericSum(rows: any[], fields: string[]): number | null {
  const values = rows.map((row) => {
    for (const field of fields) {
      const value = Number(row?.[field]);
      if (Number.isFinite(value)) return value;
    }
    return null;
  }).filter((v): v is number => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

function summarize(product: string, payload: any) {
  switch (product) {
    case "auth": {
      const accounts = arrayAt(payload, ["accounts"]);
      return { account_records: accounts.length, auth_response_received: true };
    }
    case "identity": {
      const identity = payload?.identity ?? payload;
      const owners = arrayAt(identity, ["owners"], ["accounts"]);
      return { identity_records: owners.length || (identity ? 1 : 0), identity_response_received: true };
    }
    case "assets": {
      const reports = arrayAt(payload, ["report", "items"], ["report", "accounts"], ["items"], ["accounts"]);
      return { asset_records: reports.length, asset_value_observed: numericSum(reports, ["value", "current_value", "balance"]) };
    }
    case "liabilities": {
      const liabilities = [
        ...arrayAt(payload, ["liabilities", "credit"], ["credit"]),
        ...arrayAt(payload, ["liabilities", "student"], ["student"]),
        ...arrayAt(payload, ["liabilities", "mortgage"], ["mortgage"]),
      ];
      return { liability_records: liabilities.length, liability_balance_observed: numericSum(liabilities, ["last_statement_balance", "current_balance", "balance"]) };
    }
    case "investments": {
      const holdings = arrayAt(payload, ["holdings"], ["investment_holdings"]);
      const securities = arrayAt(payload, ["securities"]);
      return { holding_records: holdings.length, security_records: securities.length, holding_value_observed: numericSum(holdings, ["institution_value", "market_value", "quantity"]) };
    }
    case "statements": {
      const statements = arrayAt(payload, ["statements"], ["items"]);
      return { statement_records: statements.length, statement_response_received: true };
    }
    default:
      return { response_received: true };
  }
}

function chooseCombinations(observedProducts: string[], intent: IrisProductIntent) {
  const observed = new Set(observedProducts);
  const candidates = COMBINATION_LIBRARY.map((combo) => {
    const missing_products = combo.products.filter((product) => !observed.has(product));
    const evidence_ready = missing_products.length === 0;
    return { ...combo, evidence_ready, missing_products };
  });
  const required = INTENT_REQUIREMENTS[intent] ?? [];
  const intentReady = required.map((group) => ({
    acceptable_products: group,
    observed_products: group.filter((product) => observed.has(product)),
    satisfied: group.some((product) => observed.has(product)),
  }));
  return {
    intent,
    requirements: intentReady,
    satisfied_requirements: intentReady.filter((r) => r.satisfied).length,
    total_requirements: intentReady.length,
    evidence_ready: intentReady.every((r) => r.satisfied),
    ready_combinations: candidates.filter((c) => c.evidence_ready),
    blocked_combinations: candidates.filter((c) => !c.evidence_ready).map(({ key, missing_products }) => ({ key, missing_products })),
  };
}

/** Converts certified real Trial-product observations into bounded Iris intelligence inputs. */
export async function buildTrialProductIntelligence(userId: string, intent: IrisProductIntent = "unknown") {
  const { data, error } = await supabaseAdmin
    .from("plaid_raw_product_observations")
    .select("id, item_id, product, raw_response, evidence_state, acquired_at")
    .eq("user_id", userId)
    .eq("is_current", true)
    .eq("evidence_state", "observed")
    .order("acquired_at", { ascending: false });
  if (error) throw error;

  const observed = (data ?? []) as RawObservation[];
  const summaries = observed.map((row) => ({ item_id: row.item_id, product: row.product, acquired_at: row.acquired_at, ...summarize(row.product, row.raw_response) }));
  const consumptionRows: any[] = [];

  for (const row of observed) {
    const { data: productObservation } = await supabaseAdmin
      .from("plaid_product_observations")
      .select("id")
      .eq("user_id", userId)
      .eq("item_id", row.item_id)
      .eq("provider", "plaid")
      .eq("product", row.product)
      .eq("is_current", true)
      .eq("lifecycle_state", "observed")
      .eq("evidence_state", "observed")
      .maybeSingle();
    if (!productObservation?.id) continue;

    for (const analysisKey of CONSUMPTION[row.product] ?? []) {
      consumptionRows.push({
        user_id: userId,
        item_id: row.item_id,
        product: row.product,
        analysis_key: analysisKey,
        evidence_observation_id: productObservation.id,
        raw_observation_id: row.id,
        details: { evidence_state: row.evidence_state, acquired_at: row.acquired_at },
      });
    }
  }

  if (consumptionRows.length) {
    const { error: consumptionError } = await supabaseAdmin
      .from("iris_product_consumption")
      .upsert(consumptionRows, { onConflict: "user_id,item_id,product,analysis_key,raw_observation_id", ignoreDuplicates: true });
    if (consumptionError) throw consumptionError;
  }

  const observedProducts = [...new Set(observed.map((r) => r.product))];
  const byProduct = Object.fromEntries(summaries.map((s) => [s.product, s]));
  return {
    observed_products: observedProducts,
    summaries,
    by_product: byProduct,
    consumed_products: [...new Set(consumptionRows.map((r) => r.product))],
    consumed_analyses: [...new Set(consumptionRows.map((r) => r.analysis_key))],
    selection: chooseCombinations(observedProducts, intent),
    evidence_rule: "Only current Plaid raw observations with evidence_state=observed and matching current product observation authority are eligible for consumption.",
  };
}
