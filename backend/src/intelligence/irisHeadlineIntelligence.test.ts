import assert from "node:assert/strict";
import test from "node:test";
import { selectHeadlineIntelligence } from "./irisHeadlineIntelligence.js";

test("binds the exact supported analysis as headline intelligence", () => {
  assert.deepEqual(
    selectHeadlineIntelligence({
      analysis_id: "analysis.cash_flow",
      analysis_name: "Cash Flow",
      state: "ready",
      evidence_coverage: 1,
      evidence_publication_state: "calculated",
    }),
    {
      headline_intelligence_node_id: "analysis.cash_flow",
      headline_reason: "Primary supported analytical intelligence for this report; no competing report-level intelligence node was supplied to the publication runtime.",
    },
  );
});

test("preserves limitation instead of upgrading it into a stronger claim", () => {
  const result = selectHeadlineIntelligence({
    analysis_id: "analysis.liquidity",
    analysis_name: "Liquidity",
    state: "limited",
    evidence_coverage: 0.5,
    evidence_publication_state: "limited",
  });

  assert.equal(result.headline_intelligence_node_id, "analysis.liquidity");
  assert.match(result.headline_reason ?? "", /evidence-limited/);
});

test("does not select suppressed or unknown intelligence as a headline", () => {
  assert.deepEqual(
    selectHeadlineIntelligence({
      analysis_id: "analysis.hidden",
      analysis_name: "Hidden",
      state: "suppressed",
      evidence_coverage: 0,
      evidence_publication_state: "insufficient_evidence",
    }),
    { headline_intelligence_node_id: null, headline_reason: null },
  );
});
