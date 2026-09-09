import { describe, expect, it } from "node:test";
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
    expect(answer).toContain("Checking");
    expect(answer).toContain("$1,250.50");
    expect(answer).toContain("provider values, not Iris calculations");
  });

  it("answers product observation questions without treating catalog metadata as observation", () => {
    const answer = answerProviderQuestion("Which Plaid products are observed?", evidence);
    expect(answer).toContain("balance: observed");
    expect(answer).toContain("kept separate from actual domain observation");
  });

  it("returns null rather than inventing an unsupported provider fact", () => {
    expect(answerProviderQuestion("What is my credit score?", evidence)).toBeNull();
  });
});
