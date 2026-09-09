import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerProviderQuestion } from "./providerQuestion.js";
import type { IrisProviderEvidence } from "./providerEvidence.js";

const evidence: IrisProviderEvidence = {
  accounts: [{ name: "Checking", current_balance: 1250.5, available_balance: 1200 }],
  institutions: [{ institution_name: "Observed Bank" }],
  transactions: [{ posted_date: "2026-09-08", merchant_name: "Example Store", amount: 12.34 }],
  product_observations: [{ product: "balance", lifecycle_state: "observed" }],
  limitations: [],
};

describe("answerProviderQuestion", () => {
  it("answers provider balance questions from supplied evidence", () => {
    const answer = answerProviderQuestion("What is my checking balance?", evidence);
    assert.ok(answer?.includes("Checking"));
    assert.ok(answer?.includes("$1,250.50"));
    assert.ok(answer?.includes("provider values, not Iris calculations"));
  });

  it("answers product observation questions without treating catalog metadata as observation", () => {
    const answer = answerProviderQuestion("Which Plaid products are observed?", evidence);
    assert.ok(answer?.includes("balance: observed"));
    assert.ok(answer?.includes("kept separate from actual domain observation"));
  });

  it("returns null rather than inventing an unsupported provider fact", () => {
    assert.equal(answerProviderQuestion("What is my credit score?", evidence), null);
  });
});
