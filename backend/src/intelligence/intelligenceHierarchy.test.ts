import assert from "node:assert/strict";
import test from "node:test";
import { IRIS_DOMAIN_SUBDOMAINS, IRIS_FORMAL_LEVELS, IRIS_HIGHER_ORDER_DEFINITIONS, buildRecursiveIntelligenceHierarchy } from "./intelligenceHierarchy.js";
import { IRIS_ANALYSIS_ATLAS } from "./analysisAtlas.js";

test("Iris exposes twelve formal intelligence levels", () => {
  assert.equal(IRIS_FORMAL_LEVELS.length, 12);
  assert.deepEqual(IRIS_FORMAL_LEVELS.map(l => l.level), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.equal(IRIS_FORMAL_LEVELS[0].name, "IRIS");
  assert.equal(IRIS_FORMAL_LEVELS[11].name, "Meta-Intelligence");
});

test("all eight provider domains have explicit subordinate capability taxonomies", () => {
  assert.deepEqual(IRIS_FORMAL_LEVELS[1].governs, ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"]);
  for (const domain of IRIS_FORMAL_LEVELS[1].governs) assert.ok((IRIS_DOMAIN_SUBDOMAINS[domain] ?? []).length > 0);
});

test("Levels 8-12 are materialized as governed capabilities without provider evidence fabrication", () => {
  assert.equal(IRIS_HIGHER_ORDER_DEFINITIONS.length, 5);
  assert.deepEqual(IRIS_HIGHER_ORDER_DEFINITIONS.map(d => d.formal_level), [8, 9, 10, 11, 12]);
  const hierarchy = buildRecursiveIntelligenceHierarchy(IRIS_ANALYSIS_ATLAS.map(d => ({ ...d, evidence_ready: true })), { maxGeneratedNodes: 3000 });
  assert.equal(hierarchy.formal_levels.length, 12);
  for (const level of [8, 9, 10, 11, 12]) assert.ok(hierarchy.nodes.some(n => n.level === level));
  assert.equal(hierarchy.generated_without_financial_mutation, true);
  assert.equal(hierarchy.generated_without_provider_mutation, true);
  assert.equal(hierarchy.runtime_safeguard.does_not_define_intelligence_depth, true);
});

test("recursive hierarchy can exceed a single analytical layer without a fixed semantic depth ceiling", () => {
  const hierarchy = buildRecursiveIntelligenceHierarchy(IRIS_ANALYSIS_ATLAS.map(d => ({ ...d, evidence_ready: true })), { maxGeneratedNodes: 1500 });
  assert.equal(hierarchy.semantic_depth_policy.startsWith("Unlimited subordinate depth"), true);
  assert.ok(hierarchy.counts.generated_nodes > 0);
  assert.ok(hierarchy.counts.deepest_generated_path > 1);
});
