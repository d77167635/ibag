import { supabaseAdmin } from "../config/supabase.js";
import { reconcileCanonicalTransactions } from "./canonicalReconciliation.js";

const REQUIRED_PROVIDER_DOMAINS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] as const;
type GateCheck = { status: "PASS" | "FAIL"; details: string };
export type CertificationGateResult = { eligible: boolean; status: "PASS" | "FAIL"; critical_failures: string[]; checks: Record<string, GateCheck>; evidence_snapshot: Record<string, unknown>; reconciliation_snapshot: Record<string, unknown> };

export async function evaluateCertificationGate({ runId, executionId, userId, inputHash, outputHash }: { runId: string; executionId: string; userId: string; inputHash: string; outputHash: string }): Promise<CertificationGateResult> {
  const checks: Record<string, GateCheck> = {};
  const critical_failures: string[] = [];
  const check = (key: string, ok: boolean, pass: string, fail: string) => { checks[key] = { status: ok ? "PASS" : "FAIL", details: ok ? pass : fail }; if (!ok) critical_failures.push(key); };

  const [{ data: run }, { data: execution }, { data: graphExecutions }, { data: evidence, error: evidenceError }, { data: outputs }, { count: roundupCount }, { count: productCount }, { data: currentProviderRows }, { data: accounts }, { data: canonicalTransactions }, { data: rawTransactions }] = await Promise.all([
    supabaseAdmin.from("iris_runs").select("id,user_id,as_of,evidence_boundary,evidence_version,evidence_manifest_hash,resource_budget,execution_policy").eq("id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("run_id,user_id,execution_state,input_hash,output_hash,resource_usage,input_manifest").eq("id", executionId).eq("run_id", runId).eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("iris_execution_records").select("id,capability_id,execution_state,input_hash,output_hash,validation_status,certification_status,input_manifest").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_run_evidence").select("id,user_id,provider,product,raw_observation_id,evidence_hash,effective_at,acquired_at").eq("run_id", runId).eq("user_id", userId),
    supabaseAdmin.from("iris_execution_outputs").select("hash,evidence_state,value").eq("execution_id", executionId),
    supabaseAdmin.from("roundup_sweep_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("plaid_raw_product_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_raw_product_observations").select("item_id,product").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id,item_id,plaid_account_id").eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id,account_id,plaid_transaction_id,raw_transaction_id,is_active").eq("user_id", userId).eq("is_active", true),
    supabaseAdmin.from("plaid_raw_transactions").select("id,account_id,plaid_transaction_id,is_current,evidence_state").eq("user_id", userId).eq("is_current", true).eq("evidence_state", "observed"),
  ]);

  const graphOutputIds = (graphExecutions ?? []).map(row => row.id);
  const { data: graphOutputs, error: graphOutputError } = graphOutputIds.length
    ? await supabaseAdmin.from("iris_execution_outputs").select("execution_id,hash,value,evidence_state").in("execution_id", graphOutputIds)
    : { data: [] as any[], error: null };
  if (graphOutputError) throw new Error(`CERTIFICATION_GRAPH_OUTPUT_READ_FAILED: ${graphOutputError.message}`);

  const graphOutputByExecution = new Map((graphOutputs ?? []).map(row => [row.execution_id, row]));
  const graphIntegrity = (graphExecutions ?? []).length > 0 && (graphExecutions ?? []).every(row => {
    const output = graphOutputByExecution.get(row.id);
    const validationReady = row.capability_id === "iris.full_intelligence" ? row.validation_status === "UNKNOWN" || row.validation_status === "PASS" : row.validation_status === "PASS";
    return row.execution_state === "EXECUTED" && validationReady && !!row.output_hash && !!output && output.hash === row.output_hash && output.value != null && output.evidence_state !== "OBSERVED";
  });
  check("iris.execution.graph_integrity", graphIntegrity, `All ${(graphExecutions ?? []).length} planned capability executions are executed, validation-ready, hash-linked, and have derived outputs.`, "At least one planned capability execution is incomplete, missing an output, or has an output-hash mismatch.");

  check("iris.execution.integrity", !!execution && execution.execution_state === "EXECUTED" && execution.input_hash === inputHash && execution.output_hash === outputHash && inputHash.length === 64 && outputHash.length === 64, "Execution identity, state, and hashes match.", "Execution identity, state, or hashes are invalid.");
  check("iris.evidence.ownership", !evidenceError && (evidence?.length ?? 0) > 0 && evidence!.every(e => e.user_id === userId && !!e.evidence_hash && e.effective_at != null && e.acquired_at != null), "Run evidence is present, hashed, dated, and user-owned.", "Run evidence is missing, incomplete, unhashed, or ownership-invalid.");
  check("iris.evidence.boundary", !!run?.as_of && !!run?.evidence_boundary && !!run?.evidence_manifest_hash, "Explicit evidence boundary and manifest hash are persisted.", "Evidence boundary or manifest hash is missing.");

  const rawIds = (evidence ?? []).map(e => e.raw_observation_id).filter((id): id is string => typeof id === "string");
  const { data: lineage } = rawIds.length ? await supabaseAdmin.from("iris_data_lineage").select("id,user_id,source_id,destination_id,evidence_state").eq("user_id", userId).in("source_id", rawIds.slice(0, 5000)).limit(5000) : { data: [] as any[] };
  check("iris.lineage.present", (lineage?.length ?? 0) > 0 && lineage!.every(l => l.user_id === userId), "User-owned provider-to-intelligence lineage is attached to the run evidence boundary.", "No user-owned provider lineage is attached to the run evidence boundary.");

  const domainsByItem = new Map<string, Set<string>>();
  for (const row of currentProviderRows ?? []) { if (!row.item_id || !row.product) continue; const domains = domainsByItem.get(row.item_id) ?? new Set<string>(); domains.add(row.product); domainsByItem.set(row.item_id, domains); }
  const completeItems = [...domainsByItem.entries()].filter(([, domains]) => REQUIRED_PROVIDER_DOMAINS.every(domain => domains.has(domain))).map(([itemId]) => itemId);
  const observedDomains = [...new Set((currentProviderRows ?? []).map(row => row.product).filter((product): product is string => typeof product === "string"))];
  const missingDomains = REQUIRED_PROVIDER_DOMAINS.filter(domain => !observedDomains.includes(domain));
  const selectedItemId = (run?.execution_policy as any)?.selected_item_id ?? (execution?.input_manifest as any)?.evidence_scope?.selectedItemId ?? null;
  const runEvidenceRaw = rawIds.length ? (await supabaseAdmin.from("plaid_raw_product_observations").select("id,item_id,product,raw_response,effective_at,acquired_at,is_current,evidence_state").in("id", rawIds.slice(0, 5000)).eq("user_id", userId)).data ?? [] : [];
  const evidenceItemIds = [...new Set(runEvidenceRaw.map(row => row.item_id).filter((id): id is string => typeof id === "string"))];
  const evidenceMatchesSelectedItem = !selectedItemId || (evidenceItemIds.length > 0 && evidenceItemIds.every(id => id === selectedItemId));
  const evidenceHasRequiredDomains = selectedItemId ? REQUIRED_PROVIDER_DOMAINS.every(domain => runEvidenceRaw.some(row => row.item_id === selectedItemId && row.product === domain && row.is_current === true && row.evidence_state === "observed")) : completeItems.length > 0;

  check("iris.evidence.eight_domains", completeItems.length > 0, `All eight canonical Plaid evidence domains are currently observed together on ${completeItems.length} Item(s).`, missingDomains.length ? `Full-intelligence certification requires one Item with all eight canonical domains. Missing observed domains: ${missingDomains.join(", ")}.` : "Eight domains exist, but no single Item has all eight current observed domains.");
  check("iris.evidence.same_item", evidenceMatchesSelectedItem && evidenceHasRequiredDomains, selectedItemId ? `Run evidence is bounded to selected Item ${selectedItemId} and contains all eight required current observed domains.` : "Run evidence is compatible with a complete canonical provider Item.", selectedItemId ? `Run evidence does not prove the selected Item ${selectedItemId} supplied all eight required current observed domains without cross-Item mixing.` : "Run evidence does not establish a single canonical provider Item boundary.");

  const output = outputs?.find(o => o.hash === outputHash);
  check("iris.output.semantic_state", !!output && output.value != null && output.evidence_state !== "OBSERVED", "Output is persisted as derived intelligence and is not misclassified as observed evidence.", "Output is missing, hash-mismatched, or incorrectly classified as observed evidence.");

  const providerDomains = (output?.value as any)?.layer_metrics?.provider_domains as any;
  const crossDomain = providerDomains?.derived?.cross_domain_reconciliation as any;
  const composition = providerDomains?.derived?.financial_composition_reconciliation as any;
  const crossDomainReady = crossDomain?.state === "reconciled" && crossDomain?.net_worth_basis === "account_balances_only" && crossDomain?.checks?.transaction_account_lineage === true && crossDomain?.checks?.currency_safe === true;
  const compositionReady = composition?.status === "reconciled" && composition?.net_worth_basis === "account_balances_only" && composition?.double_counting_risk === false && Array.isArray(composition?.duplicate_account_ids) && composition.duplicate_account_ids.length === 0 && Array.isArray(composition?.currencies) && composition.currencies.length <= 1;
  check("iris.reconciliation.cross_domain", crossDomainReady, "Cross-domain financial evidence reconciles sufficiently for governed certification, with account balances as the non-overlapping net-worth basis.", crossDomain ? `Cross-domain reconciliation is ${String(crossDomain.state)} or one of its core safety checks is not satisfied; certification remains blocked.` : "The governed output does not contain a cross-domain reconciliation result.");
  check("iris.reconciliation.financial_composition", compositionReady, "Financial composition reconciles without duplicate account identity, mixed-currency aggregation, or double-counting risk.", composition ? `Financial composition is ${String(composition.status)} or its net-worth/overlap safeguards are not satisfied; certification remains blocked.` : "The governed output does not contain a financial composition reconciliation result.");

  const canonicalReconciliation = reconcileCanonicalTransactions(
    (accounts ?? []).map(row => ({ id: row.id, item_id: row.item_id, plaid_account_id: row.plaid_account_id })),
    (canonicalTransactions ?? []).map(row => ({ id: row.id, account_id: row.account_id, plaid_transaction_id: row.plaid_transaction_id, raw_transaction_id: row.raw_transaction_id, is_active: row.is_active })),
    (rawTransactions ?? []).map(row => ({ id: row.id, account_id: row.account_id, plaid_transaction_id: row.plaid_transaction_id, is_current: row.is_current, evidence_state: row.evidence_state })),
  );
  const transactionReconciliationReady = canonicalReconciliation.status === "reconciled" && !canonicalReconciliation.double_counting_risk && canonicalReconciliation.active_canonical_with_raw === canonicalReconciliation.canonical_active && canonicalReconciliation.active_canonical_with_account === canonicalReconciliation.canonical_active && canonicalReconciliation.active_canonical_with_item === canonicalReconciliation.canonical_active;
  check("iris.reconciliation.transactions", transactionReconciliationReady, "Canonical transactions reconcile one-to-one with current observed provider transactions and account/Item lineage.", `Canonical transaction reconciliation is ${canonicalReconciliation.status}; provider identity, raw linkage, account lineage, or duplicate checks prevent certification.`);

  const usage = execution?.resource_usage as { duration_ms?: number } | null | undefined;
  const budget = run?.resource_budget as { max_execution_time_ms?: number } | null | undefined;
  check("iris.resource_budget", !!usage && (!budget?.max_execution_time_ms || (usage.duration_ms ?? Number.MAX_SAFE_INTEGER) <= budget.max_execution_time_ms), "Execution completed within the configured time budget.", "Execution resource usage is missing or exceeds the configured time budget.");

  return {
    eligible: critical_failures.length === 0,
    status: critical_failures.length === 0 ? "PASS" : "FAIL",
    critical_failures,
    checks,
    evidence_snapshot: { evidence_state: "CALCULATED", user_id: userId, run_id: runId, execution_id: executionId, evidence_boundary: run?.evidence_boundary ?? null, evidence_version: run?.evidence_version ?? null, evidence_manifest_hash: run?.evidence_manifest_hash ?? null, execution_count: graphExecutions?.length ?? 0, run_evidence_count: evidence?.length ?? 0, lineage_count: lineage?.length ?? 0, current_observed_product_count: productCount ?? 0, required_provider_domains: [...REQUIRED_PROVIDER_DOMAINS], observed_provider_domains: observedDomains, complete_item_count: completeItems.length, complete_item_ids: completeItems, selected_item_id: selectedItemId, run_evidence_item_ids: evidenceItemIds },
    reconciliation_snapshot: { status: transactionReconciliationReady && evidenceMatchesSelectedItem && evidenceHasRequiredDomains && crossDomainReady && compositionReady && graphIntegrity ? "PASS" : "FAIL", canonical_transaction_reconciliation: canonicalReconciliation, roundup_event_count: roundupCount ?? 0, current_product_observation_count: productCount ?? 0, selected_item_id: selectedItemId, run_evidence_item_ids: evidenceItemIds, run_evidence_required_domains: evidenceHasRequiredDomains, cross_domain_reconciliation: crossDomain ?? null, financial_composition_reconciliation: composition ?? null, scope: "provider_item_plus_identity_lineage_plus_cross_domain_reconciliation_plus_financial_composition_plus_capability_execution_graph" },
  };
}
