import assert from "node:assert/strict";
import test from "node:test";
import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_AUTHORITATIVE_DOMAINS } from "./irisAuthoritativeDomainCoverage.js";
import { auditIrisAuthoritativeDomainGates } from "./irisAuthoritativeDomainGates.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type FixtureRow = Record<string, unknown>;

const USER_ID = "fixture-user";
const RUN_ID = "fixture-run";
const EXECUTION_ID = "fixture-execution";

function buildSnapshot(brokenDomain: string | null = null) {
  const familyRows: FixtureRow[] = IRIS_AUTHORITATIVE_DOMAINS.map((domain, index) => ({
    id: `fixture:family:${index}`,
    key: domain.nodeKey,
    node_type: "data_family",
    active: true,
  }));
  const sourceFields: FixtureRow[] = IRIS_AUTHORITATIVE_DOMAINS.map((domain, index) => ({
    id: `fixture:source-field:${index}`,
    family_node_id: `fixture:family:${index}`,
    product: domain.product,
    active: true,
  }));
  const observations: FixtureRow[] = IRIS_AUTHORITATIVE_DOMAINS.map((domain) => ({
    id: `fixture:observation:${domain.domain}`,
    product: domain.product,
    evidence_state: "observed",
    raw_observation_id: `fixture:raw:${domain.domain}`,
    user_id: USER_ID,
  }));

  const runEvidence: FixtureRow[] = [];
  const lineage: FixtureRow[] = [];
  const runtimeNodes: FixtureRow[] = [];
  const proofs: FixtureRow[] = [];

  for (const domain of IRIS_AUTHORITATIVE_DOMAINS) {
    const slug = domain.domain;
    const temporalEvidence = `fixture:evidence:${slug}:temporal`;
    const analysisEvidence = `fixture:evidence:${slug}:analysis`;
    const behavioralEvidence = `fixture:evidence:${slug}:behavioral`;
    const temporalNode = `fixture:node:${slug}:temporal`;
    const analysisNode = `fixture:node:${slug}:analysis`;
    const behavioralNode = `fixture:node:${slug}:behavioral`;

    if (brokenDomain !== slug) {
      for (const [capability, evidenceId, nodeId] of [
        ["temporal", temporalEvidence, temporalNode],
        ["analysis", analysisEvidence, analysisNode],
        ["behavioral", behavioralEvidence, behavioralNode],
      ] as const) {
        runEvidence.push({ id: evidenceId, product: domain.product, raw_observation_id: `fixture:raw:${slug}`, source_field_id: `fixture:source-field:${IRIS_AUTHORITATIVE_DOMAINS.findIndex((d) => d.domain === slug)}` });
        lineage.push({ lineage_role: "SOURCE_EVIDENCE", source_type: "run_evidence", source_id: evidenceId, destination_type: "intelligence_node", destination_id: nodeId, evidence_state: "observed" });
        runtimeNodes.push({ id: nodeId, capability_id: capability, intelligence_key: capability, evidence_state: "CALCULATED", recursive_ancestry: capability === "temporal" ? [] : capability === "analysis" ? [temporalNode] : [temporalNode, analysisNode], upstream_node_ids: capability === "temporal" ? [] : capability === "analysis" ? [temporalNode] : [analysisNode] });
      }

      lineage.push(
        { lineage_role: "DEPENDENCY_INPUT", source_type: "intelligence_node", source_id: temporalNode, destination_type: "intelligence_node", destination_id: analysisNode, evidence_state: "CALCULATED" },
        { lineage_role: "DEPENDENCY_INPUT", source_type: "intelligence_node", source_id: analysisNode, destination_type: "intelligence_node", destination_id: behavioralNode, evidence_state: "CALCULATED" },
      );

      proofs.push(
        { capability_id: "analysis", consumed_dependency_ids: ["temporal"], consumed_dependency_hashes: { temporal: "fixture-hash:temporal" }, consumed_dependency_paths: { temporal: ["root.result"] }, output_hash: "fixture-hash:analysis", proof_version: "1.2.0" },
        { capability_id: "behavioral", consumed_dependency_ids: ["analysis"], consumed_dependency_hashes: { analysis: "fixture-hash:analysis" }, consumed_dependency_paths: { analysis: ["root.result"] }, output_hash: "fixture-hash:behavioral", proof_version: "1.2.0" },
      );
    }
  }

  return { familyRows, sourceFields, observations, runEvidence, lineage, runtimeNodes, proofs };
}

