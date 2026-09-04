import { supabaseAdmin } from "../config/supabase.js";
import { getPlaidAccessToken } from "./tokenStore.js";
import { plaidClient } from "../plaid/client.js";

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
  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, user_id, institution_name, status, last_synced_at, plaid_access_token")
    .eq("user_id", userId);
  if (error) throw error;

  const aggregate = new Map<string, { score: number; status: string; itemCount: number; capabilities: string[] }>();
  const itemResults: any[] = [];

  for (const item of items ?? []) {
    try {
      const token = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const response = await plaidClient.itemGet({ access_token: token });
      const raw = response.data.item as any;
      const products = new Set<string>([
        ...(raw.products ?? []), ...(raw.billed_products ?? []),
        ...(raw.available_products ?? []), ...(raw.consented_products ?? []),
      ]);
      const ranked = [...products].map((product) => {
        const r = rank(product);
        const status = (raw.billed_products ?? []).includes(product) ? "active"
          : (raw.consented_products ?? []).includes(product) ? "consented"
          : (raw.available_products ?? []).includes(product) ? "available" : "present";
        return { product, status, ...r };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.product.localeCompare(b.product));

      for (const candidate of ranked) {
        const old = aggregate.get(candidate.product);
        aggregate.set(candidate.product, {
          score: Math.max(old?.score ?? 0, candidate.score),
          status: candidate.status,
          itemCount: (old?.itemCount ?? 0) + 1,
          capabilities: [...new Set([...(old?.capabilities ?? []), ...candidate.capabilities])],
        });
      }
      itemResults.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, selected: ranked.slice(0, 12) });
    } catch (err) {
      console.error(`Iris Plaid product selection failed for ${item.id}:`, err);
      itemResults.push({ institution_name: item.institution_name, status: "selection_unavailable", last_synced_at: item.last_synced_at, selected: [] });
    }
  }

  return {
    strategy: "iris_evidence_weighted_product_selection_v1",
    selected: [...aggregate.entries()].map(([product, value]) => ({ product, ...value })).sort((a, b) => b.score - a.score || a.product.localeCompare(b.product)),
    items: itemResults,
    principles: [
      "Rank products by the incremental Financial Life State capabilities they can unlock.",
      "Use only product evidence actually present, consented, or available for an Item.",
      "Never treat an unavailable product as observed.",
      "Never silently request consent or activate a product.",
    ],
  };
}
