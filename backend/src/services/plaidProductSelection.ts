import { supabaseAdmin } from "../config/supabase.js";

const CAPABILITIES: Record<string, string[]> = {
  transactions: ["spending", "cash_flow", "behavior", "patterns", "roundups", "forecasting"],
  recurring_transactions: ["bills", "recurring", "cash_flow", "forecasting"],
  balance: ["liquidity", "cash_flow", "financial_state"],
  balance_plus: ["liquidity", "cash_flow", "financial_state"],
  investments: ["investments", "net_worth", "portfolio", "financial_state"],
  liabilities: ["debt", "credit", "net_worth", "cash_flow", "risk"],
  income: ["income", "cash_flow", "forecasting", "stability"],
  income_verification: ["income", "stability"],
  employment: ["income", "stability"],
  assets: ["assets", "net_worth"],
  auth: ["account_identity", "cash_flow"],
  identity: ["account_identity"],
  credit_details: ["credit", "risk"],
  statements: ["history", "evidence", "reconciliation"],
  signal: ["risk"],
  enrich: ["classification", "merchant", "behavior"],
};

const PRIORITY: Record<string, number> = {
  financial_state: 10, cash_flow: 10, spending: 9, income: 9, bills: 9,
  liquidity: 9, debt: 9, credit: 8, net_worth: 8, investments: 8,
  forecasting: 8, behavior: 7, patterns: 7, recurring: 7, risk: 7,
  stability: 8, portfolio: 7, assets: 6, roundups: 6, classification: 5,
  merchant: 5, evidence: 5, history: 4, reconciliation: 4, account_identity: 2,
};

function rank(product: string) {
  const capabilities = CAPABILITIES[product] ?? [];
  return { score: capabilities.reduce((n, c) => n + (PRIORITY[c] ?? 1), 0), capabilities };
}

export async function selectPlaidProducts(userId: string) {
  const { data: items, error: itemError } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, institution_name, status, last_synced_at")
    .eq("user_id", userId);
  if (itemError) throw itemError;

  const { data: observations, error: observationError } = await supabaseAdmin
    .from("plaid_product_observations")
    .select("item_id, product, lifecycle_state, evidence_state, observed_at, acquired_at")
    .eq("user_id", userId)
    .eq("provider", "plaid")
    .eq("is_current", true);
  if (observationError) throw observationError;

  const observedByItem = new Map<string, any[]>();
  for (const row of observations ?? []) {
    if (row.lifecycle_state !== "observed" || row.evidence_state !== "observed") continue;
    const list = observedByItem.get(row.item_id) ?? [];
    list.push(row);
    observedByItem.set(row.item_id, list);
  }

  const aggregate = new Map<string, { score: number; status: string; itemCount: number; capabilities: string[] }>();
  const itemResults: any[] = [];

  for (const item of items ?? []) {
    const observed = observedByItem.get(item.id) ?? [];
    const ranked = observed.map((row) => ({ product: row.product, status: "observed", observed_at: row.observed_at ?? row.acquired_at, ...rank(row.product) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.product.localeCompare(b.product));

    for (const candidate of ranked) {
      const old = aggregate.get(candidate.product);
      aggregate.set(candidate.product, {
        score: Math.max(old?.score ?? 0, candidate.score),
        status: "observed",
        itemCount: (old?.itemCount ?? 0) + 1,
        capabilities: [...new Set([...(old?.capabilities ?? []), ...candidate.capabilities])],
      });
    }
    itemResults.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, selected: ranked.slice(0, 12) });
  }

  return {
    strategy: "iris_evidence_weighted_product_selection_v2",
    selected: [...aggregate.entries()].map(([product, value]) => ({ product, ...value })).sort((a, b) => b.score - a.score || a.product.localeCompare(b.product)),
    items: itemResults,
    principles: [
      "Rank products by the incremental Financial Life State capabilities unlocked by certified provider observations.",
      "Only current Plaid product observations with lifecycle_state=observed and evidence_state=observed can enter Iris evidence selection.",
      "Available, consented, authorized, billed, requested, or provider-metadata states never receive intelligence authority.",
      "Never silently request consent or activate a product.",
    ],
  };
}
