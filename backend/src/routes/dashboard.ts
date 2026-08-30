import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { previewTransferBackToCard } from "../services/roundup.js";

export const dashboardRouter = Router();

// Unified dashboard: accounts + recent transactions, straight from the
// normalized tables. Every field here traces to a plaid_raw_* row.
dashboardRouter.get("/dashboard/overview", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;

  const [{ data: accounts }, { data: recentTx }, { data: ibag }] = await Promise.all([
    supabaseAdmin.from("plaid_accounts").select("*").eq("user_id", userId),
    supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("posted_date", { ascending: false })
      .limit(50),
    supabaseAdmin.from("virtual_ibag_balance").select("*").eq("user_id", userId).maybeSingle(),
  ]);

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
