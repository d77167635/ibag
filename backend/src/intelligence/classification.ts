import type { TransactionClass } from "./types.js";

/**
 * LAYER 2 — CLASSIFICATION INTELLIGENCE
 *
 * Classification describes the financial nature of a movement, separately
 * from its amount sign and category label. Rules are deliberately
 * conservative: an ambiguous movement is "unknown", never a guessed
 * purchase/income/transfer.
 */

const TRANSFER_PRIMARY = new Set(["TRANSFER_IN", "TRANSFER_OUT"]);
const INCOME_PRIMARY = new Set(["INCOME"]);
const FEE_PRIMARY = new Set(["BANK_FEES"]);
const LOAN_PRIMARY = new Set(["LOAN_PAYMENTS"]);
const PURCHASE_PRIMARY = new Set(["FOOD_AND_DRINK", "GENERAL_MERCHANDISE", "HOME_IMPROVEMENT", "PERSONAL_CARE", "GENERAL_SERVICES", "ENTERTAINMENT", "TRANSPORTATION", "TRAVEL", "RENT_AND_UTILITIES"]);
const DEBT_PAYMENT_DETAILED_SUBSTRINGS = ["CREDIT_CARD_PAYMENT", "LOAN_PAYMENTS"];
const REFUND_DETAILED_SUBSTRINGS = ["REFUND", "PURCHASE_REFUND"];

export interface ClassifiableTransaction {
  amount: number;
  plaid_category_primary: string | null;
  plaid_category_detailed: string | null;
}

export interface ClassificationResult {
  class: TransactionClass;
  evidence: "calculated" | "insufficient_evidence";
  basis: string;
}

export function classifyTransactionWithEvidence(tx: ClassifiableTransaction): ClassificationResult {
  const primary = tx.plaid_category_primary ?? "";
  const detailed = tx.plaid_category_detailed ?? "";

  if (tx.amount < 0 && REFUND_DETAILED_SUBSTRINGS.some((s) => detailed.includes(s))) {
    return { class: "refund", evidence: "calculated", basis: "Plaid detailed category identifies a refund and the movement is an inflow." };
  }
  if (TRANSFER_PRIMARY.has(primary)) {
    return { class: "transfer", evidence: "calculated", basis: `Plaid primary category is ${primary}.` };
  }
  if (tx.amount < 0 && INCOME_PRIMARY.has(primary)) {
    return { class: "income", evidence: "calculated", basis: "Plaid primary category identifies income and the movement is an inflow." };
  }
  if (tx.amount > 0 && FEE_PRIMARY.has(primary)) {
    return { class: "fee", evidence: "calculated", basis: "Plaid primary category identifies a bank fee." };
  }
  if (tx.amount > 0 && (LOAN_PRIMARY.has(primary) || DEBT_PAYMENT_DETAILED_SUBSTRINGS.some((s) => detailed.includes(s)))) {
    return { class: "debt_payment", evidence: "calculated", basis: "Plaid category identifies a debt/loan payment." };
  }
  if (tx.amount > 0 && PURCHASE_PRIMARY.has(primary)) {
    return { class: "purchase", evidence: "calculated", basis: `Plaid primary category explicitly identifies a purchase domain (${primary}).` };
  }
  return { class: "unknown", evidence: "insufficient_evidence", basis: "Available provider fields do not establish the economic nature of this movement." };
}

export function classifyTransaction(tx: ClassifiableTransaction): TransactionClass {
  return classifyTransactionWithEvidence(tx).class;
}

export function bucketByClass<T extends ClassifiableTransaction>(txs: T[]): Record<TransactionClass, T[]> {
  const buckets: Record<TransactionClass, T[]> = {
    purchase: [],
    transfer: [],
    income: [],
    refund: [],
    fee: [],
    debt_payment: [],
    unknown: [],
  };
  for (const tx of txs) buckets[classifyTransaction(tx)].push(tx);
  return buckets;
}
