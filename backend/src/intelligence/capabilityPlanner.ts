import { supabaseAdmin } from "../config/supabase.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const CAPABILITY_PLANNER_VERSION = "iris-capability-planner-v6";

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
  unsupported_capabilities: string[];
  cycle_detected: boolean;
  evidence: { observed_products: string[]; observed_product_count: number; source_field_observation_count: number };
  resource_estimate: { nodes: number; edges: number; compositions: number };
  status: "READY" | "LIMITED" | "BLOCKED";
  limitations: string[];
};

function dependencyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (entry && typeof entry === "object" && "capability_id" in entry && typeof entry.capability_id === "string") return [entry.capability_id];
    return [];
  });
}

/** Resolve the governed capability graph against persisted contracts and executable operators. */
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
  const unsupported: string[] = [];
  const ordered: string[] = [];
  const visited = new Set<string>();
  const activePath = new Set<string>();
  let cycleDetected = false;
  const limitations: string[] = [];

  const visit = (id: string) => {
    if (activePath.has(id)) { cycleDetected = true; limitations.push(`Capability dependency cycle detected at ${id}.`); return; }
    if (visited.has(id)) return;
    const contract = registry.get(id);
    if (!contract) return;
    activePath.add(id);
    for (const dep of dependencyIds(contract.dependencies)) visit(dep);
    activePath.delete(id);
    visited.add(id);
    ordered.push(id);
  };
  for (const id of requestedIds) if (id !== "iris.full_intelligence") visit(id);

  for (const id of ordered) {
    const contract = registry.get(id);
    const operator = getCapabilityOperator(id);
    if (!operator || operator.status !== "implemented") unsupported.push(id);
    else if (contract && contract.operator_id !== operator.operator_id) limitations.push(`Capability ${id} contract operator ${contract.operator_id} does not match executable operator ${operator.operator_id}.`);
    else if (contract && contract.operator_version !== operator.version) limitations.push(`Capability ${id} contract version ${contract.operator_version} does not match executable version ${operator.version}.`);
  }
  if (missing.length) limitations.push(`Missing governed capability contracts: ${missing.join(", ")}.`);
  if (unsupported.length) limitations.push(`No implemented executable operator exists for: ${unsupported.join(", ")}.`);
  if (productError) limitations.push(`Provider product observation could not be read: ${productError.message}.`);
  if (fieldError) limitations.push(`Provider source-field observations could not be counted: ${fieldError.message}.`);
  const observedProducts = [...new Set((products ?? []).map(p => p.product).filter((p): p is string => typeof p === "string"))];
  if (!observedProducts.length) limitations.push("No observed Plaid product domain is available to the planner for this user.");

  for (const id of ordered) {
    const contract = registry.get(id);
    if (!contract) continue;
    for (const dependency of dependencyIds(contract.dependencies)) {
      if (!registry.has(dependency)) {
        unsupported.push(dependency);
        limitations.push(`Capability ${id} declares missing dependency contract ${dependency}.`);
      }
    }
  }

  const uniqueUnsupported = [...new Set(unsupported)];
  const contractsUsed = ordered.map(id => registry.get(id)!).filter(Boolean);
  const edges = contractsUsed.reduce((n, c) => n + dependencyIds(c.dependencies).filter(d => registry.has(d)).length, 0);
  const nodes = ordered.length;
  const compositions = contractsUsed.filter(c => c.recursive || c.cross_domain).length;
  const status = cycleDetected || missing.length || uniqueUnsupported.length ? "BLOCKED" : limitations.length ? "LIMITED" : "READY";
  return { planner_version: CAPABILITY_PLANNER_VERSION, requested: requestedIds, ordered_capabilities: ordered, contracts: contractsUsed, missing_capabilities: missing, unsupported_capabilities: uniqueUnsupported, cycle_detected: cycleDetected, evidence: { observed_products: observedProducts, observed_product_count: observedProducts.length, source_field_observation_count: fieldCount ?? 0 }, resource_estimate: { nodes, edges, compositions }, status, limitations };
}
