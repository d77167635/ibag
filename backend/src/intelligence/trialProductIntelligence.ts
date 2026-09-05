import { supabaseAdmin } from "../config/supabase.js";

type RawObservation = {
  id: string;
  item_id: string;
  product: string;
  raw_response: any;
  evidence_state: string;
  acquired_at: string;
};

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

/** Converts certified real Trial-product observations into bounded Iris intelligence inputs. */
export async function buildTrialProductIntelligence(userId: string) {
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

  const byProduct = Object.fromEntries(summaries.map((s) => [s.product, s]));
  return {
    observed_products: [...new Set(observed.map((r) => r.product))],
    summaries,
    by_product: byProduct,
    consumed_products: [...new Set(consumptionRows.map((r) => r.product))],
    consumed_analyses: [...new Set(consumptionRows.map((r) => r.analysis_key))],
    evidence_rule: "Only current Plaid raw observations with evidence_state=observed and matching current product observation authority are eligible for consumption.",
  };
}
