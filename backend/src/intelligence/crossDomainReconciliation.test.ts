import test from "node:test";
import assert from "node:assert/strict";
import { reconcileCrossDomainState } from "./crossDomainReconciliation.js";

const complete = {
  accountBalanceCount: 4,
  transactionAccountCount: 4,
  transactionLineageComplete: true,
  balanceCurrencySafe: true,
  investmentAccountBalance: 5000,
  investmentHoldingValue: 5000,
  liabilityAccountBalance: 2000,
  liabilityProductBalance: 2000,
  assetReportValue: 10000,
  statementAccountCount: 4,
  statementTransactionAccountOverlap: 4,
};

test("complete same-account evidence is reconciled without double counting", () => {
  const result = reconcileCrossDomainState(complete);
  assert.equal(result.state, "reconciled");
  assert.equal(result.net_worth_basis, "account_balances_only");
  assert.equal(result.overlap_protection.investment_holdings_excluded_from_net_worth, true);
  assert.equal(result.overlap_protection.asset_report_values_excluded_from_net_worth, true);
});

test("missing transaction lineage prevents a fully reconciled state", () => {
  const result = reconcileCrossDomainState({ ...complete, transactionLineageComplete: false });
  assert.notEqual(result.state, "reconciled");
  assert.match(result.limitations.join(" "), /lineage is incomplete/i);
});

test("unsafe currency withholds net-worth aggregation", () => {
  const result = reconcileCrossDomainState({ ...complete, balanceCurrencySafe: false });
  assert.equal(result.net_worth_basis, "withheld");
  assert.match(result.limitations.join(" "), /currency is not unambiguous/i);
});

test("partial statement coverage is never promoted to dollar reconciliation", () => {
  const result = reconcileCrossDomainState({ ...complete, statementTransactionAccountOverlap: 3 });
  assert.equal(result.checks.statement_account_coverage, 0.75);
  assert.notEqual(result.state, "reconciled");
  assert.match(result.limitations.join(" "), /not treated as dollar reconciliation/i);
});

test("no evidence remains insufficient", () => {
  const result = reconcileCrossDomainState({
    accountBalanceCount: 0,
    transactionAccountCount: 0,
    transactionLineageComplete: false,
    balanceCurrencySafe: false,
    investmentAccountBalance: null,
    investmentHoldingValue: null,
    liabilityAccountBalance: null,
    liabilityProductBalance: null,
    assetReportValue: null,
    statementAccountCount: 0,
    statementTransactionAccountOverlap: 0,
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.net_worth_basis, "withheld");
});
