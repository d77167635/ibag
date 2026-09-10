import test from "node:test";
import assert from "node:assert/strict";
import { buildIntelligenceGraph } from "./intelligenceGraph.js";

test("intelligence graph preserves transaction and temporal context as explicit evidence nodes", () => {
  const graph = buildIntelligenceGraph([
    {
      id: "transaction-a",
      account_id: "account-a",
      merchant_name: "Merchant A",
      domain: { key: "domain-a", label: "Domain A" },
      subdomain: { key: "subdomain-a", label: "Subdomain A" },
      plaid_category_primary: "category-a",
      plaid_category_detailed: "category-a-detail",
      transaction_class: "purchase",
      posted_date: "2026-01-15",
    },
  ], {
    definitions: [{
      id: "analysis-a",
      name: "Analysis A",
      family: "spending",
      output: "spending_state",
      inputs: ["canonical_transactions"],
      purpose: "Inspect observed spending",
      evidence_ready: true,
    } as any],
  });

  assert.equal(graph.architecture_version, "IRIS_INTELLIGENCE_GRAPH_V3");
  assert.equal(graph.capabilities.transaction_contexts, 1);
  assert.equal(graph.capabilities.temporal_contexts, 1);
  assert.ok(graph.nodes.some(node => node.id === "transaction:transaction-a" && node.observed));
  assert.ok(graph.nodes.some(node => node.id === "temporal:2026-01-15" && node.observed));
  assert.ok(graph.edges.some(edge => edge.from === "transaction:transaction-a" && edge.to === "temporal:2026-01-15" && edge.relation === "occurs_at"));
  assert.ok(graph.edges.some(edge => edge.from === "transaction:transaction-a" && edge.to === "transaction_class:purchase" && edge.relation === "classified_as"));
});

test("intelligence graph never marks analytical definitions themselves as observed facts", () => {
  const graph = buildIntelligenceGraph([], {
    definitions: [{
      id: "analysis-a",
      name: "Analysis A",
      family: "spending",
      output: "spending_state",
      inputs: ["canonical_transactions"],
      purpose: "Inspect observed spending",
      evidence_ready: true,
    } as any],
  });

  const analysis = graph.nodes.find(node => node.id === "analysis:analysis-a");
  assert.equal(analysis?.observed, false);
  assert.ok(graph.nodes.some(node => node.id === "state:canonical_transactions" && node.observed));
  assert.ok(graph.nodes.some(node => node.id === "state:spending_state" && node.observed));
});
