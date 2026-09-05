import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";
import { computeCanonicalScenario } from "../intelligence/canonicalScenario.js";
import { evaluateIntelligenceValidation } from "../intelligence/validationEngine.js";
import { assessModelGovernance } from "../intelligence/modelGovernance.js";

export const dashboardRouter = Router();

dashboardRouter.post("/dashboard/accounts/:accountId/roundup-toggle", requireAuth, async (req: AuthedRequest, res) => {
  const { accountId } = req.params;
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "Body must include boolean `enabled`" });
  const { data, error } = await supabaseAdmin.from("plaid_accounts").update({ roundup_enabled: enabled }).eq("id", accountId).eq("user_id", req.userId!).select("id, roundup_enabled").single();
  if (error || !data) return res.status(404).json({ error: "Account not found" });
  res.json({ account_id: data.id, roundup_enabled: data.roundup_enabled });
});

dashboardRouter.get("/dashboard/overview", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [{ data: accounts, error: accountsErr }, { data: recentTx, error: txErr }, { data: ibag, error: ibagErr }] = await Promise.all([
    supabaseAdmin.from("plaid_accounts").select("id, item_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, roundup_enabled, created_at").eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id, account_id, amount, iso_currency_code, merchant_name, merchant_id, plaid_category_primary, plaid_category_detailed, posted_date, transaction_class, classification_evidence, classification_version, pending, is_active, merchants(canonical_name), subdomains(label, domains(key, label))").eq("user_id", userId).eq("is_active", true).eq("pending", false).order("posted_date", { ascending: false }).limit(50),
    supabaseAdmin.from("virtual_ibag_balance").select("user_id, projected_balance, updated_at").eq("user_id", userId).maybeSingle(),
  ]);
  if (accountsErr) console.error("dashboard/overview accounts query error:", accountsErr.message);
  if (txErr) console.error("dashboard/overview transactions query error:", txErr.message);
  if (ibagErr) console.error("dashboard/overview ibag query error:", ibagErr.message);
  const withMerchant = (recentTx ?? []).filter((t: any) => t.merchants).length;
  const withSubdomain = (recentTx ?? []).filter((t: any) => t.subdomains).length;
  console.log(`dashboard/overview for user ${userId}: ${recentTx?.length ?? 0} tx, ${withMerchant} with merchant join, ${withSubdomain} with subdomain join`);
  res.json({ accounts: accounts ?? [], recent_transactions: recentTx ?? [], ibag: ibag ?? null });
});

dashboardRouter.get("/dashboard/hierarchy", requireAuth, async (_req, res) => {
  const { data: domains, error } = await supabaseAdmin.from("domains").select("*, subdomains(*, category_mapping(*))").order("sort_order");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ domains });
});

dashboardRouter.get("/dashboard/roundups", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [{ data: ledger }, { data: events }] = await Promise.all([
    supabaseAdmin.from("card_roundup_ledger").select("*, plaid_accounts(name, mask)").eq("user_id", userId),
    supabaseAdmin.from("roundup_sweep_events").select("*, plaid_accounts(name, mask)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  res.json({ ledger: ledger ?? [], events: events ?? [] });
});

dashboardRouter.post("/dashboard/roundups/preview-transfer", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { account_id, amount } = req.body as { account_id?: string; amount?: number };
  if (!account_id || !amount || amount <= 0) return res.status(400).json({ error: "account_id and a positive amount are required" });
  const { data: account, error } = await supabaseAdmin.from("plaid_accounts").select("plaid_account_id, item_id").eq("id", account_id).eq("user_id", userId).single();
  if (error || !account) return res.status(404).json({ error: "Account not found" });
  const { data: item } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_access_token").eq("id", account.item_id).eq("user_id", userId).single();
  if (!item) return res.status(404).json({ error: "Item not found" });
  const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
  res.json(await previewTransferBackToCard(userId, account_id, amount, accessToken, account.plaid_account_id));
});

dashboardRouter.get("/dashboard/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const full = await computeFullIntelligence(req.userId!);
    const metrics = full.layer_metrics;
    res.json({ narrative: full.narrative, generated_at: full.generated_at, net_worth: metrics.net_worth, debt_health: { ...metrics.debt_health, interest_cost_attribution: full.layer_debt_cost }, cash_flow_safety: metrics.cash_flow_safety, roundup_projection: metrics.roundup_projection, cash_flow: metrics.cash_flow, spending_by_domain: metrics.spending_by_domain, balance_history: metrics.balance_history, forward_projection: metrics.forward_projection, anomalies: metrics.anomalies, spending_hierarchy: metrics.spending_hierarchy, category_drift: full.layer_behavioral.categoryDrift, reasoning: full.layer_reasoning, temporal: full.layer_temporal, maximum_intelligence: full.layer_max_intelligence, feature_flags: full.feature_flags, provider_lineage: full.provider_lineage, integrity: full.integrity, source_fidelity: full.source_fidelity, intelligence_gate: full.intelligence_gate, evidence_boundary: full.evidence_boundary, evidence_graph: full.evidence_graph, intelligence_graph: full.intelligence_graph, investigations: full.investigations, uncertainty: full.uncertainty, financial_state: full.financial_state, causal_analysis: full.causal_analysis, decision_graph: full.decision_graph, decision_intelligence: full.decision_intelligence, consequence_model: full.consequence_model, optimization_intelligence: full.optimization_intelligence, goal_intelligence: full.goal_intelligence, intelligence_atlas: full.intelligence_atlas, intelligence_composition: full.intelligence_composition, layer_composition: full.layer_composition, higher_order_synthesis: full.higher_order_synthesis, adversarial_reasoning: full.adversarial_reasoning, counterfactual_intelligence: full.counterfactual_intelligence, meta_intelligence: full.meta_intelligence });
  } catch (err) { console.error("dashboard/intelligence error:", err); res.status(500).json({ error: "Failed to compute intelligence metrics" }); }
});

