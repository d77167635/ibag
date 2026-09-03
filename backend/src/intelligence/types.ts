/**
 * Shared types for the layered intelligence system.
 *
 * Evidence tagging is not its own layer — it's a property every layer's
 * output carries. A number is one of:
 *
 *   observed     — read directly off Plaid data, no computation
 *   calculated   — arithmetic performed on observed facts (sums, %s, ratios)
 *   inferred     — a relationship between two calculated facts that is
 *                  plausible but not provably causal
 *   insufficient_evidence — the layer explicitly could NOT support a claim
 *                  the architecture would want to make. This is asserted,
 *                  not omitted, so callers can render "we don't know" as
 *                  a first-class state instead of a blank space.
 */
export type Evidence = "observed" | "calculated" | "inferred" | "insufficient_evidence";
export type Severity = "low" | "medium" | "high";

export interface EvidencedValue<T> {
  value: T;
  evidence: Evidence;
  /** Plain-language statement of what this value rests on. Required
   *  whenever evidence is not "observed" — a calculated/inferred number
   *  with no basis string is exactly the failure mode this system exists
   *  to prevent. */
  basis: string | null;
}

/** Standard temporal windows used across the system (layer 3). Callers
 *  pick a subset; nothing forces all of these to be computed every time. */
export const STANDARD_WINDOWS_DAYS = [7, 14, 30, 90, 180, 365] as const;
export type WindowDays = (typeof STANDARD_WINDOWS_DAYS)[number];

/** Layer 2 — what a transaction actually represents, independent of its
 *  category label. Plaid's PFC categories describe WHAT was bought;
 *  this describes the financial NATURE of the movement. */
export type TransactionClass =
  | "purchase"
  | "transfer"
  | "income"
  | "refund"
  | "fee"
  | "debt_payment"
  | "unknown";

export interface RiskItem {
  key: string;
  severity: Severity;
  evidence: Evidence;
  statement: string;
  supportingMetrics: Record<string, number | string | null>;
}

export interface OpportunityItem {
  key: string;
  evidence: Evidence;
  statement: string;
  supportingMetrics: Record<string, number | string | null>;
}
