import { supabaseAdmin } from "../config/supabase.js";

export const CAPABILITY_PLANNER_VERSION = "iris-capability-planner-v3";

type CapabilityContract = {
  capability_id: string;
  version: string;
  operator_id: string;
  operator_version: string;
  evidence_requirements: unknown;
  dependencies: unknown;
  validation_rules: unknown;
  output_type: string;
  recursive: boolean;
  cross_domain: boolean;
};

export type CapabilityPlan = {
  planner_version: string;
  requested: string[];
  ordered_capabilities: string[];
  contracts: CapabilityContract[];
  missing_capabilities: string[];
  cycle_detected: boolean;
  evidence: {
    observed_products: string[];
    observed_product_count: number;
    source_field_observation_count: number;
  };
  resource_estimate: { nodes: number; edges: number; compositions: number };
  status: "READY" | "LIMITED" | "BLOCKED";
  limitations: string[];
};

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Resolve the governed capability graph from persisted contracts and actual observed provider evidence. */
export async function planCapabilities(userId: string, requested: string[]): Promise<CapabilityPlan> {
  const requestedIds = [...new Set(requested.filter(Boolean))];
  const [{ data: contracts, error: contractError }, { data: products, error: productError }, { count: fieldCount, error: fieldError }] = await Promise.all([
    supabaseAdmin.from("iris_capability_contracts").select("capability_id,version,operator_id,operator_version,evidence_requirements,dependencies,validation_rules,output_type,recursive,cross_domain").eq("active", true),
    supabaseAdmin.from("plaid_product_observations").select("product,item_id,evidence_state,lifecycle_state").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("iris_source_field_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("evidence_state", "observed"),
  ]);

  if (contractError) throw new Error(`CAPABILITY_REGISTRY_READ_FAILED: ${contractError.message}`);

  const registry = new Map<string, CapabilityContract>((contracts ?? []).map(row => [row.capability_id, row as CapabilityContract]));
  const missing = requestedIds.filter(id => id !== "iris.full_intelligence" && !registry.has(id));
  const ordered: string[] = [];
  const visited = new Set<string>();
  const activePath = new Set<string>();
  let cycleDetected = false;
  const limitations: string[] = [];

  const visit = (id: string) => {
    if (activePath.has(id)) {
      cycleDetected = true;
      limitations.push(`Capability dependency cycle detected at ${id}.`);
      return;
    }
    if (visited.has(id)) return;
    const contract = registry.get(id);
    if (!contract) return;
    activePath.add(id);
    for (const dep of asStrings(contract.dependencies)) visit(dep);
    activePath.delete(id);
    visited.add(id);
    ordered.push(id);
  };

  for (const id of requestedIds) if (id !== "iris.full_intelligence") visit(id);

  if (missing.length) limitations.push(`Missing governed capability contracts: ${missing.join(", ")}.`);
  if (productError) limitations.push(`Provider product observation could not be read: ${productError.message}.`);
  if (fieldError) limitations.push(`Provider source-field observations could not be counted: ${fieldError.message}.`);
  const observedProducts = [...new Set((products ?? []).map(p => p.product).filter((p): p is string => typeof p === "string"))];
  if (!observedProducts.length) limitations.push("No observed Plaid product domain is available to the planner for this user.");

  const contractsUsed = ordered.map(id => registry.get(id)!).filter(Boolean);
  const edges = contractsUsed.reduce((n, c) => n + asStrings(c.dependencies).filter(d => registry.has(d)).length, 0);
  const nodes = ordered.length;
  const compositions = contractsUsed.filter(c => c.recursive || c.cross_domain).length;
  const status = cycleDetected || missing.length ? "BLOCKED" : limitations.length ? "LIMITED" : "READY";

  return {
    planner_version: CAPABILITY_PLANNER_VERSION,
    requested: requestedIds,
    ordered_capabilities: ordered,
    contracts: contractsUsed,
    missing_capabilities: missing,
    cycle_detected: cycleDetected,
    evidence: {
      observed_products: observedProducts,
      observed_product_count: observedProducts.length,
      source_field_observation_count: fieldCount ?? 0,
    },
    resource_estimate: { nodes, edges, compositions },
    status,
    limitations,
  };
}
