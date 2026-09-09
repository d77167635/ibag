import test from "node:test";
import assert from "node:assert/strict";
import { reconcileFinancialComposition } from "./financialCompositionReconciliation.js";

test("uses mutually exclusive account balances as the net-worth basis", () => {
  const result = reconcileFinancialComposition(
    [
      { account_id: "checking", item_id: "item-1", account_type: "depository", current_balance: 1000, currency: "USD" },
      { account_id: "brokerage", item_id: "item-1", account_type: "investment", current_balance: 5000, currency: "USD" },
      { account_id: "card", item_id: "item-1", account_type: "credit", current_balance: 500, currency: "USD" },
    ],
    [{ holding_id: "holding-1", account_id: "brokerage", market_value: 5000, currency: "USD" }],
    [{ liability_id: "liability-1", account_id: "card", balance: 500, currency: "USD" }],
    [{ asset_id: "asset-1", value: 10000, currency: "USD" }],
  );

  assert.equal(result.net_worth_basis, "account_balances_only");
  assert.equal(result.net_worth, 5500);
  assert.equal(result.investment_holdings_value, 5000);
  assert.equal(result.liability_product_value, 500);
  assert.equal(result.asset_report_value, 10000);
  assert.equal(result.double_counting_risk, true);
  assert.ok(result.limitations.some((value) => value.includes("not added")));
});

test("withholds additive monetary composition when account currencies conflict", () => {
  const result = reconcileFinancialComposition(
    [
      { account_id: "a1", item_id: "item-1", account_type: "depository", current_balance: 1000, currency: "USD" },
      { account_id: "a2", item_id: "item-1", account_type: "depository", current_balance: 900, currency: "EUR" },
    ],
    [],
    [],
    [],
  );

  assert.equal(result.status, "warning");
  assert.equal(result.net_worth, null);
  assert.equal(result.net_worth_basis, "insufficient_evidence");
  assert.deepEqual(result.currencies, ["EUR", "USD"]);
});

test("fails on duplicate canonical account identity", () => {
  const result = reconcileFinancialComposition(
    [
      { account_id: "duplicate", item_id: "item-1", account_type: "depository", current_balance: 100, currency: "USD" },
      { account_id: "duplicate", item_id: "item-1", account_type: "depository", current_balance: 200, currency: "USD" },
    ],
    [],
    [],
    [],
  );

  assert.equal(result.status, "failed");
  assert.deepEqual(result.duplicate_account_ids, ["duplicate"]);
  assert.equal(result.double_counting_risk, true);
});

test("fails closed on non-finite account balances", () => {
  const result = reconcileFinancialComposition(
    [
      { account_id: "checking", item_id: "item-1", account_type: "depository", current_balance: Number.NaN, currency: "USD" },
      { account_id: "savings", item_id: "item-1", account_type: "depository", current_balance: 1000, currency: "USD" },
    ],
    [],
    [],
    [],
  );

  assert.equal(result.status, "failed");
  assert.equal(result.net_worth, null);
  assert.equal(result.net_worth_basis, "insufficient_evidence");
  assert.deepEqual(result.invalid_account_ids, ["checking"]);
});