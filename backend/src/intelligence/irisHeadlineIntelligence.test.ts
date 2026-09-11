import assert from "node:assert/strict";
import test from "node:test";
import { selectHeadlineIntelligence } from "./irisHeadlineIntelligence.js";

const lineage = {
  resolution_state: "resolved" as const,
  report_id: "report.analysis.cash_flow",
  analysis_definition_id: "analysis.cash_flow",
  feature_ids: [],
  capability_ids: ["cash_flow"],
  intelligence_node_ids: ["node-cash-flow"],
  upstream_intelligence_node_ids: ["node-transactions"],
  transformation_edge_ids: ["edge-cash-flow"],
  run_evidence_ids: ["evidence-transactions"],
  evidence_lineage_present: true,
  run_id: "run-1",
  execution_id: "execution-1",
  limitation: null,
};

test("binds the exact persisted runtime node as headline intelligence", () => {
  assert.deepEqual(selectHeadlineIntelligence({ analysis_id: "analysis.cash_flow", analysis_name: "Cash Flow", state: "ready", evidence_coverage: 1, evidence_publication_state: "calculated" }, lineage), {
    headline_intelligence_node_id: "node-cash-flow",
    headline_reason: "Primary resolved runtime intelligence node for this report; no competing report-level intelligence node was supplied to the publication runtime.",
  });
});

test("preserves limitation without promoting an analytical definition into a node", () => {
  const result = selectHeadlineIntelligence({ analysis_id: "analysis.liquidity", analysis_name: "Liquidity", state: "limited", evidence_coverage: 0.5, evidence_publication_state: "limited" }, { ...lineage, report_id: "report.analysis.liquidity", analysis_definition_id: "analysis.liquidity", intelligence_node_ids: ["node-liquidity"] });
  assert.equal(result.headline_intelligence_node_id, "node-liquidity");
  assert.match(result.headline_reason ?? "", /evidence-limited/);
});

test("does not select suppressed or unknown intelligence as a headline", () => {
  assert.deepEqual(selectHeadlineIntelligence({ analysis_id: "analysis.hidden", analysis_name: "Hidden", state: "suppressed", evidence_coverage: 0, evidence_publication_state: "insufficient_evidence" }, lineage), { headline_intelligence_node_id: null, headline_reason: null });
});
