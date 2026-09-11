import assert from "node:assert/strict";
import test from "node:test";
import { IRIS_AUTHORITATIVE_DOMAINS } from "./irisAuthoritativeDomainCoverage.js";
import { IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES } from "./irisAuthoritativeDomainGateFixtures.js";

test("provides one provider-derived read-only lineage fixture for every authoritative domain", () => {
  assert.equal(IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES.length, IRIS_AUTHORITATIVE_DOMAINS.length);
  assert.deepEqual(
    IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES.map((fixture) => fixture.domain),
    IRIS_AUTHORITATIVE_DOMAINS.map((domain) => domain.domain),
  );
});

test("every domain fixture proves provider observation to intelligence forward lineage", () => {
  for (const fixture of IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES) {
    const sourceEvidenceEdge = fixture.forward_lineage.find((edge) => edge.lineage_role === "SOURCE_EVIDENCE");
    assert.ok(sourceEvidenceEdge, `${fixture.domain}: missing SOURCE_EVIDENCE edge`);
    assert.equal(sourceEvidenceEdge.source_symbolic_id, fixture.run_evidence.symbolic_id);
    assert.equal(sourceEvidenceEdge.destination_symbolic_id, fixture.recursive_nodes[0].symbolic_id);

    assert.equal(fixture.observation.evidence_state, "observed");
    assert.equal(fixture.run_evidence.source_field_symbolic_id, fixture.source_field.symbolic_id);
    assert.equal(fixture.run_evidence.raw_observation_symbol, fixture.observation.raw_observation_symbol);
    assert.equal(fixture.provider, "plaid");
  }
});

test("every domain fixture proves recursive ancestry without a semantic depth ceiling", () => {
  for (const fixture of IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES) {
    assert.equal(fixture.recursive_nodes.length, 2, `${fixture.domain}: expected source and derived nodes`);

    const sourceNode = fixture.recursive_nodes[0];
    const derivedNode = fixture.recursive_nodes[1];

    assert.deepEqual(sourceNode.upstream_symbolic_ids, []);
    assert.deepEqual(derivedNode.upstream_symbolic_ids, [sourceNode.symbolic_id]);

    const dependencyEdge = fixture.forward_lineage.find((edge) => edge.lineage_role === "DEPENDENCY_INPUT");
    assert.ok(dependencyEdge, `${fixture.domain}: missing recursive DEPENDENCY_INPUT edge`);
    assert.equal(dependencyEdge.source_symbolic_id, sourceNode.symbolic_id);
    assert.equal(dependencyEdge.destination_symbolic_id, derivedNode.symbolic_id);
  }
});

test("every domain fixture proves reverse reachability from intelligence back to a report dependency", () => {
  for (const fixture of IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES) {
    const reachable = new Set(fixture.reverse_report.reachable_from_node_symbolic_ids);
    assert.ok(reachable.has(fixture.recursive_nodes[0].symbolic_id), `${fixture.domain}: source node not reverse-reachable`);
    assert.ok(reachable.has(fixture.recursive_nodes[1].symbolic_id), `${fixture.domain}: derived node not reverse-reachable`);
    assert.match(fixture.reverse_report.report_dependency_key, /^fixture:[a-z0-9_]+:report_dependency$/);
  }
});

test("domain fixtures cannot accidentally cross provider domains", () => {
  const products = new Set(IRIS_AUTHORITATIVE_DOMAINS.map((domain) => domain.product));
  const nodeKeys = new Set(IRIS_AUTHORITATIVE_DOMAINS.map((domain) => domain.nodeKey));

  for (const fixture of IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES) {
    assert.ok(products.has(fixture.product));
    assert.ok(nodeKeys.has(fixture.family_node_key));
    assert.match(fixture.source_field.symbolic_id, new RegExp(`^fixture:${fixture.domain.replace(/[^a-z0-9]+/g, "_")}:`));
    assert.match(fixture.observation.raw_observation_symbol, new RegExp(`^fixture:${fixture.domain.replace(/[^a-z0-9]+/g, "_")}:`));
  }
});
