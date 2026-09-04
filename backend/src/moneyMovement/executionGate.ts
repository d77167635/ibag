/** Hard Phase-1 execution boundary for future funded iBag money movement. */
import { MONEY_MOVEMENT_PHASE } from "./futureContract.js";

export const MONEY_MOVEMENT_EXECUTION_ENABLED = false as const;

export interface MoneyMovementExecutionGate {
  phase: typeof MONEY_MOVEMENT_PHASE;
  enabled: false;
  reason: string;
}

export function getMoneyMovementExecutionGate(): MoneyMovementExecutionGate {
  return {
    phase: MONEY_MOVEMENT_PHASE,
    enabled: false,
    reason:
      "Phase 1 is read-only intelligence. Funding, deposits, withdrawals, sends, receives, peer-to-peer payments, and iBag-to-connected-destination transfers are architecturally defined but execution-disabled until an approved production rail and all authorization, eligibility, risk, compliance, ledger, settlement, and reconciliation controls are enabled.",
  };
}

export function assertMoneyMovementExecutionDisabled(): never {
  throw new Error("MONEY_MOVEMENT_EXECUTION_DISABLED_PHASE_1");
}
