import assert from "node:assert/strict";
import test from "node:test";
import { buildIrisGovernance } from "./irisGovernance.js";

const products = ["auth","transactions","balance","identity","assets","liabilities","investments","statements"];

test("Iris governance requires all eight canonical domains on one Item", () => {
  const result = buildIrisGovernance({
    providerDomainIntelligence: { evidence_ready: true, selected_item_id: "item-1", utilization: { products, same_item: true } },
    sourceFidelity: { status: "pass", ready_for_higher_order_intelligence: true },
    integrity: { valid: true }, evidenceGraph: { nodes: [] }, intelligenceGraph: { nodes: [] }, investigations: { investigations: [] },
    composition: { evidence_gate: { status: "pass" } }, layerComposition: {}, higherOrderSynthesis: { findings: [] }, adversarialReasoning: { findings: [] }, counterfactualIntelligence: { findings: [] }, metaIntelligence: {}, atlasDefinitions: [],
  });
  assert.equal(result.status, "governance_clear");
  assert.equal(result.provider_chain.complete, true);
  assert.equal(result.composition_authority.materialized_subset_count_for_eight_provider_domains, 255);
  assert.equal(result.composition_authority.materialized_ordered_provider_sequences_for_eight_domains, 109600);
});

test("Iris governance raises an alert rather than certifying incomplete evidence", () => {
  const result = buildIrisGovernance({
    providerDomainIntelligence: { evidence_ready: false, selected_item_id: null, utilization: { products: ["balance"], same_item: false } },
    sourceFidelity: { status: "warn", ready_for_higher_order_intelligence: false },
    integrity: { valid: true }, evidenceGraph: { nodes: [] }, intelligenceGraph: { nodes: [] }, investigations: { investigations: [] },
    composition: { evidence_gate: { status: "warn" } }, layerComposition: {}, higherOrderSynthesis: { findings: [] }, adversarialReasoning: { findings: [] }, counterfactualIntelligence: { findings: [] }, metaIntelligence: {}, atlasDefinitions: [],
  });
  assert.equal(result.status, "governance_alert");
  assert.ok(result.alerts.length >= 3);
  assert.equal(result.certification.fully_certified, false);
});
