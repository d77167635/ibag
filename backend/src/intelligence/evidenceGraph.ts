import type { SupabaseClient } from "@supabase/supabase-js";

export type EvidenceNodeKind = "provider" | "calculation" | "intelligence" | "inference" | "limitation";
export type EvidenceState = "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence";
export type EvidenceRelation = "supports" | "derived_from" | "constrains" | "compares_with" | "limits";

export interface EvidenceNode {
  id: string;
  kind: EvidenceNodeKind;
  label: string;
  state: EvidenceState;
  source: string;
  value?: unknown;
  freshness?: string;
  provider_domain?: string;
  calculation_version?: string;
  observation_window_days?: number;
  upstream_node_ids?: string[];
  generated_at?: string;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relation: EvidenceRelation;
}

export interface EvidenceGraph {
  architecture_version: "IRIS_EVIDENCE_GRAPH_V2";
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  roots: string[];
  limitations: string[];
}

function addMetricNode(
  nodes: EvidenceNode[],
  id: string,
  label: string,
  value: unknown,
  state: EvidenceState,
  source: string,
  providerDomain?: string,
) {
  const kind: EvidenceNodeKind = state === "observed" ? "provider" : state === "inferred" ? "inference" : "calculation";
  const node: EvidenceNode = { id, kind, label, value, state, source, provider_domain: providerDomain, generated_at: new Date().toISOString() };
  if (state === "calculated") node.calculation_version = "IRIS_CANONICAL_INTELLIGENCE_V1";
  if (id === "cash_flow_net" || id === "safe_to_spend" || id === "roundup_projection" || id === "category_drift") node.observation_window_days = 30;
  if (id === "forward_projection" || id === "trajectory" || id === "anomalies") node.observation_window_days = 90;
  nodes.push(node);
}

