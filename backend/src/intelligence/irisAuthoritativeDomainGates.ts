import { supabaseAdmin } from "../config/supabase.js";
import { buildIrisReportDependencyGraph } from "./irisReportDependencyGraph.js";
import { evaluateIrisReportSemanticConsumption } from "./irisReportSemanticConsumption.js";
import { getSemanticDependencyContract } from "./semanticDependencyContract.js";
import { resolveIrisEvidenceToReports } from "./irisEvidenceToReportTraversal.js";
import { IRIS_AUTHORITATIVE_DOMAINS } from "./irisAuthoritativeDomainCoverage.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

type RuntimeNodeRow = {
  id: string;
  capability_id: string | null;
  intelligence_key: string | null;
  evidence_state: CapabilityOperatorResult["evidence_state"];
};

type RunEvidenceRow = {
  id: string;
  product: string | null;
  raw_observation_id: string | null;
  source_field_id: string | null;
};

type LineageRow = {
  lineage_role: string;
  source_type: string;
  source_id: string;
  destination_type: string;
  destination_id: string;
};

type ProofRow = SemanticDependencyProof & { capability_id: string };
export type IrisAuthoritativeDomainGateDatabase = Pick<typeof supabaseAdmin, "from">;

export type IrisAuthoritativeDomainGateState =
  | "DOMAIN_DEFINED"
  | "FAMILY_NODE_REGISTERED"
  | "SOURCE_FIELDS_REGISTERED"
  | "SOURCE_OBSERVATIONS_PRESENT"
  | "RUN_EVIDENCE_BOUND"
  | "FORWARD_TRAVERSAL_PROVEN"
  | "REVERSE_TRAVERSAL_PROVEN"
  | "REPORT_TRAVERSAL_PROVEN"
  | "SEMANTIC_SUFFICIENCY_PROVEN"
  | "CERTIFICATION_ELIGIBLE";

export type IrisAuthoritativeDomainGate = {
  domain: string;
  product: string;
  node_key: string;
  states: Record<IrisAuthoritativeDomainGateState, boolean>;
  counts: {
    family_nodes: number;
    registered_source_fields: number;
    observed_source_observations: number;
    run_evidence: number;
    evidence_bound_runtime_nodes: number;
    semantic_proofs: number;
    reachable_reports: number;
    satisfied_reports: number;
  };
  runtime_node_ids: string[];
  run_evidence_ids: string[];
  reachable_report_ids: string[];
  satisfied_report_ids: string[];
  capability_ids: string[];
  semantic_sufficiency_failures: string[];
  failures: string[];
  runtime_gate_passed: boolean;
};

export type IrisAuthoritativeDomainGateAudit = {
  boundary: string;
  certification_boundary: string;
  user_id: string;
  run_id: string;
  execution_id: string;
  domains: IrisAuthoritativeDomainGate[];
  completeness: {
    domain_count: number;
    runtime_gates_passed: number;
    all_runtime_gates_passed: boolean;
  };
};

const EMPTY_STATES = (): Record<IrisAuthoritativeDomainGateState, boolean> => ({
  DOMAIN_DEFINED: true,
  FAMILY_NODE_REGISTERED: false,
  SOURCE_FIELDS_REGISTERED: false,
  SOURCE_OBSERVATIONS_PRESENT: false,
  RUN_EVIDENCE_BOUND: false,
  FORWARD_TRAVERSAL_PROVEN: false,
  REVERSE_TRAVERSAL_PROVEN: false,
  REPORT_TRAVERSAL_PROVEN: false,
  SEMANTIC_SUFFICIENCY_PROVEN: false,
  CERTIFICATION_ELIGIBLE: false,
});

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function buildDomainDependency(definition: (typeof IRIS_AUTHORITATIVE_DOMAINS)[number]): IrisReportDependency {
  return {
    report_id: `domain-gate:${definition.domain}`,
    analysis_definition_id: `domain-gate:${definition.domain}`,
    feature_ids: [],
    required_evidence_keys: [],
    resolution_state: "definition_only",
    upstream_intelligence_node_ids: [],
  };
}

