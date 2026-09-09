import test from "node:test";
import assert from "node:assert/strict";
import { verifyProviderLineage, IRIS_CANONICAL_PROVIDER_DOMAINS } from "./evidenceGraph.js";

function mockSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const builder: any = {
        select() { return builder; },
        eq() { return builder; },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          try {
            const value = { data: rows, count: rows.length, error: null };
            return Promise.resolve(resolve(value));
          } catch (error) {
            return reject ? Promise.reject(reject(error)) : Promise.reject(error);
          }
        },
      };
      return builder;
    },
  } as any;
}

const accounts = [{ id: "a1", item_id: "i1", plaid_account_id: "pa1" }];
const canonical = [{ id: "c1", account_id: "a1", plaid_transaction_id: "pt1", raw_transaction_id: "r1", is_active: true }];
const raw = [{ id: "r1", account_id: "a1", plaid_transaction_id: "pt1", is_current: true, evidence_state: "observed" }];
const allDomains = IRIS_CANONICAL_PROVIDER_DOMAINS.map((product) => ({ item_id: "i1", product }));

test("provider lineage requires complete same-Item eight-domain coverage and transaction reconciliation", async () => {
  const result = await verifyProviderLineage(mockSupabase({
    plaid_accounts: accounts,
    transactions: canonical,
    plaid_raw_transactions: raw,
    plaid_product_observations: allDomains,
  }), "u1");

  assert.equal(result.canonicalProductDomainCoverageComplete, true);
  assert.deepEqual(result.missingCanonicalProductDomains, []);
  assert.equal(result.transactionReconciliation.status, "reconciled");
  assert.equal(result.lineageComplete, true);
});

test("provider lineage is not complete when a canonical domain is missing", async () => {
  const result = await verifyProviderLineage(mockSupabase({
    plaid_accounts: accounts,
    transactions: canonical,
    plaid_raw_transactions: raw,
    plaid_product_observations: allDomains.filter((row) => row.product !== "statements"),
  }), "u1");

  assert.equal(result.canonicalProductDomainCoverageComplete, false);
  assert.deepEqual(result.missingCanonicalProductDomains, ["statements"]);
  assert.equal(result.lineageComplete, false);
});

test("provider lineage fails closed on canonical/raw identity mismatch", async () => {
  const result = await verifyProviderLineage(mockSupabase({
    plaid_accounts: accounts,
    transactions: canonical,
    plaid_raw_transactions: [{ ...raw[0], account_id: "different-account" }],
    plaid_product_observations: allDomains,
  }), "u1");

  assert.equal(result.transactionReconciliation.status, "failed");
  assert.equal(result.transactionReconciliation.double_counting_risk, true);
  assert.equal(result.lineageComplete, false);
});
