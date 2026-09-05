import type { CanonicalTransaction } from "./transactionSemantics.js";
import { isEconomicInflow, isEconomicOutflow, isEligibleRoundup, roundupAmount } from "./transactionSemantics.js";

export type IntegrityStatus = "pass" | "fail" | "limited";

export interface IntelligenceIntegrity {
  architecture_version: "IRIS_INTELLIGENCE_INTEGRITY_V1";
  status: IntegrityStatus;
  transaction_count: number;
  economic_inflow: number;
  economic_outflow: number;
  transfer_count: number;
  unknown_count: number;
  roundup_eligible_count: number;
  roundup_opportunity: number;
  invariants: Array<{ name: string; status: IntegrityStatus; detail: string }>;
  limitations: string[];
}

/**
 * Machine-checkable contract for the data boundary shared by Iris layers.
 * This never invents a value: a failed invariant makes the intelligence
 * envelope explicitly non-certified instead of silently presenting a result.
 */
export function validateCanonicalIntelligenceInput(transactions: CanonicalTransaction[]): IntelligenceIntegrity {
  const economicInflow = transactions.filter(isEconomicInflow).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const economicOutflow = transactions.filter(isEconomicOutflow).reduce((s, tx) => s + tx.amount, 0);
  const transferCount = transactions.filter(tx => tx.transaction_class === "transfer").length;
  const unknownCount = transactions.filter(tx => tx.transaction_class === "unknown").length;
  const eligible = transactions.filter(isEligibleRoundup);
  const roundupOpportunity = eligible.reduce((s, tx) => s + roundupAmount(tx.amount), 0);

  const invariants: IntelligenceIntegrity["invariants"] = [];
  const add = (name: string, ok: boolean, detail: string) => invariants.push({ name, status: ok ? "pass" : "fail", detail });

  add(
    "economic_flow_excludes_internal_transfers",
    transactions.filter(tx => isEconomicInflow(tx) || isEconomicOutflow(tx)).every(tx => tx.transaction_class !== "transfer"),
    "Transfer-class transactions are excluded from economic inflow/outflow."
  );
  add(
    "unknown_movements_are_not_economic",
    transactions.filter(tx => tx.transaction_class === "unknown").every(tx => !isEconomicInflow(tx) && !isEconomicOutflow(tx)),
    "Unknown movements cannot silently become economic flow."
  );
  add(
    "roundup_eligibility_is_purchase_only",
    eligible.every(tx => tx.transaction_class === "purchase" && tx.amount > 0 && tx.amount < 800),
    "Only positive purchase transactions below the rent-sized threshold qualify."
  );
  add(
    "roundup_total_is_deterministic",
    Math.abs(roundupOpportunity - eligible.reduce((s, tx) => s + Math.max(0, Math.ceil(tx.amount) - tx.amount), 0)) < 0.000001,
    "Round-Up opportunity equals the deterministic canonical calculation."
  );
  add(
    "canonical_transaction_identity_is_present",
    transactions.every(tx => Boolean(tx.id) && Boolean(tx.posted_date) && Number.isFinite(tx.amount)),
    "Every canonical transaction has identity, date, and finite amount."
  );

  const failed = invariants.filter(i => i.status === "fail");
  const limitations: string[] = [];
  if (unknownCount > 0) limitations.push(`${unknownCount} transaction(s) remain unknown and are excluded from economic conclusions.`);

  return {
    architecture_version: "IRIS_INTELLIGENCE_INTEGRITY_V1",
    status: failed.length ? "fail" : limitations.length ? "limited" : "pass",
    transaction_count: transactions.length,
    economic_inflow: economicInflow,
    economic_outflow: economicOutflow,
    transfer_count: transferCount,
    unknown_count: unknownCount,
    roundup_eligible_count: eligible.length,
    roundup_opportunity: roundupOpportunity,
    invariants,
    limitations,
  };
}
