import assert from "node:assert/strict";
import test from "node:test";
import { IRIS_AUTHORITATIVE_DOMAINS } from "./irisAuthoritativeDomainCoverage.js";
import { auditIrisAuthoritativeDomainGates, type IrisAuthoritativeDomainGateDatabase } from "./irisAuthoritativeDomainGates.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

type FixtureRow = Record<string, unknown>;
type FixtureOptions = {
  missingDomain?: string | null;
  missingSourceFields?: boolean;
  missingObservations?: boolean;
  missingSourceEvidenceLineage?: boolean;
  missingRecursiveLineage?: boolean;
  missingSemanticProofs?: boolean;
  insufficientCapability?: string | null;
};

const USER_ID = "fixture-user";
const RUN_ID = "fixture-run";
const EXECUTION_ID = "fixture-execution";

function buildSnapshot(options: FixtureOptions = {}) {
  const familyRows: FixtureRow[] = IRIS_AUTHORITATIVE_DOMAINS.map((domain, index) => ({ id: `fixture:family:${index}`, key: domain.nodeKey, node_type: "data_family", active: true }));
  const sourceFields: FixtureRow[] = options.missingSourceFields
    ? []
    : IRIS_AUTHORITATIVE_DOMAINS.map((domain, index) => ({ id: `fixture:source-field:${index}`, family_node_id: `fixture:family:${index}`, product: domain.product, active: true }));
  const observations: FixtureRow[] = options.missingObservations
    ? []
    : IRIS_AUTHORITATIVE_DOMAINS.map((domain) => ({ id: `fixture:observation:${domain.domain}`, product: domain.product, evidence_state: "observed", raw_observation_id: `fixture:raw:${domain.domain}`, user_id: USER_ID }));
  const runEvidence: FixtureRow[] = [];
  const lineage: FixtureRow[] = [];
  const runtimeNodes: FixtureRow[] = [];
  const proofs: FixtureRow[] = [];

  if (options.missingDomain) {
    const index = IRIS_AUTHORITATIVE_DOMAINS.findIndex((domain) => domain.domain === options.missingDomain);
    if (index >= 0) familyRows.splice(index, 1);
  }

  for (const domain of IRIS_AUTHORITATIVE_DOMAINS) {
    const slug = domain.domain;
    if (options.missingDomain === slug) continue;
    const temporalEvidence = `fixture:evidence:${slug}:temporal`;
    const analysisEvidence = `fixture:evidence:${slug}:analysis`;
    const behavioralEvidence = `fixture:evidence:${slug}:behavioral`;
    const temporalNode = `fixture:node:${slug}:temporal`;
    const analysisNode = `fixture:node:${slug}:analysis`;
    const behavioralNode = `fixture:node:${slug}:behavioral`;

    for (const [capability, evidenceId, nodeId] of [["temporal", temporalEvidence, temporalNode], ["analysis", analysisEvidence, analysisNode], ["behavioral", behavioralEvidence, behavioralNode]] as const) {
      runEvidence.push({ id: evidenceId, product: domain.product, raw_observation_id: `fixture:raw:${slug}`, source_field_id: `fixture:source-field:${IRIS_AUTHORITATIVE_DOMAINS.findIndex((d) => d.domain === slug)}`, user_id: USER_ID, run_id: RUN_ID });
      if (!options.missingSourceEvidenceLineage) lineage.push({ user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, lineage_role: "SOURCE_EVIDENCE", source_type: "run_evidence", source_id: evidenceId, destination_type: "intelligence_node", destination_id: nodeId, evidence_state: "observed" });
      runtimeNodes.push({ user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, id: nodeId, capability_id: capability, intelligence_key: capability, evidence_state: options.insufficientCapability === capability ? "INSUFFICIENT_EVIDENCE" : "CALCULATED", recursive_ancestry: capability === "temporal" ? [] : capability === "analysis" ? [temporalNode] : [temporalNode, analysisNode], upstream_node_ids: capability === "temporal" ? [] : capability === "analysis" ? [temporalNode] : [analysisNode] });
    }

    if (!options.missingRecursiveLineage) {
      lineage.push(
        { user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, lineage_role: "DEPENDENCY_INPUT", source_type: "intelligence_node", source_id: temporalNode, destination_type: "intelligence_node", destination_id: analysisNode, evidence_state: "CALCULATED" },
        { user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, lineage_role: "DEPENDENCY_INPUT", source_type: "intelligence_node", source_id: analysisNode, destination_type: "intelligence_node", destination_id: behavioralNode, evidence_state: "CALCULATED" },
      );
    }

    if (!options.missingSemanticProofs) {
      proofs.push(
        { user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, capability_id: "analysis", consumed_dependency_ids: ["temporal"], consumed_dependency_hashes: { temporal: "fixture-hash:temporal" }, consumed_dependency_paths: { temporal: ["root.result"] }, output_hash: "fixture-hash:analysis", proof_version: "1.2.0" },
        { user_id: USER_ID, run_id: RUN_ID, execution_id: EXECUTION_ID, capability_id: "behavioral", consumed_dependency_ids: ["analysis"], consumed_dependency_hashes: { analysis: "fixture-hash:analysis" }, consumed_dependency_paths: { analysis: ["root.result"] }, output_hash: "fixture-hash:behavioral", proof_version: "1.2.0" },
      );
    }
  }
  return { familyRows, sourceFields, observations, runEvidence, lineage, runtimeNodes, proofs };
}

