import { supabaseAdmin } from "../config/supabase.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const CAPABILITY_PLANNER_VERSION = "iris-capability-planner-v6";
const FULL_INTELLIGENCE_REQUEST = "iris.full_intelligence";

type CapabilityContract = {
  capability_id: string;
  version: string;
  operator_id: string;
  operator_version: string;
  evidence_requirements: unknown;
  dependencies: unknown;
  validation_rules: unknown;
  output_type: string;
  output_contract: unknown;
  lineage_requirements: unknown;
  resource_limits: unknown;
  user_control: unknown;
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

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Resolve a request into the persisted, executable capability dependency graph. The full-intelligence alias expands to the currently active governed registry; it is not itself an intelligence operator or semantic ceiling. */
export async function planCapabilities(userId: string, requested: string[]): Promise<CapabilityPlan> {
  const requestedIds = [...new Set(requested.filter(Boolean))];
  const [{ data: contracts, error: contractError }, { data: products, error: productError }, { count: fieldCount, error: fieldError }] = await Promise.all([
    supabaseAdmin.from("iris_capability_contracts").select("capability_id,version,operator_id,operator_version,evidence_requirements,dependencies,validation_rules,output_type,output_contract,lineage_requirements,resource_limits,user_control,recursive,cross_domain").eq("active", true),
    supabaseAdmin.from("plaid_product_observations").select("product,item_id,evidence_state,lifecycle_state").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("iris_source_field_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("evidence_state", "observed"),
  ]);
  if (contractError) throw new Error(`CAPABILITY_REGISTRY_READ_FAILED: ${contractError.message}`);

  const registry = new Map<string, CapabilityContract>((contracts ?? []).map((row) => [row.capability_id, row as CapabilityContract]));
  const expansion = requestedIds.includes(FULL_INTELLIGENCE_REQUEST) ? [...registry.keys()].sort() : requestedIds;
  const missing = new Set(expansion.filter((id) => !registry.has(id)));
  const unsupported: string[] = [];
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
    if (!contract) {
      missing.add(id);
      limitations.push(`Missing governed capability contract for dependency: ${id}.`);
      return;
    }
    activePath.add(id);
    for (const dep of asStrings(contract.dependencies)) visit(dep);
    activePath.delete(id);
    visited.add(id);
    ordered.push(id);
  };

  for (const id of expansion) visit(id);

  for (const id of ordered) {
    const contract = registry.get(id);
    const operator = getCapabilityOperator(id);
    if (!operator || operator.status !== "implemented") unsupported.push(id);
    else if (contract && contract.operator_id !== operator.operator_id) limitations.push(`Capability ${id} contract operator ${contract.operator_id} does not match executable operator ${operator.operator_id}.`);
    else if (contract && contract.operator_version !== operator.version) limitations.push(`Capability ${id} contract version ${contract.operator_version} does not match executable version ${operator.version}.`);
    if (contract && (!contract.output_contract || typeof contract.output_contract !== "object" || Array.isArray(contract.output_contract))) limitations.push(`Capability ${id} has no governed output contract.`);
    if (contract && (!Array.isArray(contract.lineage_requirements) || !asStrings(contract.lineage_requirements).length)) limitations.push(`Capability ${id} has no governed lineage requirements.`);
    if (contract && (!contract.resource_limits || typeof contract.resource_limits !== "object" || Array.isArray(contract.resource_limits))) limitations.push(`Capability ${id} has no governed resource limits.`);
    if (contract && (!contract.user_control || typeof contract.user_control !== "object" || Array.isArray(contract.user_control))) limitations.push(`Capability ${id} has no governed user-control policy.`);
  }

  if (missing.size) limitations.push(`Missing governed capability contracts: ${[...missing].join(", ")}.`);
  if (unsupported.length) limitations.push(`No implemented executable operator exists for: ${unsupported.join(", ")}.`);
  if (productError) limitations.push(`Provider product observation could not be read: ${productError.message}.`);
  if (fieldError) limitations.push(`Provider source-field observations could not be counted: ${fieldError.message}.`);

  const observedProducts = [...new Set((products ?? []).map((p) => p.product).filter((p): p is string => typeof p === "string"))];
  if (!observedProducts.length) limitations.push("No observed Plaid product domain is available to the planner for this user.");

  const contractsUsed = ordered.map((id) => registry.get(id)!).filter(Boolean);
  const edges = contractsUsed.reduce((n, c) => n + asStrings(c.dependencies).filter((d) => registry.has(d)).length, 0);
  const nodes = ordered.length;
  const compositions = contractsUsed.filter((c) => c.recursive || c.cross_domain).length;
  const status = cycleDetected || missing.size || unsupported.length ? "BLOCKED" : limitations.length ? "LIMITED" : "READY";

  return {
    planner_version: CAPABILITY_PLANNER_VERSION,
    requested: requestedIds,
    ordered_capabilities: ordered,
    contracts: contractsUsed,
    missing_capabilities: [...missing],
    unsupported_capabilities: unsupported,
    cycle_detected: cycleDetected,
    evidence: { observed_products: observedProducts, observed_product_count: observedProducts.length, source_field_observation_count: fieldCount ?? 0 },
    resource_estimate: { nodes, edges, compositions },
    status,
    limitations,
  };
}
