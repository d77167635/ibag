import { supabaseAdmin } from "../config/supabase.js";

/** Return active Plaid Items that independently possess current observed Transactions + Balance evidence. */
export async function getCertifiedCoreItemIds(userId: string): Promise<string[]> {
  const { data: items, error: itemError } = await supabaseAdmin
    .from("plaid_items")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "healthy"]);
  if (itemError) throw itemError;

  const itemIds = (items ?? []).map((row: any) => row.id).filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (!itemIds.length) return [];

  const [products, balances, transactions] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations")
      .select("item_id, product, lifecycle_state, evidence_state, is_current")
      .eq("user_id", userId).eq("provider", "plaid").eq("is_current", true)
      .in("item_id", itemIds).in("product", ["transactions", "balance"]),
    supabaseAdmin.from("plaid_raw_balances")
      .select("account_id, is_current, evidence_state")
      .eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_transactions")
      .select("account_id, is_current, evidence_state")
      .eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);
  const errors = [products, balances, transactions].filter(q => q.error).map(q => q.error!.message);
  if (errors.length) throw new Error(`Certified core Item query failed: ${errors.join("; ")}`);

  const accountIds = [...new Set([
    ...(balances.data ?? []).map((r: any) => r.account_id),
    ...(transactions.data ?? []).map((r: any) => r.account_id),
  ])].filter((id): id is string => typeof id === "string" && id.length > 0);
  const { data: accounts, error: accountError } = accountIds.length
    ? await supabaseAdmin.from("plaid_accounts").select("id, item_id").eq("user_id", userId).in("id", accountIds)
    : { data: [], error: null };
  if (accountError) throw accountError;
  const accountToItem = new Map<string, string>((accounts ?? []).map((r: any) => [r.id, r.item_id]));
  const txItems = new Set((transactions.data ?? []).map((r: any) => accountToItem.get(r.account_id)).filter(Boolean));
  const balanceItems = new Set((balances.data ?? []).map((r: any) => accountToItem.get(r.account_id)).filter(Boolean));
  const txProducts = new Set((products.data ?? []).filter((r: any) => r.product === "transactions" && r.lifecycle_state === "observed" && r.evidence_state === "observed").map((r: any) => r.item_id));
  const balanceProducts = new Set((products.data ?? []).filter((r: any) => r.product === "balance" && r.lifecycle_state === "observed" && r.evidence_state === "observed").map((r: any) => r.item_id));
  return itemIds.filter(id => txProducts.has(id) && balanceProducts.has(id) && txItems.has(id) && balanceItems.has(id));
}

/**
 * Returns the latest common evidence boundary across certified core Items only.
 * An unrelated active Item that lacks Balance must not invalidate a different
 * Item that independently has certified Transactions + Balance evidence.
 */
export async function getCertifiedEvidenceBoundary(userId: string): Promise<string | null> {
  const certifiedItemIds = await getCertifiedCoreItemIds(userId);
  if (!certifiedItemIds.length) return null;

  const [products, balances, transactions] = await Promise.all([
    supabaseAdmin.from("plaid_product_observations")
      .select("item_id, product, acquired_at, lifecycle_state, evidence_state, is_current")
      .eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).in("item_id", certifiedItemIds).in("product", ["transactions", "balance"]),
    supabaseAdmin.from("plaid_raw_balances")
      .select("account_id, acquired_at, is_current, evidence_state")
      .eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed").not("acquired_at", "is", null),
    supabaseAdmin.from("plaid_raw_transactions")
      .select("account_id, acquired_at, is_current, evidence_state")
      .eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed").not("acquired_at", "is", null),
  ]);
  const errors = [products, balances, transactions].filter(q => q.error).map(q => q.error!.message);
  if (errors.length) throw new Error(`Certified evidence boundary query failed: ${errors.join("; ")}`);

  const accountIds = [...new Set([
    ...(balances.data ?? []).map((r: any) => r.account_id),
    ...(transactions.data ?? []).map((r: any) => r.account_id),
  ])].filter((id): id is string => typeof id === "string" && id.length > 0);
  const { data: accounts, error: accountsError } = accountIds.length
    ? await supabaseAdmin.from("plaid_accounts").select("id, item_id").eq("user_id", userId).in("id", accountIds)
    : { data: [], error: null };
  if (accountsError) throw new Error(`Certified evidence boundary account lineage query failed: ${accountsError.message}`);
  const accountToItem = new Map<string, string>((accounts ?? []).map((r: any) => [r.id, r.item_id]));
  const parseTimes = (rows: any[]): number[] => rows.map(r => new Date(r.acquired_at).getTime()).filter(Number.isFinite);
  const boundaries: number[] = [];
  for (const itemId of certifiedItemIds) {
    const txProductTimes = parseTimes((products.data ?? []).filter((r: any) => r.item_id === itemId && r.product === "transactions" && r.lifecycle_state === "observed" && r.evidence_state === "observed"));
    const balanceProductTimes = parseTimes((products.data ?? []).filter((r: any) => r.item_id === itemId && r.product === "balance" && r.lifecycle_state === "observed" && r.evidence_state === "observed"));
    const balanceTimes = parseTimes((balances.data ?? []).filter((r: any) => accountToItem.get(r.account_id) === itemId));
    const transactionTimes = parseTimes((transactions.data ?? []).filter((r: any) => accountToItem.get(r.account_id) === itemId));
    if (!txProductTimes.length || !balanceProductTimes.length || !balanceTimes.length || !transactionTimes.length) continue;
    boundaries.push(Math.min(Math.max(...txProductTimes), Math.max(...balanceProductTimes), Math.max(...balanceTimes), Math.max(...transactionTimes)));
  }
  const common = boundaries.length ? Math.min(...boundaries) : NaN;
  return Number.isFinite(common) ? new Date(common).toISOString() : null;
}
