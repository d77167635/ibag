/**
 * Future funded money-movement contract.
 *
 * This module is deliberately a contract only. Phase 1 MUST NOT execute any
 * money movement. A production implementation requires an approved payment
 * provider/rail, regulatory/compliance controls, authorization, idempotency,
 * settlement/reconciliation, limits, fraud controls and provider confirmation.
 */
export const MONEY_MOVEMENT_CONTRACT_VERSION = "IBAG_MONEY_MOVEMENT_CONTRACT_V1" as const;
export const MONEY_MOVEMENT_PHASE = "FUTURE_FUNDED_ONLY" as const;

export type MoneyMovementDirection = "send" | "receive" | "deposit" | "withdraw" | "peer_to_peer" | "ibag_to_connected_destination";
export type MoneyMovementRail = "bank_rail" | "card_rail" | "peer_rail" | "provider_defined";
export type MoneyMovementStatus = "draft" | "authorized" | "submitted" | "processing" | "settled" | "failed" | "reversed" | "cancelled";

export interface MoneyMovementDestination {
  id: string;
  kind: "connected_bank_account" | "connected_card" | "ibag_user" | "external_recipient";
  display_name: string;
  provider_reference: string | null;
  eligible: boolean;
  instant_available: boolean;
}

export interface MoneyMovementRequest {
  idempotency_key: string;
  direction: MoneyMovementDirection;
  rail: MoneyMovementRail;
  amount_cents: bigint;
  currency: "USD";
  source_account_id: string | null;
  destination: MoneyMovementDestination;
  user_authorized_at: string | null;
  phase: typeof MONEY_MOVEMENT_PHASE;
}

export interface MoneyMovementResult {
  movement_id: string;
  status: MoneyMovementStatus;
  amount_cents: bigint;
  currency: "USD";
  provider_reference: string | null;
  available_at: string | null;
  failure_code: string | null;
}

export const MONEY_MOVEMENT_SAFETY_RULES = [
  "Phase 1 cannot submit, settle, reverse, or otherwise execute a money movement.",
  "Every movement must have explicit user authorization before execution is enabled.",
  "Every movement must be idempotent and have an immutable audit trail.",
  "Only actually available iBag funds may be withdrawn or transferred out.",
  "A destination must be verified and eligible for the requested rail before submission.",
  "Instant availability must be determined by the actual execution rail; it must never be promised from UI intent alone.",
  "Send, receive, deposit, withdraw, peer-to-peer, and iBag-to-connected-destination are distinct movement intents even when they share infrastructure.",
  "Provider/source facts remain read-only; money movement creates new transaction records and does not rewrite provider history.",
  "Iris may explain, evaluate, and prepare an authorized movement, but cannot independently authorize or execute one.",
  "Every submitted movement must reconcile against provider confirmation and the iBag internal ledger before it is treated as settled.",
] as const;

export const FUTURE_MONEY_MOVEMENT_CAPABILITIES = [
  "send",
  "receive",
  "deposit",
  "withdraw",
  "peer_to_peer",
  "ibag_to_any_eligible_connected_card_or_account",
] as const;
