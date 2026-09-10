import test from "node:test";
import assert from "node:assert/strict";
import { computeCanonicalWindowFlows, computeEconomicCashFlow } from "./transactionSemantics.js";
import type { CanonicalTransaction } from "./transactionSemantics.js";

const tx = (id: string, date: string, amount: number, transactionClass: string): CanonicalTransaction => ({
  id,
  account_id: "account-1",
  amount,
  posted_date: date,
  transaction_class: transactionClass,
  classification_evidence: "observed",
  plaid_category_primary: null,
  plaid_category_detailed: null,
  merchant_id: null,
  merchant_name: null,
  subdomain: null,
  domain: null,
});

test("window flows honor the explicit evidence boundary rather than wall-clock time", () => {
  const transactions = [
    tx("older", "2026-08-01", 25, "purchase"),
    tx("boundary", "2026-08-31", 40, "purchase"),
    tx("later", "2026-09-05", 90, "purchase"),
  ];
  const flows = computeCanonicalWindowFlows(transactions, [7, 30], "2026-09-05", "run-1", "2026-08-31T23:59:59.000Z");
  assert.equal(flows.find((flow) => flow.windowDays === 7)?.outflow, 40);
  assert.equal(flows.find((flow) => flow.windowDays === 30)?.outflow, 65);
});

test("window aggregation never adds transactions outside the supplied canonical set", () => {
  const transactions = [tx("one", "2026-08-31", 10, "purchase")];
  const flows = computeCanonicalWindowFlows(transactions, [7], "2026-08-31", "run-2", "2026-08-31T23:59:59.000Z");
  assert.equal(flows[0].txCount, 1);
  assert.equal(flows[0].outflow, 10);
});

test("economic cash flow excludes non-economic transaction classes", () => {
  const transactions = [
    tx("income", "2026-08-31", -1000, "income"),
    tx("purchase", "2026-08-31", 250, "purchase"),
    tx("transfer", "2026-08-31", 500, "transfer"),
    tx("unknown", "2026-08-31", 75, "unknown"),
  ];
  assert.deepEqual(computeEconomicCashFlow(transactions), { inflow: 1000, outflow: 250, net: 750 });
});