function evaluateSemanticSufficiency(
  definition: (typeof IRIS_AUTHORITATIVE_DOMAINS)[number],
  capabilityIds: string[],
  proofs: ProofRow[],
  evidenceStates: Record<string, CapabilityOperatorResult["evidence_state"]>,
): { certified: boolean; failures: string[] } {
  const missingContracts = capabilityIds.filter((id) => !getSemanticDependencyContract(id));
  if (missingContracts.length) {
    return {
      certified: false,
      failures: uniqueSorted(missingContracts.map((id) => `${definition.domain}:${id}:semantic_contract_missing`)),
    };
  }

  const dependency = buildDomainDependency(definition);
  const result = evaluateIrisReportSemanticConsumption({
    dependency,
    capabilityIds,
    proofs,
    capabilityEvidenceStates: evidenceStates,
  });
  return {
    certified: result.semantic_sufficiency_certified,
    failures: uniqueSorted(result.semantic_sufficiency_failures.map((failure) => `${definition.domain}:${failure}`)),
  };
}

/**
 * Read-only executable gate for each authoritative Level-2 domain.
 *
 * A gate never creates evidence, intelligence nodes, observations, lineage,
 * reports, or certifications. It evaluates only an exact user/run/execution
 * boundary and fails closed when a required state cannot be proven.
 */
