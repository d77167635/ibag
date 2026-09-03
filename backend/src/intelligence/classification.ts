import type { TransactionClass } from "./types.js";

/**
 * LAYER 2 — CLASSIFICATION INTELLIGENCE
 *
 * Prior state of this codebase: every downstream function distinguished
 * transactions only by amount sign (amount > 0 = outflow, amount < 0 =
 * inflow) and, separately, by Plaid's category label. Sign-and-category is
 * not the same as knowing what a transaction financially IS — a debt
 * payment and a restaurant purchase are both "amount > 0" but should never
 * be reasoned about the same way (one reduces a liability, one is
 * discretionary spend).
 *
 * This is a stated rule set, not a model — same epistemic posture as the
 * rest of the codebase's "rule-based, not ML" primitives. It classifies
 * using only Plaid's own Personal Finance Category taxonomy, which is
 * already being stored, so no new Plaid product/API is required.
 *
 * Unmapped or ambiguous cases return "unknown" rather than a guess —
 * consistent with resolveSubdomain()'s existing "don't force-fit" rule
 * in classify.ts.
 */

const TRANSFER_PRIMARY = new Set(["TRANSFER_IN", "TRANSFER_OUT"]);
const INCOME_PRIMARY = new Set(["INCOME"]);
const FEE_PRIMARY = new Set(["BANK_FEES"]);
const LOAN_PRIMARY = new Set(["LOAN_PAYMENTS"]);

const DEBT_PAYMENT_DETAILED_SUBSTRINGS = ["CREDIT_CARD_PAYMENT", "LOAN_PAYMENTS"];
const REFUND_DETAILED_SUBSTRINGS = ["REFUND", "PURCHASE_REFUND"];

export interface ClassifiableTransaction {
  amount: number; // Plaid convention: positive = money out
  plaid_category_primary: string | null;
  plaid_category_detailed: string | null;
}

export function classifyTransaction(tx: ClassifiableTransaction): TransactionClass {
  const primary = tx.plaid_category_primary ?? "";
  const detailed = tx.plaid_category_detailed ?? "";

  // Refunds post as inflows (amount < 0) but are labeled distinctly from
  // income — a refund is money coming back, not money earned.
  if (tx.amount < 0 && REFUND_DETAILED_SUBSTRINGS.some((s) => detailed.includes(s))) {
    return "refund";
  }

  if (TRANSFER_PRIMARY.has(primary)) return "transfer";

  if (tx.amount < 0 && INCOME_PRIMARY.has(primary)) return "income";

  if (tx.amount > 0 && FEE_PRIMARY.has(primary)) return "fee";

  if (
    tx.amount > 0 &&
    (LOAN_PRIMARY.has(primary) || DEBT_PAYMENT_DETAILED_SUBSTRINGS.some((s) => detailed.includes(s)))
  ) {
    return "debt_payment";
  }

  if (tx.amount > 0) return "purchase";

  // Any other inflow (amount < 0) not already classified as refund/income —
  // e.g. an uncategorized deposit. Genuinely ambiguous without more
  // evidence, so this is not force-fit into "income".
  if (tx.amount < 0) return "unknown";

  return "unknown";
}

/** Buckets a list of transactions by class. Pure function — no I/O — so
 *  it can be used identically whether the caller pulled 30 days or 365. */
export function bucketByClass<T extends ClassifiableTransaction>(
  txs: T[]
): Record<TransactionClass, T[]> {
  const buckets: Record<TransactionClass, T[]> = {
    purchase: [],
    transfer: [],
    income: [],
    refund: [],
    fee: [],
    debt_payment: [],
    unknown: [],
  };
  for (const tx of txs) {
    buckets[classifyTransaction(tx)].push(tx);
  }
  return buckets;
}
