import test from "node:test";
import assert from "node:assert/strict";
import { buildMaximumIntelligence } from "./maxIntelligence.js";
import type { FinancialReasoning } from "./relational.js";
import type { WindowDays } from "./types.js";

const reasoning: FinancialReasoning = {
  risks: [],
  opportunities: [],
  relationalChain: [],
  unresolvedQuestions: [],
  priorityFocus: null,
  generatedAt: "2026-08-31T00:00:00.000Z",
};

const flow = (windowDays: WindowDays, outflow: number) => ({
  windowDays,
  inflow: 0,
  outflow,
  net: -outflow,
  purchaseTotal: outflow,
  debtPaymentTotal: 0,
  txCount: 2,
  economicTxCount: 2,
});

test("maximum intelligence establishes a user-specific adaptive activity-day baseline from observed rates", () => {
  const result = buildMaximumIntelligence({
    flows: [flow(7, 700), flow(30, 3000), flow(90, 9000)],
    reasoning,
    safeToSpend: null,
    cashFlowNet: -3000,
    cashFlowWindowDays: 30,
    currentLiquidAssets: 5000,
    forwardProjectionBasis: null,
    dailyOutflowRates: [80, 100, 120, 140],
  });

  assert.equal(result.adaptive_baseline.status, "established");
  assert.equal(result.adaptive_baseline.sample_size, 4);
  assert.equal(result.adaptive_baseline.median, 110);
  assert.equal(result.statistics.sample_size, 4);
  assert.equal(result.statistics.median_daily_outflow, 110);
});

test("missing activity days are not silently converted into zero observations", () => {
  const result = buildMaximumIntelligence({
    flows: [flow(7, 700), flow(30, 3000)],
    reasoning,
    safeToSpend: null,
    cashFlowNet: -3000,
    cashFlowWindowDays: 30,
    currentLiquidAssets: 5000,
    forwardProjectionBasis: null,
    dailyOutflowRates: [100],
  });

  assert.equal(result.adaptive_baseline.status, "limited");
  assert.equal(result.adaptive_baseline.sample_size, 1);
  assert.equal(result.adaptive_baseline.median, 100);
  assert.match(result.adaptive_baseline.limitation ?? "", /two observed activity days/);
});
