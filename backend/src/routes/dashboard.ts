import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";
import { computeBalanceMetrics, computeCashFlowSafety, computeRoundupProjection, computeCashFlow, computeSpendingByDomain, computeBalanceHistory } from "../services/intelligence.js";

export const dashboardRouter = Router();

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
    item.plaid_access_token,
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
    const [balances, cashFlowSafety, roundupProjection, cashFlow, spendingByDomain, balanceHistory] = await Promise.all([
      computeBalanceMetrics(userId),
      computeCashFlowSafety(userId),
      computeRoundupProjection(userId),
      computeCashFlow(userId),
      computeSpendingByDomain(userId),
      computeBalanceHistory(userId),
    ]);

    res.json({
      net_worth: {
        liquid_assets: balances.liquidAssets,
        as_of: balances.asOf,
      },
      debt_health: {
        revolving_debt: balances.revolvingDebt,
        credit_utilization: balances.creditUtilization,
        interest_cost_attribution: null, // requires Plaid Liabilities — not linked on this item
        as_of: balances.asOf,
      },
      cash_flow_safety: cashFlowSafety,
      roundup_projection: roundupProjection,
      cash_flow: cashFlow,
      spending_by_domain: spendingByDomain,
      balance_history: balanceHistory,
    });
  } catch (err) {
    console.error("dashboard/intelligence error:", err);
    res.status(500).json({ error: "Failed to compute intelligence metrics" });
  }
});
