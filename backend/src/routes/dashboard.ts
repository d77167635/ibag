import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";
import { computeBalanceMetrics, computeCashFlowSafety, computeRoundupProjection, computeCashFlow, computeSpendingByDomain, computeBalanceHistory, computeDebtTrend, detectAnomalies, computeForwardProjection, buildNarrative, computeSpendingHierarchy, computeScenario } from "../services/intelligence.js";
import { decryptToken } from "../config/crypto.js";
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

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Body must include boolean `enabled`" });
  }

  const { data, error } = await supabaseAdmin
    .from("plaid_accounts")
    .update({ roundup_enabled: enabled })
    .eq("id", accountId)
    .eq("user_id", req.userId!)
    .select("id, roundup_enabled")
    .single();

  if (error || !data) return res.status(404).json({ error: "Account not found" });
  res.json({ account_id: data.id, roundup_enabled: data.roundup_enabled });
});

// Unified dashboard: accounts + recent transactions, straight from the
// normalized tables. Every field here traces to a plaid_raw_* row.
dashboardRouter.get("/dashboard/overview", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const [
    { data: accounts, error: accountsErr },
    { data: recentTx, error: txErr },
    { data: ibag, error: ibagErr },
  ] = await Promise.all([
    supabaseAdmin.from("plaid_accounts").select("*, card_roundup_ledger(accrued_unswept, lifetime_roundup_total)").eq("user_id", userId),
    supabaseAdmin
      .from("transactions")
      .select("*, merchants(canonical_name), subdomains(label, domains(key, label))")
      .eq("user_id", userId)
      .order("posted_date", { ascending: false })
      .limit(50),
    supabaseAdmin.from("virtual_ibag_balance").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (accountsErr) console.error("dashboard/overview accounts query error:", accountsErr.message);
  if (txErr) console.error("dashboard/overview transactions query error:", txErr.message);
  if (ibagErr) console.error("dashboard/overview ibag query error:", ibagErr.message);

  const withMerchant = (recentTx ?? []).filter((t: any) => t.merchants).length;
  const withSubdomain = (recentTx ?? []).filter((t: any) => t.subdomains).length;
  console.log(
    `dashboard/overview for user ${userId}: ${recentTx?.length ?? 0} tx, ${withMerchant} with merchant join, ${withSubdomain} with subdomain join`
  );

  res.json({
    accounts: accounts ?? [],
    recent_transactions: recentTx ?? [],
    ibag: ibag ?? { projected_balance: 0 },
  });
});

// Domain -> subdomain -> category drill-down.
dashboardRouter.get("/dashboard/hierarchy", requireAuth, async (_req, res) => {
  const { data: domains, error } = await supabaseAdmin
    .from("domains")
    .select("*, subdomains(*, category_mapping(*))")
    .order("sort_order");

  if (error) return res.status(500).json({ error: error.message });
  res.json({ domains });
});

// Per-card round-up ledger + sweep history, including held events with the
// balance snapshot that caused the hold — powers the "why was this held"
// transparency feature.
dashboardRouter.get("/dashboard/roundups", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const [{ data: ledger }, { data: events }] = await Promise.all([
    supabaseAdmin.from("card_roundup_ledger").select("*, plaid_accounts(name, mask)").eq("user_id", userId),
    supabaseAdmin
      .from("roundup_sweep_events")
      .select("*, plaid_accounts(name, mask)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  res.json({ ledger: ledger ?? [], events: events ?? [] });
});

// Preview/what-if calculator — "transfer back to a card" — computed only.
dashboardRouter.post("/dashboard/roundups/preview-transfer", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { account_id, amount } = req.body as { account_id?: string; amount?: number };

  if (!account_id || !amount || amount <= 0) {
    return res.status(400).json({ error: "account_id and a positive amount are required" });
  }

  const { data: account, error } = await supabaseAdmin
    .from("plaid_accounts")
    .select("plaid_account_id, item_id")
    .eq("id", account_id)
    .eq("user_id", userId)
    .single();

  if (error || !account) return res.status(404).json({ error: "Account not found" });

  const { data: item } = await supabaseAdmin
    .from("plaid_items")
    .select("plaid_access_token")
    .eq("id", account.item_id)
    .single();

  if (!item) return res.status(404).json({ error: "Item not found" });

  const result = await previewTransferBackToCard(
    userId,
    account_id,
    amount,
    decryptToken(item.plaid_access_token),
    account.plaid_account_id
  );

  res.json(result);
});

// Computed intelligence: balance-derived net worth/debt metrics, cash flow
// safety (Safe-to-Spend + bill collision detection), and a round-up trend
// projection. Fields are null (not zero) when there isn't enough real data
// to compute them yet — see intelligence.ts for exactly what each requires.
dashboardRouter.get("/dashboard/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  try {
    const [balances, cashFlowSafety, roundupProjection, cashFlow, spendingByDomain, balanceHistory, debtTrend, anomalies, forwardProjection, spendingHierarchy] = await Promise.all([
      computeBalanceMetrics(userId),
      computeCashFlowSafety(userId),
      computeRoundupProjection(userId),
      computeCashFlow(userId),
      computeSpendingByDomain(userId),
      computeBalanceHistory(userId),
      computeDebtTrend(userId),
      detectAnomalies(userId),
      computeForwardProjection(userId),
      computeSpendingHierarchy(userId),
    ]);

    const [flags, debtCost, categoryDrift, reasoning] = await Promise.all([
      getFeatureFlags(userId),
      computeDebtCostIntelligence(userId),
      computeCategoryDrift(userId),
      computeFinancialReasoning(userId),
    ]);

    // The new priority-ranked narrative leads with whatever relational.ts
    // determined matters most, instead of a fixed recitation order — falls
    // back to the older flat narrative if relational_reasoning is toggled off.
    const narrative = flags.relational_reasoning
      ? layeredNarrative(reasoning, {
          safeToSpend: cashFlowSafety.safeToSpend,
          essentialBillsCount: cashFlowSafety.upcomingBills.length,
          cashFlowNet: cashFlow.net,
          cashFlowNetChangePct: cashFlow.netChangePct,
          debtChangePct: debtTrend.changePct,
          anomalyCount: anomalies.length,
        })
      : buildNarrative({
          safeToSpend: cashFlowSafety.safeToSpend,
          essentialBillsCount: cashFlowSafety.upcomingBills.length,
          cashFlowNet: cashFlow.net,
          cashFlowNetChangePct: cashFlow.netChangePct,
          debtChangePct: debtTrend.changePct,
          anomalyCount: anomalies.length,
        });

    recordExplainabilityTrace(userId, reasoning).catch((err) =>
      console.error("explainability trace failed:", err)
    );

    res.json({
      narrative,
      net_worth: {
        liquid_assets: balances.liquidAssets,
        as_of: balances.asOf,
      },
      debt_health: {
        revolving_debt: balances.revolvingDebt,
        credit_utilization: balances.creditUtilization,
        change_pct_30d: debtTrend.changePct,
        interest_cost_attribution: flags.debt_cost_intelligence ? debtCost : null,
        as_of: balances.asOf,
      },
      cash_flow_safety: cashFlowSafety,
      roundup_projection: roundupProjection,
      cash_flow: cashFlow,
      spending_by_domain: spendingByDomain,
      balance_history: balanceHistory,
      forward_projection: forwardProjection,
      anomalies: flags.anomaly_detection ? anomalies : [],
      spending_hierarchy: spendingHierarchy,
      category_drift: flags.category_drift ? categoryDrift : [],
      reasoning: flags.relational_reasoning ? reasoning : null,
      feature_flags: flags,
    });
  } catch (err) {
    console.error("dashboard/intelligence error:", err);
    res.status(500).json({ error: "Failed to compute intelligence metrics" });
  }
});

