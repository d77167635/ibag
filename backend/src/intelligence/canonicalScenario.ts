import { computeEconomicCashFlow, getCanonicalTransactions } from "./transactionSemantics.js";
import { computeCashFlowSafety } from "../services/intelligence.js";

export async function computeCanonicalScenario(
  userId: string,
  type: "spending_change" | "bill_change" | "income_change",
  amount: number,
) {
  if (!Number.isFinite(amount)) {
    return { evidence: "insufficient_evidence" as const, reason: "Scenario amount must be a finite number." };
  }

  const [transactions, cashFlowSafety] = await Promise.all([
    getCanonicalTransactions(userId),
    computeCashFlowSafety(userId),
  ]);

  const now = Date.now();
  const currentStart = new Date(now - 30 * 86_400_000).toISOString().slice(0, 10);
  const current = transactions.filter((tx) => tx.posted_date >= currentStart);
  const cashFlow = computeEconomicCashFlow(current);

  if (cashFlowSafety.safeToSpend === null) {
    return {
      evidence: "insufficient_evidence" as const,
      reason: "Not enough account data to calculate safe-to-spend for this scenario.",
    };
  }

  let scenarioSafeToSpend = cashFlowSafety.safeToSpend;
  let scenarioNet = cashFlow.net;
  let assumption: string;

  if (type === "spending_change") {
    scenarioSafeToSpend -= amount;
    scenarioNet -= amount;
    assumption = `Assumes discretionary economic spending changes by exactly $${amount.toFixed(2)} with everything else held constant; this is deterministic arithmetic, not a behavioral prediction.`;
  } else if (type === "bill_change") {
    scenarioSafeToSpend -= amount;
    scenarioNet -= amount;
    assumption = `Assumes essential bills change by $${amount.toFixed(2)} within the current horizon, with no other change; this is deterministic arithmetic, not a forecast.`;
  } else {
    if (cashFlow.inflow === 0) {
      return {
        evidence: "insufficient_evidence" as const,
        reason: "No observed economic inflow exists in the current 30-day window, so an income-change percentage cannot be meaningfully applied.",
      };
    }
    const inflowDelta = cashFlow.inflow * (amount / 100);
    scenarioNet += inflowDelta;
    scenarioSafeToSpend += inflowDelta;
    assumption = `Assumes a ${amount >= 0 ? "increase" : "decrease"} of ${Math.abs(amount).toFixed(0)}% applied to observed economic inflow of $${cashFlow.inflow.toFixed(2)}. This does not claim that every observed inflow is employment income.`;
  }

  return {
    evidence: "calculated" as const,
    calculation_version: "IRIS_CANONICAL_SCENARIO_V1",
    baseline: { safeToSpend: cashFlowSafety.safeToSpend, cashFlowNet: cashFlow.net },
    scenario: { safeToSpend: scenarioSafeToSpend, cashFlowNet: scenarioNet },
    delta: {
      safeToSpend: scenarioSafeToSpend - cashFlowSafety.safeToSpend,
      cashFlowNet: scenarioNet - cashFlow.net,
    },
    assumption,
    evidence_basis: {
      transaction_count: current.length,
      economic_inflow: cashFlow.inflow,
      economic_outflow: cashFlow.outflow,
      semantics: "canonical economic transaction classes; transfers and unknown movements excluded",
    },
  };
}
