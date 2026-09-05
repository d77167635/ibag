import { supabaseAdmin } from "../config/supabase.js";

/**
 * Returns the latest common evidence boundary that every active Plaid Item can
 * support for core financial reasoning. A global max timestamp is unsafe: one
 * fresh Item must not cause Iris to interpret another Item's older evidence as
 * equally current.
 */
export async function getCertifiedEvidenceBoundary(userId: string): Promise<string | null> {
  const { data: items, error: itemError } = await supabaseAdmin
    .from("plaid_items")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "healthy"]);
  if (itemError) throw itemError;
  const itemIds = (items ?? []).map((row: any) => row.id).filter(Boolean);
  if (!itemIds.length) return null;

  const [products, balances, transactions] = await Promise.all([
    supabaseAdmin
      .from("plaid_product_observations")
      .select("item_id, product, acquired_at, lifecycle_state, is_current")
      .eq("user_id", userId)
      .eq("provider", "plaid")
      .eq("is_current", true)
      .in("item_id", itemIds)
      .in("product", ["transactions", "balance"]),
    supabaseAdmin
      .from("plaid_raw_balances")
      .select("account_id, acquired_at, is_current, evidence_state, plaid_accounts!inner(item_id)")
      .eq("user_id", userId)
      .eq("is_current", true)
      .not("acquired_at", "is", null),
    supabaseAdmin
      .from("plaid_raw_transactions")
      .select("account_id, acquired_at, is_current, evidence_state, plaid_accounts!inner(item_id)")
      .eq("user_id", userId)
      .eq("is_current", true)
      .not("acquired_at", "is", null),
  ]);
  const errors = [products, balances, transactions].filter((q) => q.error).map((q) => q.error!.message);
  if (errors.length) throw new Error(`Certified evidence boundary query failed: ${errors.join("; ")}`);

  const currentProducts = products.data ?? [];
  const currentBalances = balances.data ?? [];
  const currentTransactions = transactions.data ?? [];
  const boundaries: number[] = [];

  for (const itemId of itemIds) {
    const txProduct = currentProducts.filter((r: any) => r.item_id === itemId && r.product === "transactions" && ["observed", "validated", "fresh"].includes(r.lifecycle_state));
    const balanceProduct = currentProducts.filter((r: any) => r.item_id === itemId && r.product === "balance" && ["observed", "validated", "fresh"].includes(r.lifecycle_state));
    if (!txProduct.length || !balanceProduct.length) return null;

    const latestTxProduct = Math.max(...txProduct.map((r: any) => new Date(r.acquired_at).getTime()).filter(Number.isFinite));
    const latestBalanceProduct = Math.max(...balanceProduct.map((r: any) => new Date(r.acquired_at).getTime()).filter(Number.isFinite));
    const itemBalances = currentBalances.filter((r: any) => r.plaid_accounts?.item_id === itemId && ["observed", "calculated"].includes(r.evidence_state));
    const itemTransactions = currentTransactions.filter((r: any) => r.plaid_accounts?.item_id === itemId && ["observed", "calculated"].includes(r.evidence_state));
    const latestBalanceEvidence = Math.max(...itemBalances.map((r: any) => new Date(r.acquired_at).getTime()).filter(Number.isFinite));
    const latestTransactionEvidence = Math.max(...itemTransactions.map((r: any) => new Date(r.acquired_at).getTime()).filter(Number.isFinite));
    const itemBoundary = Math.min(latestTxProduct, latestBalanceProduct, latestBalanceEvidence, latestTransactionEvidence);
    if (!Number.isFinite(itemBoundary)) return null;
    boundaries.push(itemBoundary);
  }

  const common = Math.min(...boundaries);
  return Number.isFinite(common) ? new Date(common).toISOString() : null;
}
