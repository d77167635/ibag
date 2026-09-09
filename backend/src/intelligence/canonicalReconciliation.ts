export type ReconciliationStatus = "reconciled" | "warning" | "failed";

export interface CanonicalAccountRow {
  id: string;
  item_id: string;
  plaid_account_id?: string | null;
}

export interface CanonicalTransactionRow {
  id: string;
  account_id: string;
  plaid_transaction_id?: string | null;
  raw_transaction_id?: string | null;
  is_active?: boolean;
}

export interface RawTransactionRow {
  id: string;
  account_id: string;
  plaid_transaction_id?: string | null;
  is_current?: boolean;
  evidence_state?: string | null;
}

export interface CanonicalReconciliationResult {
  status: ReconciliationStatus;
  canonical_active: number;
  raw_current_observed: number;
  active_canonical_with_raw: number;
  raw_current_with_canonical: number;
  active_canonical_with_account: number;
  active_canonical_with_item: number;
  duplicate_canonical_provider_ids: string[];
  duplicate_raw_provider_ids: string[];
  orphan_canonical: string[];
  orphan_raw: string[];
  lineage_failures: string[];
  double_counting_risk: boolean;
  limitations: string[];
}

/**
 * Pure reconciliation boundary between provider transaction observations and
 * canonical transactions. It never creates financial values and never promotes
 * evidence state. The caller supplies already-authorized rows from its user scope.
 */
export function reconcileCanonicalTransactions(
  accounts: CanonicalAccountRow[],
  canonical: CanonicalTransactionRow[],
  raw: RawTransactionRow[],
): CanonicalReconciliationResult {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const active = canonical.filter((row) => row.is_active !== false);
  const observedRaw = raw.filter((row) => row.is_current !== false && row.evidence_state === "observed");

  const duplicateIds = (rows: Array<{ plaid_transaction_id?: string | null }>) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.plaid_transaction_id) continue;
      counts.set(row.plaid_transaction_id, (counts.get(row.plaid_transaction_id) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id).sort();
  };

  const canonicalIds = new Set(active.map((row) => row.plaid_transaction_id).filter((id): id is string => Boolean(id)));
  const rawIds = new Set(observedRaw.map((row) => row.plaid_transaction_id).filter((id): id is string => Boolean(id)));
  const canonicalByProvider = new Map(active.filter((row) => row.plaid_transaction_id).map((row) => [row.plaid_transaction_id as string, row]));
  const rawByProvider = new Map(observedRaw.filter((row) => row.plaid_transaction_id).map((row) => [row.plaid_transaction_id as string, row]));

  const orphanCanonical = active
    .filter((row) => !row.plaid_transaction_id || !rawIds.has(row.plaid_transaction_id))
    .map((row) => row.id);
  const orphanRaw = observedRaw
    .filter((row) => !row.plaid_transaction_id || !canonicalIds.has(row.plaid_transaction_id))
    .map((row) => row.id);
  const lineageFailures: string[] = [];
  const activeCanonicalWithAccount = active.filter((row) => accountById.has(row.account_id)).length;
  const activeCanonicalWithItem = active.filter((row) => {
    const account = accountById.get(row.account_id);
    return Boolean(account?.item_id);
  }).length;

  for (const row of active) {
    const rawRow = row.plaid_transaction_id ? rawByProvider.get(row.plaid_transaction_id) : undefined;
    if (!accountById.has(row.account_id)) lineageFailures.push(`canonical:${row.id}:missing_account`);
    if (!rawRow) continue;
    if (rawRow.account_id !== row.account_id) lineageFailures.push(`canonical:${row.id}:account_mismatch`);
    if (row.raw_transaction_id && row.raw_transaction_id !== rawRow.id) lineageFailures.push(`canonical:${row.id}:raw_id_mismatch`);
  }

  const duplicateCanonical = duplicateIds(active);
  const duplicateRaw = duplicateIds(observedRaw);
  const doubleCountingRisk = duplicateCanonical.length > 0 || duplicateRaw.length > 0 || lineageFailures.some((value) => value.endsWith("account_mismatch"));
  const failed = lineageFailures.length > 0 || duplicateCanonical.length > 0 || duplicateRaw.length > 0 || orphanCanonical.length > 0;
  const warning = orphanRaw.length > 0 || active.length !== observedRaw.length;

  return {
    status: failed ? "failed" : warning ? "warning" : "reconciled",
    canonical_active: active.length,
    raw_current_observed: observedRaw.length,
    active_canonical_with_raw: active.filter((row) => Boolean(row.plaid_transaction_id && rawIds.has(row.plaid_transaction_id))).length,
    raw_current_with_canonical: observedRaw.filter((row) => Boolean(row.plaid_transaction_id && canonicalIds.has(row.plaid_transaction_id))).length,
    active_canonical_with_account: activeCanonicalWithAccount,
    active_canonical_with_item: activeCanonicalWithItem,
    duplicate_canonical_provider_ids: duplicateCanonical,
    duplicate_raw_provider_ids: duplicateRaw,
    orphan_canonical: orphanCanonical,
    orphan_raw: orphanRaw,
    lineage_failures: lineageFailures,
    double_counting_risk: doubleCountingRisk,
    limitations: [
      "Row-count equality is not proof of economic reconciliation; amount/date/currency reconciliation requires compatible period and monetary fields.",
      "Transfers, refunds, income, fees, loan payments, and purchases remain semantic classifications and must not be treated as interchangeable spending.",
      "This boundary validates identity and lineage only; it does not invent missing provider observations or canonicalize unsupported fields.",
    ],
  };
}
