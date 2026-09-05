import { supabaseAdmin } from "../config/supabase.js";

/**
 * Returns the latest common evidence boundary that every active Plaid Item can
 * support for core financial reasoning. A global max timestamp is unsafe: one
 * fresh Item must not cause another Item's older evidence to appear current.
 *
 * Raw evidence queries intentionally avoid PostgREST relationship embedding.
 * This database has multiple foreign-key paths between these tables, so an
 * embedded plaid_accounts relation is ambiguous and can turn a valid query
 * into a runtime 500.
 */
export async function getCertifiedEvidenceBoundary(userId: string): Promise<string | null> {
  const { data: items, error: itemError } = await supabaseAdmin
    .from("plaid_items")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "healthy"]);
  if (itemError) throw itemError;

  const itemIds = (items ?? [])
    .map((row: any) => row.id)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (!itemIds.length) return null;

  const [products, balances, transactions] = await Promise.all([
    supabaseAdmin
      .from("plaid_product_observations")
      .select("item_id, product, acquired_at, lifecycle_state, evidence_state, is_current")
      .eq("user_id", userId)
      .eq("provider", "plaid")
      .eq("is_current", true)
      .in("item_id", itemIds)
      .in("product", ["transactions", "balance"]),
    supabaseAdmin
      .from("plaid_raw_balances")
      .select("account_id, acquired_at, is_current, evidence_state")
      .eq("user_id", userId)
      .eq("is_current", true)
      .eq("evidence_state", "observed")
      .not("acquired_at", "is", null),
    supabaseAdmin
      .from("plaid_raw_transactions")
      .select("account_id, acquired_at, is_current, evidence_state")
      .eq("user_id", userId)
      .eq("is_current", true)
      .eq("evidence_state", "observed")
      .not("acquired_at", "is", null),
  ]);

  const errors = [products, balances, transactions]
    .filter((q) => q.error)
    .map((q) => q.error!.message);
  if (errors.length) {
    throw new Error(`Certified evidence boundary query failed: ${errors.join("; ")}`);
  }

  const accountIds = [
    ...new Set([
      ...(balances.data ?? []).map((row: any) => row.account_id),
      ...(transactions.data ?? []).map((row: any) => row.account_id),
    ]),
  ].filter((id): id is string => typeof id === "string" && id.length > 0);

  const { data: accounts, error: accountsError } = accountIds.length
    ? await supabaseAdmin
        .from("plaid_accounts")
        .select("id, item_id")
        .eq("user_id", userId)
        .in("id", accountIds)
    : { data: [], error: null };

  if (accountsError) {
    throw new Error(`Certified evidence boundary account lineage query failed: ${accountsError.message}`);
  }

  const accountToItem = new Map<string, string>(
    (accounts ?? [])
      .filter((row: any) => typeof row.id === "string" && typeof row.item_id === "string")
      .map((row: any) => [row.id, row.item_id]),
  );

  const currentProducts = products.data ?? [];
  const currentBalances = balances.data ?? [];
  const currentTransactions = transactions.data ?? [];
  const boundaries: number[] = [];
  const parseTimes = (rows: any[]): number[] =>
    rows
      .map((row) => new Date(row.acquired_at).getTime())
      .filter((time) => Number.isFinite(time));

  for (const itemId of itemIds) {
    const txProduct = currentProducts.filter(
      (row: any) =>
        row.item_id === itemId &&
        row.product === "transactions" &&
        row.lifecycle_state === "observed" &&
        row.evidence_state === "observed",
    );
    const balanceProduct = currentProducts.filter(
      (row: any) =>
        row.item_id === itemId &&
        row.product === "balance" &&
        row.lifecycle_state === "observed" &&
        row.evidence_state === "observed",
    );
    if (!txProduct.length || !balanceProduct.length) return null;

    const txProductTimes = parseTimes(txProduct);
    const balanceProductTimes = parseTimes(balanceProduct);
    if (!txProductTimes.length || !balanceProductTimes.length) return null;

    const itemBalances = currentBalances.filter(
      (row: any) => accountToItem.get(row.account_id) === itemId,
    );
    const itemTransactions = currentTransactions.filter(
      (row: any) => accountToItem.get(row.account_id) === itemId,
    );
    const balanceEvidenceTimes = parseTimes(itemBalances);
    const transactionEvidenceTimes = parseTimes(itemTransactions);
    if (!balanceEvidenceTimes.length || !transactionEvidenceTimes.length) return null;

    const itemBoundary = Math.min(
      Math.max(...txProductTimes),
      Math.max(...balanceProductTimes),
      Math.max(...balanceEvidenceTimes),
      Math.max(...transactionEvidenceTimes),
    );
    if (!Number.isFinite(itemBoundary)) return null;
    boundaries.push(itemBoundary);
  }

  const common = Math.min(...boundaries);
  return Number.isFinite(common) ? new Date(common).toISOString() : null;
}