export async function auditIrisAuthoritativeDomainGates(input: {
  userId: string;
  runId: string;
  executionId: string;
  reportDependencyGraph?: IrisReportDependency[];
  database?: IrisAuthoritativeDomainGateDatabase;
}): Promise<IrisAuthoritativeDomainGateAudit> {
  const reportDependencyGraph = input.reportDependencyGraph ?? buildIrisReportDependencyGraph();
  const database = input.database ?? supabaseAdmin;

  const { data: familyRows, error: familyError } = await database
    .from("iris_intelligence_nodes")
    .select("id,key,node_type,active")
    .in("key", IRIS_AUTHORITATIVE_DOMAINS.map((definition) => definition.nodeKey));
  if (familyError) throw new Error(`IRIS_DOMAIN_GATE_FAMILY_LOOKUP_FAILED: ${familyError.message}`);

  const activeFamilyByKey = new Map(
    (familyRows ?? [])
      .filter((row: { node_type: string; active: boolean }) => row.node_type === "data_family" && row.active)
      .map((row: { id: string; key: string }) => [row.key, row.id]),
  );

  const { data: sourceFields, error: sourceFieldError } = await database
    .from("iris_intelligence_source_fields")
    .select("id,family_node_id,product,active")
    .eq("active", true);
  if (sourceFieldError) throw new Error(`IRIS_DOMAIN_GATE_SOURCE_FIELD_LOOKUP_FAILED: ${sourceFieldError.message}`);

  const registeredFieldsByFamily = new Map<string, string[]>();
  for (const row of (sourceFields ?? []) as Array<{ id: string; family_node_id: string; product: string; active: boolean }>) {
    const values = registeredFieldsByFamily.get(row.family_node_id) ?? [];
    values.push(row.id);
    registeredFieldsByFamily.set(row.family_node_id, values);
  }

  const { data: observations, error: observationError } = await database
    .from("iris_source_field_observations")
    .select("id,product,evidence_state,raw_observation_id")
    .eq("user_id", input.userId)
    .eq("evidence_state", "observed");
  if (observationError) throw new Error(`IRIS_DOMAIN_GATE_SOURCE_OBSERVATION_LOOKUP_FAILED: ${observationError.message}`);

  const { data: runEvidenceRows, error: runEvidenceError } = await database
    .from("iris_run_evidence")
    .select("id,product,raw_observation_id,source_field_id")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId);
  if (runEvidenceError) throw new Error(`IRIS_DOMAIN_GATE_RUN_EVIDENCE_LOOKUP_FAILED: ${runEvidenceError.message}`);

  const { data: lineageRows, error: lineageError } = await database
    .from("iris_execution_lineage")
    .select("lineage_role,source_type,source_id,destination_type,destination_id")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (lineageError) throw new Error(`IRIS_DOMAIN_GATE_LINEAGE_LOOKUP_FAILED: ${lineageError.message}`);

  const { data: runtimeNodeRows, error: runtimeNodeError } = await database
    .from("iris_user_intelligence_nodes")
    .select("id,capability_id,intelligence_key,evidence_state")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (runtimeNodeError) throw new Error(`IRIS_DOMAIN_GATE_RUNTIME_NODE_LOOKUP_FAILED: ${runtimeNodeError.message}`);

  const { data: proofRows, error: proofError } = await database
    .from("iris_semantic_dependency_proofs")
    .select("capability_id,consumed_dependency_ids,consumed_dependency_hashes,consumed_dependency_paths,output_hash,proof_version")
    .eq("user_id", input.userId)
    .eq("run_id", input.runId)
    .eq("execution_id", input.executionId);
  if (proofError) throw new Error(`IRIS_DOMAIN_GATE_SEMANTIC_PROOF_LOOKUP_FAILED: ${proofError.message}`);

  const observationsByProduct = new Map<string, number>();
  for (const row of (observations ?? []) as Array<{ product: string }>) observationsByProduct.set(row.product, (observationsByProduct.get(row.product) ?? 0) + 1);

  const runEvidence = (runEvidenceRows ?? []) as RunEvidenceRow[];
  const lineage = (lineageRows ?? []) as LineageRow[];
  const runtimeNodes = (runtimeNodeRows ?? []) as RuntimeNodeRow[];
  const proofs = (proofRows ?? []) as ProofRow[];
  const nodeById = new Map(runtimeNodes.map((node) => [node.id, node]));

  const domains: IrisAuthoritativeDomainGate[] = [];

  for (const definition of IRIS_AUTHORITATIVE_DOMAINS) {
    const states = EMPTY_STATES();
    const failures: string[] = [];
    const familyNodeId = activeFamilyByKey.get(definition.nodeKey) ?? null;
    const registeredSourceFields = familyNodeId ? registeredFieldsByFamily.get(familyNodeId) ?? [] : [];
    const observedSourceObservations = observationsByProduct.get(definition.product) ?? 0;
    const domainRunEvidence = runEvidence.filter((row) => row.product === definition.product);
    const domainRunEvidenceIds = uniqueSorted(domainRunEvidence.map((row) => row.id));
    const domainRunEvidenceSet = new Set(domainRunEvidenceIds);
    const boundNodeIds = uniqueSorted(
      lineage
        .filter((row) => row.lineage_role === "SOURCE_EVIDENCE" && row.source_type === "run_evidence" && domainRunEvidenceSet.has(row.source_id) && row.destination_type === "intelligence_node" && nodeById.has(row.destination_id))
        .map((row) => row.destination_id),
    );
    const boundNodes = boundNodeIds.map((id) => nodeById.get(id)).filter((node): node is RuntimeNodeRow => !!node);
    const capabilityIds = uniqueSorted(boundNodes.map((node) => node.capability_id).filter((id): id is string => typeof id === "string" && id.length > 0));
    const evidenceStates = Object.fromEntries(boundNodes.filter((node): node is RuntimeNodeRow & { capability_id: string } => typeof node.capability_id === "string").map((node) => [node.capability_id, node.evidence_state]));
    const domainProofs = proofs.filter((proof) => capabilityIds.includes(proof.capability_id));

    states.FAMILY_NODE_REGISTERED = familyNodeId !== null;
    states.SOURCE_FIELDS_REGISTERED = registeredSourceFields.length > 0;
    states.SOURCE_OBSERVATIONS_PRESENT = observedSourceObservations > 0;
    states.RUN_EVIDENCE_BOUND = domainRunEvidenceIds.length > 0;
    states.FORWARD_TRAVERSAL_PROVEN = domainRunEvidenceIds.length > 0 && boundNodeIds.length > 0 && boundNodeIds.length >= domainRunEvidenceIds.length;

    if (!states.FAMILY_NODE_REGISTERED) failures.push("family_node_not_registered");
    if (!states.SOURCE_FIELDS_REGISTERED) failures.push("source_fields_not_registered");
    if (!states.SOURCE_OBSERVATIONS_PRESENT) failures.push("source_observations_not_present");
    if (!states.RUN_EVIDENCE_BOUND) failures.push("run_evidence_not_present");
    if (!states.FORWARD_TRAVERSAL_PROVEN) failures.push("forward_evidence_to_intelligence_traversal_not_proven");

    const semantic = evaluateSemanticSufficiency(definition, capabilityIds, domainProofs, evidenceStates);
    states.SEMANTIC_SUFFICIENCY_PROVEN = states.FORWARD_TRAVERSAL_PROVEN && semantic.certified;
    failures.push(...semantic.failures);
    if (!states.SEMANTIC_SUFFICIENCY_PROVEN && semantic.failures.length === 0) failures.push("semantic_sufficiency_not_proven");

    let reachableReports: string[] = [];
    let satisfiedReports: string[] = [];
    if (domainRunEvidenceIds.length > 0) {
      const traversal = await resolveIrisEvidenceToReports({
        userId: input.userId,
        runId: input.runId,
        executionId: input.executionId,
        evidenceIds: domainRunEvidenceIds,
        reportDependencyGraph,
        database,
      });
      reachableReports = traversal.reports.filter((report) => report.state !== "unresolved").map((report) => report.report_id).sort();
      satisfiedReports = traversal.reports.filter((report) => report.state === "satisfied").map((report) => report.report_id).sort();
    }

    states.REVERSE_TRAVERSAL_PROVEN = domainRunEvidenceIds.length > 0 && boundNodeIds.length > 0;
    states.REPORT_TRAVERSAL_PROVEN = satisfiedReports.length > 0;
    states.REVERSE_TRAVERSAL_PROVEN = states.REVERSE_TRAVERSAL_PROVEN && reachableReports.length > 0;
    if (!states.REVERSE_TRAVERSAL_PROVEN) failures.push("reverse_intelligence_traversal_not_proven");
    if (!states.REPORT_TRAVERSAL_PROVEN) failures.push("report_dependency_traversal_not_proven");

    states.CERTIFICATION_ELIGIBLE = Object.values(states).every(Boolean);
    if (!states.CERTIFICATION_ELIGIBLE) failures.push("runtime_gate_requirements_incomplete");

    domains.push({
      domain: definition.domain,
      product: definition.product,
      node_key: definition.nodeKey,
      states,
      counts: {
        family_nodes: familyNodeId ? 1 : 0,
        registered_source_fields: registeredSourceFields.length,
        observed_source_observations: observedSourceObservations,
        run_evidence: domainRunEvidenceIds.length,
        evidence_bound_runtime_nodes: boundNodeIds.length,
        semantic_proofs: domainProofs.length,
        reachable_reports: reachableReports.length,
        satisfied_reports: satisfiedReports.length,
      },
      runtime_node_ids: boundNodeIds,
      run_evidence_ids: domainRunEvidenceIds,
      reachable_report_ids: reachableReports,
      satisfied_report_ids: satisfiedReports,
      capability_ids: capabilityIds,
      semantic_sufficiency_failures: semantic.failures,
      failures: uniqueSorted(failures),
      runtime_gate_passed: states.CERTIFICATION_ELIGIBLE,
    });
  }

  const runtimeGatesPassed = domains.filter((domain) => domain.runtime_gate_passed).length;
  return {
    boundary: "Exact user + run + execution boundary. Read-only evaluation; no evidence, observations, intelligence nodes, reports, or certifications are created or changed.",
    certification_boundary: "A passed runtime gate means every declared executable gate criterion was proven for this exact execution. It does not assert mathematical truth, causation, prediction accuracy, or future outcomes.",
    user_id: input.userId,
    run_id: input.runId,
    execution_id: input.executionId,
    domains,
    completeness: {
      domain_count: domains.length,
      runtime_gates_passed: runtimeGatesPassed,
      all_runtime_gates_passed: runtimeGatesPassed === domains.length,
    },
  };
}