/** Builds a deterministic dependency graph from real provider evidence and canonical Iris intelligence. */
export function buildEvidenceGraph(intel: any): EvidenceGraph {
  const nodes: EvidenceNode[] = [];
  const edges: EvidenceEdge[] = [];
  const limitations: string[] = Array.isArray(intel?.layer_max_intelligence?.evidence_coverage?.limitations)
    ? intel.layer_max_intelligence.evidence_coverage.limitations.map((value: unknown) => String(value))
    : [];

  const add = (id: string, label: string, value: unknown, state: EvidenceState, source: string, providerDomain?: string) =>
    addMetricNode(nodes, id, label, value, state, source, providerDomain);
  const has = (id: string) => nodes.some((node) => node.id === id);
  const link = (from: string, to: string, relation: EvidenceRelation) => {
    if (has(from) && has(to) && !edges.some((edge) => edge.from === from && edge.to === to && edge.relation === relation)) {
      edges.push({ from, to, relation });
    }
  };

  const metrics = intel?.layer_metrics ?? {};
  if (metrics.net_worth?.liquid_assets != null) add("liquid_assets", "Liquid assets", metrics.net_worth.liquid_assets, "observed", "Plaid account balances", "balance");
  if (metrics.cash_flow?.net != null) add("cash_flow_net", "Net cash flow", metrics.cash_flow.net, "calculated", "Iris canonical economic cash-flow calculation", "transactions");
  if (metrics.cash_flow_safety?.safeToSpend != null) add("safe_to_spend", "Safe to spend", metrics.cash_flow_safety.safeToSpend, "calculated", "Iris liquidity calculation");
  if (metrics.roundup_projection) {
    const node = metrics.roundup_projection;
    add("roundup_projection", "Round-Up projection", node.projectedAmount ?? node.projected, "calculated", "Iris canonical Round-Up calculation", "transactions");
    const created = nodes.find((n) => n.id === "roundup_projection");
    if (created && node.calculation_version) created.calculation_version = String(node.calculation_version);
    if (created && node.basisDays != null) created.observation_window_days = Number(node.basisDays);
  }
  if (metrics.forward_projection) add("forward_projection", "Forward projection", metrics.forward_projection, "inferred", "Iris forward analysis");
  if (Array.isArray(metrics.anomalies)) add("anomalies", "Anomaly findings", metrics.anomalies.length, metrics.anomalies.length ? "inferred" : "calculated", "Iris anomaly analysis", "transactions");
  if (intel?.layer_temporal?.trajectory) add("trajectory", "Financial trajectory", intel.layer_temporal.trajectory, "inferred", "Iris temporal analysis");
  if (intel?.layer_behavioral?.categoryDrift) add("category_drift", "Category behavior drift", intel.layer_behavioral.categoryDrift, "inferred", "Iris behavioral analysis", "transactions");
  if (intel?.layer_debt_cost) add("debt_cost", "Debt cost intelligence", intel.layer_debt_cost, "calculated", "Iris liability analysis", "liabilities");

  link("liquid_assets", "safe_to_spend", "supports");
  link("cash_flow_net", "safe_to_spend", "supports");
  link("cash_flow_net", "trajectory", "derived_from");
  link("cash_flow_net", "forward_projection", "derived_from");
  link("trajectory", "forward_projection", "supports");
  link("roundup_projection", "forward_projection", "supports");
  link("debt_cost", "safe_to_spend", "constrains");
  link("anomalies", "forward_projection", "limits");
  link("category_drift", "forward_projection", "supports");

  for (const node of nodes) {
    node.upstream_node_ids = edges.filter((edge) => edge.to === node.id).map((edge) => edge.from);
  }

  limitations.forEach((text: string, index: number) => {
    const id = `limitation_${index + 1}`;
    nodes.push({ id, kind: "limitation", label: text, state: "limited", source: "Iris evidence coverage", generated_at: new Date().toISOString(), upstream_node_ids: [] });
    link(id, "forward_projection", "limits");
    link(id, "safe_to_spend", "limits");
  });

  for (const node of nodes) {
    node.upstream_node_ids = edges.filter((edge) => edge.to === node.id).map((edge) => edge.from);
  }

  return {
    architecture_version: "IRIS_EVIDENCE_GRAPH_V2",
    nodes,
    edges,
    roots: nodes.filter((node) => !edges.some((edge) => edge.to === node.id)).map((node) => node.id),
    limitations,
  };
}

/** Verifies the provider lineage chain and counts only actual Plaid domain observations as observed evidence. */
export async function verifyProviderLineage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  observedAccounts: number;
  observedTransactions: number;
  transactionsWithAccount: number;
  transactionsWithItem: number;
  observedProductDomains: number;
  lineageComplete: boolean;
}> {
  const [{ count: observedAccounts }, { count: observedTransactions }] = await Promise.all([
    supabase.from("plaid_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
  ]);

  const { data: transactionRows, error: transactionError } = await supabase
    .from("transactions")
    .select("id, account_id, plaid_accounts!inner(item_id, user_id)")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (transactionError) throw transactionError;

  const { count: observedProductDomains, error: productError } = await supabase
    .from("plaid_product_observations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", "plaid")
    .eq("is_current", true)
    .eq("evidence_state", "observed")
    .eq("lifecycle_state", "observed");
  if (productError) throw productError;

  const rows = transactionRows ?? [];
  const transactionsWithAccount = rows.filter((row: any) => Boolean(row.account_id)).length;
  const transactionsWithItem = rows.filter((row: any) => Boolean(row.plaid_accounts?.item_id) && row.plaid_accounts?.user_id === userId).length;
  const lineageComplete =
    (observedTransactions ?? 0) === transactionsWithAccount &&
    transactionsWithAccount === transactionsWithItem;

  return {
    observedAccounts: observedAccounts ?? 0,
    observedTransactions: observedTransactions ?? 0,
    transactionsWithAccount,
    transactionsWithItem,
    observedProductDomains: observedProductDomains ?? 0,
    lineageComplete,
  };
}