function createReadOnlySupabaseFixture(snapshot: ReturnType<typeof buildSnapshot>): IrisAuthoritativeDomainGateDatabase {
  const database = {
    from(table: string) {
      const dataByTable: Record<string, FixtureRow[]> = { iris_intelligence_nodes: snapshot.familyRows, iris_intelligence_source_fields: snapshot.sourceFields, iris_source_field_observations: snapshot.observations, iris_run_evidence: snapshot.runEvidence, iris_execution_lineage: snapshot.lineage, iris_user_intelligence_nodes: snapshot.runtimeNodes, iris_semantic_dependency_proofs: snapshot.proofs };
      let data = [...(dataByTable[table] ?? [])];
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.in = (column: string, values: unknown[]) => { data = data.filter((row) => values.includes(row[column])); return builder; };
      builder.eq = (column: string, value: unknown) => { data = data.filter((row) => row[column] === value); return builder; };
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null }));
      return builder;
    },
  } as unknown as IrisAuthoritativeDomainGateDatabase;
  return database;
}

const reportDependencyGraph: IrisReportDependency[] = [{ report_id: "fixture-report", analysis_definition_id: "fixture-analysis", feature_ids: [], required_evidence_keys: ["behavioral"], resolution_state: "definition_only", upstream_intelligence_node_ids: [] }];

async function audit(options: FixtureOptions = {}, userId = USER_ID) {
  return await auditIrisAuthoritativeDomainGates({ userId, runId: RUN_ID, executionId: EXECUTION_ID, reportDependencyGraph, database: createReadOnlySupabaseFixture(buildSnapshot(options)) });
}

test("runs the actual eight-domain gate evaluator through forward, recursive, semantic, and reverse proof paths", async () => {
  const result = await audit();
  assert.equal(result.completeness.domain_count, 8);
  assert.equal(result.completeness.runtime_gates_passed, 8, result.domains.map((domain) => `${domain.domain}:${domain.failures.join(",")}`).join(" | "));
  assert.equal(result.completeness.all_runtime_gates_passed, true);
  for (const domain of result.domains) {
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
});

test("fails closed when one domain has no run-bound provider evidence", async () => {
  const result = await audit({ missingDomain: "transactions" });
  assert.equal(result.completeness.runtime_gates_passed, 7);
  assert.equal(result.completeness.all_runtime_gates_passed, false);
  const broken = result.domains.find((domain) => domain.domain === "transactions")!;
  assert.equal(broken.runtime_gate_passed, false);
  assert.equal(broken.states.RUN_EVIDENCE_BOUND, false);
  assert.equal(broken.states.FORWARD_TRAVERSAL_PROVEN, false);
  assert.equal(broken.states.REVERSE_TRAVERSAL_PROVEN, false);
  assert.equal(broken.states.REPORT_TRAVERSAL_PROVEN, false);
  assert.ok(broken.failures.includes("run_evidence_not_present"));
});

test("fails closed for missing family registration, source fields, and observations", async () => {
  for (const options of [{ missingDomain: "balance" }, { missingSourceFields: true }, { missingObservations: true }]) {
    const result = await audit(options);
    assert.equal(result.completeness.all_runtime_gates_passed, false);
  }
});

test("fails closed when forward source-evidence or recursive lineage is missing", async () => {
  const sourceEvidenceMissing = await audit({ missingSourceEvidenceLineage: true });
  assert.equal(sourceEvidenceMissing.completeness.runtime_gates_passed, 0);

  const recursiveLineageMissing = await audit({ missingRecursiveLineage: true });
  assert.equal(recursiveLineageMissing.completeness.runtime_gates_passed, 0);
});

test("fails closed when semantic proof or semantic evidence state is insufficient", async () => {
  const missingProof = await audit({ missingSemanticProofs: true });
  assert.equal(missingProof.completeness.runtime_gates_passed, 0);

  const insufficient = await audit({ insufficientCapability: "analysis" });
  assert.equal(insufficient.completeness.runtime_gates_passed, 0);
  assert.ok(insufficient.domains.every((domain) => domain.semantic_sufficiency_failures.some((failure) => failure.includes("insufficient_evidence"))));
});

test("does not use fixture evidence from another execution boundary", async () => {
  const result = await audit({}, "different-user");
  assert.equal(result.completeness.runtime_gates_passed, 0);
  assert.equal(result.completeness.all_runtime_gates_passed, false);
  assert.ok(result.domains.every((domain) => !domain.runtime_gate_passed));
});
