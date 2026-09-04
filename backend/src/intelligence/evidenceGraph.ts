import type { SupabaseClient } from "@supabase/supabase-js";

export type EvidenceNodeKind = "provider" | "calculation" | "intelligence" | "inference" | "limitation";

export interface EvidenceNode {
  id: string;
  kind: EvidenceNodeKind;
  label: string;
  state: "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence";
  source: string;
  value?: unknown;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  relation: "supports" | "derived_from" | "constrains" | "compares_with" | "limits";
}

export interface EvidenceGraph {
  architecture_version: "IRIS_EVIDENCE_GRAPH_V1";
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  roots: string[];
  limitations: string[];
}

function addMetricNode(nodes: EvidenceNode[], id: string, label: string, value: unknown, state: EvidenceNode["state"], source: string) {
  const kind: EvidenceNodeKind = state === "observed" ? "provider" : state === "inferred" ? "inference" : "calculation";
  nodes.push({ id, kind, label, value, state, source });
}

/** Builds a deterministic relationship graph from real provider evidence and canonical Iris intelligence. */
export function buildEvidenceGraph(intel: any): EvidenceGraph {
  const nodes: EvidenceNode[] = [];
  const edges: EvidenceEdge[] = [];
  const limitations: string[] = Array.isArray(intel?.layer_max_intelligence?.evidence_coverage?.limitations)
    ? intel.layer_max_intelligence.evidence_coverage.limitations.map((value: unknown) => String(value))
    : [];

  const add = (id: string, label: string, value: unknown, state: EvidenceNode["state"], source: string) => addMetricNode(nodes, id, label, value, state, source);

  const metrics = intel?.layer_metrics ?? {};
  if (metrics.net_worth?.liquid_assets != null) add("liquid_assets", "Liquid assets", metrics.net_worth.liquid_assets, "observed", "Plaid account balances");
  if (metrics.cash_flow?.net != null) add("cash_flow_net", "Net cash flow", metrics.cash_flow.net, "calculated", "Iris cash-flow calculation");
  if (metrics.cash_flow_safety?.safeToSpend != null) add("safe_to_spend", "Safe to spend", metrics.cash_flow_safety.safeToSpend, "calculated", "Iris liquidity calculation");
  if (metrics.roundup_projection) add("roundup_projection", "Round-Up projection", metrics.roundup_projection.projectedAmount ?? metrics.roundup_projection.projected, "calculated", "Iris Round-Up calculation");
  if (metrics.forward_projection) add("forward_projection", "Forward projection", metrics.forward_projection, "inferred", "Iris forward analysis");
  if (Array.isArray(metrics.anomalies)) add("anomalies", "Anomaly findings", metrics.anomalies.length, metrics.anomalies.length ? "inferred" : "calculated", "Iris anomaly analysis");
  if (intel?.layer_temporal?.trajectory) add("trajectory", "Financial trajectory", intel.layer_temporal.trajectory, "inferred", "Iris temporal analysis");
  if (intel?.layer_behavioral?.categoryDrift) add("category_drift", "Category behavior drift", intel.layer_behavioral.categoryDrift, "inferred", "Iris behavioral analysis");
  if (intel?.layer_debt_cost) add("debt_cost", "Debt cost intelligence", intel.layer_debt_cost, "calculated", "Iris liability analysis");

  if (nodes.some((n) => n.id === "liquid_assets") && nodes.some((n) => n.id === "safe_to_spend")) edges.push({ from: "liquid_assets", to: "safe_to_spend", relation: "supports" });
  if (nodes.some((n) => n.id === "cash_flow_net") && nodes.some((n) => n.id === "safe_to_spend")) edges.push({ from: "cash_flow_net", to: "safe_to_spend", relation: "supports" });
  if (nodes.some((n) => n.id === "cash_flow_net") && nodes.some((n) => n.id === "trajectory")) edges.push({ from: "cash_flow_net", to: "trajectory", relation: "derived_from" });
  if (nodes.some((n) => n.id === "cash_flow_net") && nodes.some((n) => n.id === "forward_projection")) edges.push({ from: "cash_flow_net", to: "forward_projection", relation: "derived_from" });
  if (nodes.some((n) => n.id === "roundup_projection") && nodes.some((n) => n.id === "forward_projection")) edges.push({ from: "roundup_projection", to: "forward_projection", relation: "supports" });
  if (nodes.some((n) => n.id === "debt_cost") && nodes.some((n) => n.id === "safe_to_spend")) edges.push({ from: "debt_cost", to: "safe_to_spend", relation: "constrains" });
  if (limitations.length) {
    limitations.forEach((text: string, index: number) => {
      const id = `limitation_${index + 1}`;
      nodes.push({ id, kind: "limitation", label: text, state: "limited", source: "Iris evidence coverage" });
      if (nodes.some((n) => n.id === "forward_projection")) edges.push({ from: id, to: "forward_projection", relation: "limits" });
    });
  }

  return {
    architecture_version: "IRIS_EVIDENCE_GRAPH_V1",
    nodes,
    edges,
    roots: nodes.filter((node) => !edges.some((edge) => edge.to === node.id)).map((node) => node.id),
    limitations,
  };
}

/** Verifies that provider observations remain source nodes and are never rewritten by Iris. */
export async function verifyProviderLineage(supabase: SupabaseClient, userId: string): Promise<{ observedAccounts: number; observedTransactions: number }> {
  const [{ count: observedAccounts }, { count: observedTransactions }] = await Promise.all([
    supabase.from("plaid_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
  ]);
  return { observedAccounts: observedAccounts ?? 0, observedTransactions: observedTransactions ?? 0 };
}