// PLAID PRODUCTS DASHBOARD — separate from Iris intelligence. Shows what
// raw Plaid products are actually connected/billed per linked item, across
// Plaid's 8 standard products. This is deliberately RAW status (what data
// Iris is allowed to see), not reasoning about that data (which lives in
// /dashboard/intelligence) — the two dashboards answer different questions
// and the user toggles between them in the frontend.
const PLAID_STANDARD_PRODUCTS = [
  "transactions",
  "auth",
  "balance",
  "identity",
  "investments",
  "liabilities",
  "transfer",
  "signal",
] as const;

dashboardRouter.get("/dashboard/plaid", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const { data: items, error } = await supabaseAdmin
    .from("plaid_items")
    .select("id, plaid_item_id, plaid_access_token, institution_name, status, last_synced_at")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });
  if (!items || items.length === 0) {
    return res.json({
      items: [],
      products: PLAID_STANDARD_PRODUCTS.map((p) => ({ product: p, status: "not_connected" as const })),
    });
  }

  const productStatus = new Map<string, "active" | "available" | "not_requested">(
    PLAID_STANDARD_PRODUCTS.map((p) => [p, "not_requested"])
  );

  const itemSummaries = [];
  for (const item of items) {
    try {
      const itemResp = await plaidClient.itemGet({ access_token: decryptToken(item.plaid_access_token) });
      const billed = new Set(itemResp.data.item.billed_products ?? []);
      const available = new Set(itemResp.data.item.available_products ?? []);

      for (const product of PLAID_STANDARD_PRODUCTS) {
        if (billed.has(product as any)) productStatus.set(product, "active");
        else if (available.has(product as any) && productStatus.get(product) !== "active") {
          productStatus.set(product, "available");
        }
      }

      itemSummaries.push({
        institution_name: item.institution_name,
        status: item.status,
        last_synced_at: item.last_synced_at,
        billed_products: [...billed],
        available_products: [...available],
      });
    } catch (err) {
      console.error(`itemGet failed for item ${item.id}:`, err);
      itemSummaries.push({
        institution_name: item.institution_name,
        status: "error_fetching_product_status",
        last_synced_at: item.last_synced_at,
        billed_products: [],
        available_products: [],
      });
    }
  }

  res.json({
    items: itemSummaries,
    products: PLAID_STANDARD_PRODUCTS.map((p) => ({ product: p, status: productStatus.get(p) })),
  });
});

// What-if scenario calculator — pure arithmetic on the real current
// baseline, no forecasting model, no fabricated confidence. See
// computeScenario in intelligence.ts for exactly what each type assumes.
dashboardRouter.post("/dashboard/scenario", requireAuth, async (req: AuthedRequest, res) => {
  const { type, amount } = req.body as {
    type?: "spending_change" | "bill_change" | "income_change";
    amount?: number;
  };

  if (!type || !["spending_change", "bill_change", "income_change"].includes(type) || typeof amount !== "number") {
    return res.status(400).json({ error: "type must be spending_change/bill_change/income_change, amount must be a number" });
  }

  try {
    const result = await computeScenario(req.userId!, type, amount);
    res.json(result);
  } catch (err) {
    console.error("dashboard/scenario error:", err);
    res.status(500).json({ error: "Failed to compute scenario" });
  }
});