dashboardRouter.get("/dashboard/intelligence/validation", requireAuth, async (req: AuthedRequest, res) => {
  try { res.json(await evaluateIntelligenceValidation(req.userId!)); } catch (err) { console.error("dashboard/intelligence/validation error:", err); res.status(500).json({ error: "Failed to evaluate intelligence validation" }); }
});

dashboardRouter.get("/dashboard/intelligence/governance", requireAuth, async (req: AuthedRequest, res) => {
  try { const validation = await evaluateIntelligenceValidation(req.userId!); res.json(assessModelGovernance(validation.observations)); } catch (err) { console.error("dashboard/intelligence/governance error:", err); res.status(500).json({ error: "Failed to evaluate intelligence governance" }); }
});

const PLAID_STANDARD_PRODUCTS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;

type ProductObservationRow = { item_id: string; product: string; lifecycle_state: string; evidence_state: string; is_current: boolean; acquired_at: string | null };

function dashboardProductStatus(row: ProductObservationRow | undefined): "observed" | "authorized" | "available" | "not_observed" {
  if (!row) return "not_observed";
  if (row.lifecycle_state === "observed" && row.evidence_state === "observed") return "observed";
  if (row.lifecycle_state === "authorized") return "authorized";
  if (row.lifecycle_state === "available") return "available";
  return "not_observed";
}

dashboardRouter.get("/dashboard/plaid", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { data: items, error } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_item_id, institution_name, status, last_synced_at").eq("user_id", userId);
  if (error) return res.status(500).json({ error: error.message });
  const observations = items?.length ? ((await supabaseAdmin.from("plaid_product_observations").select("item_id, product, lifecycle_state, evidence_state, is_current, acquired_at").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true)).data ?? []) as ProductObservationRow[] : [];
  const byItemProduct = new Map(observations.map((o) => [`${o.item_id}:${o.product}`, o]));
  const itemSummaries = (items ?? []).map((item: any) => ({
    institution_name: item.institution_name,
    status: item.status,
    last_synced_at: item.last_synced_at,
    products: PLAID_STANDARD_PRODUCTS.map((product) => {
      const row = byItemProduct.get(`${item.id}:${product}`);
      return { product, status: dashboardProductStatus(row), evidence_state: row?.evidence_state ?? "insufficient_evidence", acquired_at: row?.acquired_at ?? null };
    }),
  }));
  const products = PLAID_STANDARD_PRODUCTS.map((product) => {
    const rows = items?.map((item: any) => byItemProduct.get(`${item.id}:${product}`)).filter(Boolean) as ProductObservationRow[] | undefined;
    const observedCount = rows?.filter((row) => dashboardProductStatus(row) === "observed").length ?? 0;
    const authorizedCount = rows?.filter((row) => dashboardProductStatus(row) === "authorized").length ?? 0;
    const availableCount = rows?.filter((row) => dashboardProductStatus(row) === "available").length ?? 0;
    return { product, status: observedCount > 0 ? "observed" : authorizedCount > 0 ? "authorized" : availableCount > 0 ? "available" : items?.length ? "not_observed" : "not_connected", observed_item_count: observedCount, authorized_item_count: authorizedCount, available_item_count: availableCount, item_count: items?.length ?? 0 };
  });
  res.json({ items: itemSummaries, products, evidence_rule: "Only current lifecycle_state=observed and evidence_state=observed counts as observed. Availability, consent, authorization, billing, and itemGet product metadata never count as provider evidence." });
});

dashboardRouter.post("/dashboard/scenario", requireAuth, async (req: AuthedRequest, res) => {
  const { type, amount } = req.body as { type?: "spending_change" | "bill_change" | "income_change"; amount?: number };
  if (!type || !["spending_change", "bill_change", "income_change"].includes(type) || typeof amount !== "number") return res.status(400).json({ error: "type must be spending_change/bill_change/income_change, amount must be a number" });
  try { res.json(await computeCanonicalScenario(req.userId!, type, amount)); } catch (err) { console.error("dashboard/scenario error:", err); res.status(500).json({ error: "Failed to compute scenario" }); }
});
