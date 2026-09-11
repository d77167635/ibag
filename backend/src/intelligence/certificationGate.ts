import { supabaseAdmin } from "../config/supabase.js";
import { reconcileCanonicalTransactions } from "./canonicalReconciliation.js";

const REQUIRED_PROVIDER_DOMAINS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;

type GateCheck = { status: "PASS" | "FAIL"; details: string };
export type CertificationGateResult = {
  eligible: boolean;
  status: "PASS" | "FAIL";
  critical_failures: string[];
  checks: Record<string, GateCheck>;
  evidence_snapshot: Record<string, unknown>;
  reconciliation_snapshot: Record<string, unknown>;
};

/** Certification is evidence/lineage/execution validation of the recursive capability graph. It does not depend on the retired aggregate orchestrator shape. */
export async function evaluateCertificationGate({ runId, executionId, userId, inputHash, outputHash }: {
  runId: string; executionId: string; userId: string; inputHash: string; outputHash: string;
}): Promise<CertificationGateResult> {
  const checks: Record<string, GateCheck> = {};
  const critical_failures: string[] = [];
  const check = (key: string, ok: boolean, pass: string, fail: string) => {
    checks[key] = { status: ok ? "PASS" : "FAIL", details: ok ? pass : fail };
    if (!ok) critical_failures.push(key);
  };

  const [{ data: run }, { data: execution }, { data: evidence, error: evidenceError }, { data: outputs }, { count: productCount }, { data: currentProviderRows }, { data: accounts }, { data: canonicalTransactions }, { data: rawTransactions }] = await Promise.all([
    supabaseAdmin.from("iris_runs").select("id,user_id,as_of,evidence_boundary,evidence_version,evidence_manifest_hash,resource_budget,execution_policy").eq("id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("run_id,user_id,execution_state,input_hash,output_hash,resource_usage,input_manifest").eq("id", executionId).eq("run_id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_run_evidence").select("id,user_id,provider,product,raw_observation_id,evidence_hash,effective_at,acquired_at").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_execution_outputs").select("hash,evidence_state,value").eq("execution_id", executionId),
    supabaseAdmin.from("plaid_raw_product_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("item_id,product").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id,plaid_account_id").eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id,account_id,plaid_transaction_id,raw_transaction_id,is_active").eq("user_id", userId).eq("is_active", true),
    supabaseAdmin.from("plaid_raw_transactions").select("id,account_id,plaid_transaction_id,is_current,evidence_state").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);

  check("iris.execution.integrity", !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash && inputHash.length === 64 && outputHash.length === 64, "Execution identity, state, and hashes match.", "Execution identity, state, or hashes are invalid.");
  check("iris.evidence.ownership", !evidenceError && (evidence?.length ?? 0) > 0 && evidence!.every(e => e.user_id === userId && e.provider === "plaid" && !!e.evidence_hash && e.effective_at != null && e.acquired_at != null), "Run evidence is present, hashed, dated, and user-owned.", "Run evidence is missing, incomplete, unhashed, or ownership-invalid.");
  check("iris.evidence.boundary", !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash, "Explicit evidence boundary and manifest hash are persisted.", "Evidence boundary or manifest hash is missing.");

  const rawIds = (evidence ?? []).map(e => e.raw_observation_id).filter((id): id is string => typeof id === "string");
  const { data: lineage } = rawIds.length
    ? await supabaseAdmin.from("iris_data_lineage").select("id,user_id,source_id,destination_id,evidence_state").eq("user_id", userId).in("source_id", rawIds.slice(0, 5000)).limit(5000)
    : { data: [] as any[] };
  check("iris.lineage.present", (lineage?.length ?? 0) > 0 && lineage!.every(l => l.user_id === userId), "User-owned provider-to-intelligence lineage is attached to the run evidence boundary.", "No user-owned provider lineage is attached to the run evidence boundary.");

  const domainsByItem = new Map<string, Set<string>>();
  for (const row of currentProviderRows ?? []) {
    if (!row.item_id || !row.product) continue;
    const domains = domainsByItem.get(row.item_id) ?? new Set<string>();
    domains.add(row.product);
    domainsByItem.set(row.item_id, domains);
  }
  const completeItems = [...domainsByItem.entries()].filter(([, domains]) => REQUIRED_PROVIDER_DOMAINS.every(domain => domains.has(domain))).map(([itemId]) => itemId);
  const observedDomains = [...new Set((currentProviderRows ?? []).map(row => row.product).filter((product): product is string => typeof product === "string"))];
  const missingDomains = REQUIRED_PROVIDER_DOMAINS.filter(domain => !observedDomains.includes(domain));
  const selectedItemId = (run?.execution_policy as any)?.selected_item_id ?? (execution?.input_manifest as any)?.evidence_scope?.selectedItemId ?? null;
  const runEvidenceRaw = rawIds.length ? (await supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,effective_at,acquired_at,is_current,evidence_state").in("id", rawIds.slice(0, 5000)).eq("user_id", userId)).data ?? [] : [];
  const evidenceItemIds = [...new Set(runEvidenceRaw.map(row => row.item_id).filter((id): id is string => typeof id === "string"))];
  const evidenceMatchesSelectedItem = !selectedItemId || (evidenceItemIds.length > 0 && evidenceItemIds.every((id: string) => id === selectedItemId));
  const evidenceHasRequiredDomains = selectedItemId
    ? REQUIRED_PROVIDER_DOMAINS.every(domain => runEvidenceRaw.some(row => row.item_id === selectedItemId && row.product === domain && row.is_current === true && row.evidence_state === "observed"))
    : completeItems.length > 0;

  check("iris.evidence.eight_domains", completeItems.length > 0, `All eight canonical provider evidence domains are currently observed together on ${completeItems.length} Item(s).`, missingDomains.length ? `Full-intelligence certification requires one Item with all eight canonical domains. Missing observed domains: ${missingDomains.join(", ")}.` : "Eight domains exist, but no single Item has all eight current observed domains.");
  check("iris.evidence.same_item", evidenceMatchesSelectedItem && evidenceHasRequiredDomains, selectedItemId ? `Run evidence is bounded to selected Item ${selectedItemId} and contains all eight required current observed domains.` : "Run evidence is compatible with a complete canonical provider Item.", selectedItemId ? `Run evidence does not prove the selected Item ${selectedItemId} supplied all eight required current observed domains without cross-Item mixing.` : "Run evidence does not establish a single canonical provider Item boundary.");

  const output = outputs?.find(o => o.hash === outputHash);
  const graph = output?.value as any;
  const executed = Array.isArray(graph?.executed_capabilities) ? graph.executed_capabilities.filter((id: unknown): id is string => typeof id === "string") : [];
  const ordered = Array.isArray(graph?.ordered_capabilities) ? graph.ordered_capabilities.filter((id: unknown): id is string => typeof id === "string") : [];
  const results = graph?.results && typeof graph.results === "object" && !Array.isArray(graph.results) ? graph.results : null;
  const graphComplete = graph?.architecture_version === "IRIS_RECURSIVE_CAPABILITY_GRAPH_V2" && graph?.execution_status === "COMPLETED" && ordered.length > 0 && executed.length === ordered.length && !!results;
  check("iris.output.recursive_graph", !!output && output.evidence_state !== "OBSERVED" && graphComplete, "The persisted output is a completed recursive capability graph and is not misclassified as provider observation.", "The persisted output is missing, observed-state, incomplete, or not the governed recursive graph.");

  const missingResults = ordered.filter((id: string) => !results?.[id]);
  check("iris.output.dependency_closure", missingResults.length === 0 && executed.every((id: string) => results?.[id]?.capability_id === id), "Every planned capability has its corresponding executed result.", missingResults.length ? `Executed graph results are incomplete; missing capability outputs: ${missingResults.join(", ")}.` : "Executed capability identities do not match their persisted results.");

  const provenanceComplete = ordered.every((id: string) => {
    const value = results?.[id]?.result;
    const provenance = value?.provenance;
    return provenance && provenance.run_id === runId && provenance.evidence_manifest_hash === run?.evidence_manifest_hash && provenance.provider_observations_created === false && provenance.financial_values_created === false && provenance.money_movement_executed === false;
  });
  check("iris.output.provenance", provenanceComplete, "Every executed capability result carries run-bound provenance and explicitly records that it created no financial truth or money movement.", "At least one executed capability result lacks complete run-bound provenance or contains unsafe provenance state.");

  const dependencyClosure = ordered.every((id: string) => {
    const result = results?.[id];
    const dependencies = planDependencies(graph, id);
    return dependencies.every((dep: string) => !!results?.[dep] && result?.result?.provenance?.dependency_capabilities?.some((entry: any) => entry.capability_id === dep));
  });
  check("iris.output.lineage_closure", dependencyClosure, "Capability dependency inputs are preserved through downstream provenance.", "At least one dependency edge is not represented in downstream capability provenance.");

  const canonicalReconciliation = reconcileCanonicalTransactions(
    (accounts ?? []).map(row => ({ id: row.id, item_id: row.item_id, plaid_account_id: row.plaid_account_id })),
    (canonicalTransactions ?? []).map(row => ({ id: row.id, account_id: row.account_id, plaid_transaction_id: row.plaid_transaction_id, raw_transaction_id: row.raw_transaction_id, is_active: row.is_active })),
    (rawTransactions ?? []).map(row => ({ id: row.id, account_id: row.account_id, plaid_transaction_id: row.plaid_transaction_id, is_current: row.is_current, evidence_state: row.evidence_state })),
  );
  const transactionReconciliationReady = canonicalReconciliation.status === "reconciled" && !canonicalReconciliation.double_counting_risk && canonicalReconciliation.active_canonical_with_raw === canonicalReconciliation.canonical_active && canonicalReconciliation.active_canonical_with_account === canonicalReconciliation.canonical_active && canonicalReconciliation.active_canonical_with_item === canonicalReconciliation.canonical_active;
  check("iris.reconciliation.transactions", transactionReconciliationReady, "Canonical transactions reconcile with current observed provider transactions and account/Item lineage.", `Canonical transaction reconciliation is ${canonicalReconciliation.status}; provider identity, raw linkage, account lineage, or duplicate checks prevent certification.`);

  const usage = execution?.resource_usage as { duration_ms?: number; nodes?: number; edges?: number; compositions?: number } | null | undefined;
  const budget = run?.resource_budget as { max_execution_time_ms?: number; max_graph_nodes?: number; max_graph_edges?: number; max_compositions?: number } | null | undefined;
  const resourceOk = !!usage && (!budget?.max_execution_time_ms || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= budget.max_execution_time_ms) && (!budget?.max_graph_nodes || (usage.nodes ?? Number.MAX_SAFE_INTEGER) <= budget.max_graph_nodes) && (!budget?.max_graph_edges || (usage.edges ?? Number.MAX_SAFE_INTEGER) <= budget.max_graph_edges) && (!budget?.max_compositions || (usage.compositions ?? Number.MAX_SAFE_INTEGER) <= budget.max_compositions);
  check("iris.resource_budget", resourceOk, "Recursive execution completed within the configured execution/resource budgets.", "Recursive execution resource usage is missing or exceeds a configured budget.");

  return {
    eligible: critical_failures.length === 0,
    status: critical_failures.length === 0 ? "PASS" : "FAIL",
    critical_failures,
    checks,
    evidence_snapshot: {
      evidence_state: "CALCULATED", user_id: userId, run_id: runId, execution_id: executionId,
      evidence_boundary: run?.evidence_boundary ?? null, evidence_version: run?.evidence_version ?? null, evidence_manifest_hash: run?.evidence_manifest_hash ?? null,
      run_evidence_count: evidence?.length ?? 0, lineage_count: lineage?.length ?? 0, current_observed_product_count: productCount ?? 0,
      required_provider_domains: [...REQUIRED_PROVIDER_DOMAINS], observed_provider_domains: observedDomains,
      complete_item_count: completeItems.length, complete_item_ids: completeItems, selected_item_id: selectedItemId, run_evidence_item_ids: evidenceItemIds,
    },
    reconciliation_snapshot: {
      status: transactionReconciliationReady && evidenceMatchesSelectedItem && evidenceHasRequiredDomains && graphComplete && provenanceComplete && dependencyClosure ? "PASS" : "FAIL",
      canonical_transaction_reconciliation: canonicalReconciliation,
      selected_item_id: selectedItemId,
      run_evidence_item_ids: evidenceItemIds,
      run_evidence_required_domains: evidenceHasRequiredDomains,
      recursive_graph: { ordered_count: ordered.length, executed_count: executed.length, missing_results: missingResults, dependency_closure: dependencyClosure },
      scope: "provider_item_plus_identity_lineage_plus_recursive_capability_graph",
    },
  };
}

function planDependencies(graph: any, capabilityId: string): string[] {
  const contracts = Array.isArray(graph?.contracts) ? graph.contracts : [];
  const contract = contracts.find((candidate: any) => candidate?.capability_id === capabilityId);
  return Array.isArray(contract?.dependencies) ? contract.dependencies.filter((dependency: unknown): dependency is string => typeof dependency === "string") : [];
}