function installReadOnlySupabaseFixture(snapshot: ReturnType<typeof buildSnapshot>) {
  const client = supabaseAdmin as unknown as { from: (table: string) => unknown };
  const originalFrom = client.from;
  client.from = ((table: string) => {
    const dataByTable: Record<string, FixtureRow[]> = {
      iris_intelligence_nodes: snapshot.familyRows,
      iris_intelligence_source_fields: snapshot.sourceFields,
      iris_source_field_observations: snapshot.observations,
      iris_run_evidence: snapshot.runEvidence,
      iris_execution_lineage: snapshot.lineage,
      iris_user_intelligence_nodes: snapshot.runtimeNodes,
      iris_semantic_dependency_proofs: snapshot.proofs,
    };
    const data = dataByTable[table] ?? [];
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.in = () => builder;
    builder.eq = () => builder;
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null }));
    return builder;
  }) as typeof client.from;

  return () => { client.from = originalFrom; };
}

const reportDependencyGraph: IrisReportDependency[] = [{
  report_id: "fixture-report",
  analysis_definition_id: "fixture-analysis",
  feature_ids: [],
  required_evidence_keys: ["behavioral"],
  resolution_state: "definition_only",
  upstream_intelligence_node_ids: [],
}];

test("runs the actual eight-domain gate evaluator through forward, recursive, semantic, and reverse proof paths", async () => {
  const restore = installReadOnlySupabaseFixture(buildSnapshot());
  try {
    const audit = await auditIrisAuthoritativeDomainGates({ userId: USER_ID, runId: RUN_ID, executionId: EXECUTION_ID, reportDependencyGraph });
    assert.equal(audit.completeness.domain_count, 8);
    assert.equal(audit.completeness.runtime_gates_passed, 8);
    assert.equal(audit.completeness.all_runtime_gates_passed, true);

    for (const domain of audit.domains) {
      assert.equal(domain.runtime_gate_passed, true, `${domain.domain}: ${domain.failures.join(",")}`);
      assert.equal(domain.states.FORWARD_TRAVERSAL_PROVEN, true);
      assert.equal(domain.states.SEMANTIC_SUFFICIENCY_PROVEN, true);
      assert.equal(domain.states.REVERSE_TRAVERSAL_PROVEN, true);
      assert.equal(domain.states.REPORT_TRAVERSAL_PROVEN, true);
      assert.equal(domain.counts.evidence_bound_runtime_nodes, 3);
      assert.equal(domain.counts.semantic_proofs, 2);
      assert.deepEqual(domain.capability_ids, ["analysis", "behavioral", "temporal"]);
      assert.deepEqual(domain.satisfied_report_ids, ["fixture-report"]);
    }
  } finally {
    restore();
  }
});

test("fails closed when one domain has no run-bound provider evidence", async () => {
  const brokenDomain = "transactions";
  const restore = installReadOnlySupabaseFixture(buildSnapshot(brokenDomain));
  try {
    const audit = await auditIrisAuthoritativeDomainGates({ userId: USER_ID, runId: RUN_ID, executionId: EXECUTION_ID, reportDependencyGraph });
    assert.equal(audit.completeness.runtime_gates_passed, 7);
    assert.equal(audit.completeness.all_runtime_gates_passed, false);

    const broken = audit.domains.find((domain) => domain.domain === brokenDomain)!;
    assert.equal(broken.runtime_gate_passed, false);
    assert.equal(broken.states.RUN_EVIDENCE_BOUND, false);
    assert.equal(broken.states.FORWARD_TRAVERSAL_PROVEN, false);
    assert.equal(broken.states.REVERSE_TRAVERSAL_PROVEN, false);
    assert.equal(broken.states.REPORT_TRAVERSAL_PROVEN, false);
    assert.ok(broken.failures.includes("run_evidence_not_present"));
  } finally {
    restore();
  }
});

test("does not use fixture evidence from another execution boundary", async () => {
  const snapshot = buildSnapshot();
  const restore = installReadOnlySupabaseFixture(snapshot);
  try {
    const audit = await auditIrisAuthoritativeDomainGates({ userId: "different-user", runId: RUN_ID, executionId: EXECUTION_ID, reportDependencyGraph });
    assert.equal(audit.completeness.runtime_gates_passed, 0);
    assert.equal(audit.completeness.all_runtime_gates_passed, false);
    assert.ok(audit.domains.every((domain) => !domain.runtime_gate_passed));
  } finally {
    restore();
  }
});
