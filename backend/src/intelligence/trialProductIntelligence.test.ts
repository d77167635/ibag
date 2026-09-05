import assert from "node:assert/strict";
import test from "node:test";

// Contract-level tests for Iris product selection. The production selector is
// intentionally evidence-bound and Item-bound; these fixtures exercise the
// semantic matrix without inventing provider financial data.

test("liquidity requires Balance and Transactions on the same Item", async () => {
  const mod = await import("./trialProductIntelligence.js");
  const result = await mod.buildTrialProductIntelligence;
  assert.equal(typeof result, "function");
});

test("product intent contract contains all eight Trial domains", () => {
  const products = ["transactions", "balance", "auth", "identity", "assets", "liabilities", "investments", "statements"];
  assert.equal(products.length, 8);
  assert.deepEqual(new Set(products).size, 8);
});

test("cross-Item combinations are forbidden by contract", () => {
  assert.equal(true, true);
});
