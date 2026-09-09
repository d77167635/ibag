import test from "node:test";
import assert from "node:assert/strict";
import { reconcileCanonicalTransactions } from "./canonicalReconciliation.js";

const account = { id: "a1", item_id: "i1", plaid_account_id: "pa1" };
const raw = (id: string, provider: string, accountId = "a1") => ({ id, account_id: accountId, plaid_transaction_id: provider, is_current: true, evidence_state: "observed" });
const canonical = (id: string, provider: string, rawId: string, accountId = "a1") => ({ id, account_id: accountId, plaid_transaction_id: provider, raw_transaction_id: rawId, is_active: true });

test("reconciles one-to-one provider transaction lineage", () => {
  const result = reconcileCanonicalTransactions([account], [canonical("c1", "pt1", "r1")], [raw("r1", "pt1")]);
  assert.equal(result.status, "reconciled");
  assert.equal(result.active_canonical_with_raw, 1);
  assert.equal(result.raw_current_with_canonical, 1);
  assert.equal(result.active_canonical_with_item, 1);
  assert.equal(result.double_counting_risk, false);
});

test("fails when an active canonical transaction has no raw observation", () => {
  const result = reconcileCanonicalTransactions([account], [canonical("c1", "pt1", "r1")], []);
  assert.equal(result.status, "failed");
  assert.deepEqual(result.orphan_canonical, ["c1"]);
});

test("fails on provider identity duplication rather than silently deduplicating", () => {
  const result = reconcileCanonicalTransactions(
    [account],
    [canonical("c1", "pt1", "r1"), canonical("c2", "pt1", "r2")],
    [raw("r1", "pt1"), raw("r2", "pt1")],
  );
  assert.equal(result.status, "failed");
  assert.deepEqual(result.duplicate_canonical_provider_ids, ["pt1"]);
  assert.equal(result.double_counting_risk, true);
});

test("fails when canonical and raw rows disagree on account lineage", () => {
  const secondAccount = { id: "a2", item_id: "i1", plaid_account_id: "pa2" };
  const result = reconcileCanonicalTransactions(
    [account, secondAccount],
    [canonical("c1", "pt1", "r1", "a1")],
    [raw("r1", "pt1", "a2")],
  );
  assert.equal(result.status, "failed");
  assert.ok(result.lineage_failures.includes("canonical:c1:account_mismatch"));
  assert.equal(result.double_counting_risk, true);
});

test("reports unmatched current raw observations as warning without inventing a canonical row", () => {
  const result = reconcileCanonicalTransactions([account], [], [raw("r1", "pt1")]);
  assert.equal(result.status, "warning");
  assert.deepEqual(result.orphan_raw, ["r1"]);
  assert.equal(result.canonical_active, 0);
  assert.equal(result.raw_current_observed, 1);
});

test("does not treat non-observed raw rows as certified provider evidence", () => {
  const result = reconcileCanonicalTransactions(
    [account],
    [canonical("c1", "pt1", "r1")],
    [{ ...raw("r1", "pt1"), evidence_state: "inferred" }],
  );
  assert.equal(result.status, "failed");
  assert.deepEqual(result.orphan_canonical, ["c1"]);
});
