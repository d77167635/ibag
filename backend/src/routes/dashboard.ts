import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";
import { computeBalanceMetrics, computeCashFlowSafety, computeRoundupProjection, computeCashFlow, computeSpendingByDomain, computeBalanceHistory, computeDebtTrend, detectAnomalies, computeForwardProjection, buildNarrative, computeSpendingHierarchy, computeScenario } from "../services/intelligence.js";
import { getPlaidAccessToken } from "../services/tokenStore.js";
import { getFeatureFlags } from "../services/features.js";
import { plaidClient } from "../plaid/client.js";
import { computeDebtCostIntelligence } from "../intelligence/liabilities.js";
import { computeCategoryDrift } from "../intelligence/behavioral.js";
import { computeFinancialReasoning } from "../intelligence/relational.js";
import { buildNarrative as layeredNarrative, recordExplainabilityTrace } from "../intelligence/decision.js";

export const dashboardRouter = Router();

// Per-card round-up toggle — a user may want round-up running on a debit
// card but not a credit card. Ownership checked via user_id match before
// the update so one user can't toggle another's account.
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
    supabaseAdmin.from("plaid_accounts").select("*, card_roundup_ledger(accrued_unswept, lifetime_roundup_total)").eq("user_id", userId),
    supabaseAdmin.from("transactions").select("*, merchants(canonical_name), subdomains(label, domains(key, label))").eq("user_id", userId).order("posted_date", { ascending: false }).limit(50),
    supabaseAdmin.from("virtual_ibag_balance").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (accountsErr) console.error("dashboard/overview accounts query error:", accountsErr.message);
  if (txErr) console.error("dashboard/overview transactions query error:", txErr.message);
  if (ibagErr) console.error("dashboard/overview ibag query error:", ibagErr.message);
  const withMerchant = (recentTx ?? []).filter((t: any) => t.merchants).length;
  const withSubdomain = (recentTx ?? []).filter((t: any) => t.subdomains).length;
  console.log(`dashboard/overview for user ${userId}: ${recentTx?.length ?? 0} tx, ${withMerchant} with merchant join, ${withSubdomain} with subdomain join`);
  res.json({ accounts: accounts ?? [], recent_transactions: recentTx ?? [], ibag: ibag ?? { projected_balance: 0 } });
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

// Computed intelligence: all values remain evidence-gated and derived from
// real provider observations. See the layered orchestrator for the complete
// 12-layer contract; this endpoint preserves the existing response shape.
dashboardRouter.get("/dashboard/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  try {
    const [balances, cashFlowSafety, roundupProjection, cashFlow, spendingByDomain, balanceHistory, debtTrend, anomalies, forwardProjection, spendingHierarchy] = await Promise.all([
      computeBalanceMetrics(userId), computeCashFlowSafety(userId), computeRoundupProjection(userId), computeCashFlow(userId), computeSpendingByDomain(userId), computeBalanceHistory(userId), computeDebtTrend(userId), detectAnomalies(userId), computeForwardProjection(userId), computeSpendingHierarchy(userId),
    ]);
    const [flags, debtCost, categoryDrift, reasoning] = await Promise.all([getFeatureFlags(userId), computeDebtCostIntelligence(userId), computeCategoryDrift(userId), computeFinancialReasoning(userId)]);
    const narrative = flags.relational_reasoning ? layeredNarrative(reasoning, { safeToSpend: cashFlowSafety.safeToSpend, essentialBillsCount: cashFlowSafety.upcomingBills.length, cashFlowNet: cashFlow.net, cashFlowNetChangePct: cashFlow.netChangePct, debtChangePct: debtTrend.changePct, anomalyCount: anomalies.length }) : buildNarrative({ safeToSpend: cashFlowSafety.safeToSpend, cashFlowNet: cashFlow.net, debtChangePct: debtTrend.changePct, roundupProjection: roundupProjection.projected, anomalyCount: anomalies.length });
    recordExplainabilityTrace(userId, reasoning).catch((err) => console.error("explainability trace failed:", err));
    res.json({ narrative, net_worth: { liquid_assets: balances.liquidAssets, as_of: balances.asOf }, debt_health: { revolving_debt: balances.revolvingDebt, credit_utilization: balances.creditUtilization, change_pct_30d: debtTrend.changePct, interest_cost_attribution: debtCost, as_of: balances.asOf }, cash_flow_safety: cashFlowSafety, roundup_projection: roundupProjection, cash_flow: cashFlow, spending_by_domain: spendingByDomain, spending_hierarchy: spendingHierarchy, balance_history: balanceHistory, forward_projection: forwardProjection, anomalies, category_drift: categoryDrift, reasoning, feature_flags: flags });
  } catch (error) {
    console.error("dashboard/intelligence error:", error);
    res.status(500).json({ error: "Unable to compute financial intelligence" });
  }
});

dashboardRouter.get("/dashboard/plaid", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { data: items, error } = await supabaseAdmin.from("plaid_items").select("id, user_id, institution_name, status, last_synced_at, plaid_access_token").eq("user_id", userId).eq("status", "active");
  if (error) return res.status(500).json({ error: error.message });
  const results = [];
  for (const item of items ?? []) {
    try {
      const accessToken = await getPlaidAccessToken(item.id, item.user_id, item.plaid_access_token);
      const { data } = await plaidClient.itemGet({ access_token: accessToken });
      const billed = data.item.billed_products ?? [];
      const available = data.item.available_products ?? [];
      results.push({ institution_name: item.institution_name, status: item.status, last_synced_at: item.last_synced_at, billed_products: billed, available_products: available });
    } catch {
      results.push({ institution_name: item.institution_name, status: "reauth_required", last_synced_at: item.last_synced_at, billed_products: [], available_products: [] });
    }
  }
  res.json({ items: results });
});

dashboardRouter.post("/dashboard/scenario", requireAuth, async (req: AuthedRequest, res) => {
  const { type, amount } = req.body as { type?: "spending_change" | "bill_change" | "income_change"; amount?: number };
  if (!type || typeof amount !== "number" || !Number.isFinite(amount)) return res.status(400).json({ error: "type and finite amount are required" });
  try { res.json(await computeScenario(req.userId!, type, amount)); } catch (error) { console.error("dashboard/scenario error:", error); res.status(500).json({ error: "Unable to compute scenario" }); }
});
