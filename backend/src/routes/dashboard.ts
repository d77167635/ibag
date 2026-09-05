import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { plaidClient } from "../plaid/client.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";
import { computeCanonicalScenario } from "../intelligence/canonicalScenario.js";
import { evaluateIntelligenceValidation } from "../intelligence/validationEngine.js";

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
  const result = await previewTransferBackToCard(userId, account_id, amount, accessToken, account.plaid_account_id);
  res.json(result);
});

dashboardRouter.get("/dashboard/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const full = await computeFullIntelligence(req.userId!);
    const metrics = full.layer_metrics;
    res.json({
      narrative: full.narrative, generated_at: full.generated_at, net_worth: metrics.net_worth,
      debt_health: { ...metrics.debt_health, interest_cost_attribution: full.layer_debt_cost }, cash_flow_safety: metrics.cash_flow_safety,
      roundup_projection: metrics.roundup_projection, cash_flow: metrics.cash_flow, spending_by_domain: metrics.spending_by_domain,
      balance_history: metrics.balance_history, forward_projection: metrics.forward_projection, anomalies: metrics.anomalies,
      spending_hierarchy: full.layer_metrics.spending_hierarchy, category_drift: full.layer_behavioral.categoryDrift, reasoning: full.layer_reasoning,
      temporal: full.layer_temporal, maximum_intelligence: full.layer_max_intelligence, feature_flags: full.feature_flags,
      provider_lineage: full.provider_lineage, integrity: full.integrity, source_fidelity: full.source_fidelity, intelligence_gate: full.intelligence_gate,
      evidence_boundary: full.evidence_boundary, evidence_graph: full.evidence_graph, intelligence_graph: full.intelligence_graph,
      investigations: full.investigations, uncertainty: full.uncertainty, financial_state: full.financial_state, causal_analysis: full.causal_analysis,
      decision_graph: full.decision_graph, decision_intelligence: full.decision_intelligence, consequence_model: full.consequence_model,
      optimization_intelligence: full.optimization_intelligence, goal_intelligence: full.goal_intelligence, intelligence_atlas: full.intelligence_atlas,
      intelligence_composition: full.intelligence_composition, higher_order_synthesis: full.higher_order_synthesis, meta_intelligence: full.meta_intelligence,
    });
  } catch (err) { console.error("dashboard/intelligence error:", err); res.status(500).json({ error: "Failed to compute intelligence metrics" }); }
});

dashboardRouter.get("/dashboard/intelligence/validation", requireAuth, async (req: AuthedRequest, res) => {
  try { res.json(await evaluateIntelligenceValidation(req.userId!)); }
  catch (err) { console.error("dashboard/intelligence/validation error:", err); res.status(500).json({ error: "Failed to evaluate intelligence validation" }); }
});

const PLAID_STANDARD_PRODUCTS = ["transactions", "auth", "balance", "identity", "investments", "liabilities", "transfer", "signal"] as const;

dashboardRouter.get("/dashboard/plaid", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { data: items, error } = await supabaseAdmin.from("plaid_items").select("id, user_id, plaid_item_id, plaid_access_token, institution_name, status, last_synced_at").eq("user_id", userId);
  if (error) return res.status(500).json({ error: error.message });
  if (!items || items.length === 0) return res.json({ items: [], products: PLAID_STANDARD_PRODUCTS.map((p) => ({ product: p, status: "not_connected" as const })) });
  const productStatus = new Map<string, "active" | "available" | "not_requested">(PLAID_STANDARD_PRODUCTS.map((p) => [p, "not_requested"]));
  const itemSummaries = [];
  for (const item of items) {
    try {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const itemResp = await plaidClient.itemGet({ access_token: accessToken });
      const billed = new Set(itemResp.data.item.billed_products ?? []), available = new Set(itemResp.data.item.available_products ?? []);
      for (const product of PLAID_STANDARD_PRODUCTS) { if (billed.has(product as any)) productStatus.set(product, "active"); else if (available.has(product as any) && productStatus.get(product) !== "active") productStatus.set(product, "available"); }
      itemSummaries.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, billed_products: [...billed], available_products: [...available] });
    } catch (err) { console.error(`itemGet failed for item ${item.id}:`, err); itemSummaries.push({ institution_name: item.institution_name, status: "error_fetching_product_status", last_synced_at: item.last_synced_at, billed_products: [], available_products: [] }); }
  }
  res.json({ items: itemSummaries, products: PLAID_STANDARD_PRODUCTS.map((p) => ({ product: p, status: productStatus.get(p) })) });
});

dashboardRouter.post("/dashboard/scenario", requireAuth, async (req: AuthedRequest, res) => {
  const { type, amount } = req.body as { type?: "spending_change" | "bill_change" | "income_change"; amount?: number };
  if (!type || !["spending_change", "bill_change", "income_change"].includes(type) || typeof amount !== "number") return res.status(400).json({ error: "type must be spending_change/bill_change/income_change, amount must be a number" });
  try { res.json(await computeCanonicalScenario(req.userId!, type, amount)); }
  catch (err) { console.error("dashboard/scenario error:", err); res.status(500).json({ error: "Failed to compute scenario" }); }
});
