import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildLiabilityIntelligence } from "./liabilityIntelligence.js";

test("liability intelligence preserves provider-observed fields and missing values", () => {
  const result = buildLiabilityIntelligence([
    {
      id: "observed-liability-1",
      account_id: "account-1",
      effective_at: "2026-09-10T00:00:00Z",
      acquired_at: "2026-09-10T00:01:00Z",
      raw_response: {
        liabilities: {
          credit_card: {
            last_statement_balance: 1250,
            minimum_payment_amount: 45,
            last_payment_amount: 100,
            last_payment_date: "2026-09-01",
            next_payment_due_date: "2026-09-20",
            is_overdue: false,
            apr_percentage: 19.99,
            apr_type: "purchase_apr",
          },
        },
      },
    },
  ]);

  assert.equal(result.evidence_state, "calculated");
  assert.equal(result.liability_count, 1);
  assert.equal(result.liabilities[0]?.liability_type, "credit_card");
  assert.equal(result.liabilities[0]?.statement_balance, 1250);
  assert.equal(result.liabilities[0]?.minimum_payment, 45);
  assert.equal(result.liabilities[0]?.next_payment_due_date, "2026-09-20");
  assert.equal(result.aggregate.statement_balance, 1250);
  assert.equal(result.aggregate.minimum_payment, 45);
  assert.equal(result.aggregate.highest_apr_percentage, 19.99);
});

test("liability intelligence does not convert absent observations into zero", () => {
  const result = buildLiabilityIntelligence([]);
  assert.equal(result.evidence_state, "insufficient_evidence");
  assert.equal(result.observation_count, 0);
  assert.equal(result.liability_count, 0);
  assert.equal(result.aggregate.statement_balance, null);
  assert.equal(result.aggregate.minimum_payment, null);
  assert.equal(result.aggregate.highest_apr_percentage, null);
});

test("multiple observed liability payloads remain separately traceable", () => {
  const result = buildLiabilityIntelligence([
    { id: "obs-a", account_id: "acct-a", effective_at: null, acquired_at: null, raw_response: { liabilities: [{ liability_type: "credit_card", last_statement_balance: 100 }] } },
    { id: "obs-b", account_id: "acct-b", effective_at: null, acquired_at: null, raw_response: { liabilities: [{ liability_type: "student_loan", last_statement_balance: 200 }] } },
  ]);

  assert.equal(result.liability_count, 2);
  assert.deepEqual(result.liabilities.map(value => value.account_id), ["acct-a", "acct-b"]);
  assert.equal(result.aggregate.statement_balance, 300);
});
