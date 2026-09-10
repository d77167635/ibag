import { supabaseAdmin } from "../config/supabase.js";
import { getCapabilityOperator } from "./capabilityOperators.js";

export const CAPABILITY_PLANNER_VERSION = "iris-capability-planner-v8";

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
  evidence: { observed_products: string[]; observed_product_count: number; source_field_observation_count: number; canonical_account_count: number; canonical_transaction_count: number };
  resource_estimate: { nodes: number; edges: number; compositions: number };
  status: "READY" | "LIMITED" | "BLOCKED";
  limitations: string[];
};

const AGGREGATE_CAPABILITY = "iris.full_intelligence";
const AGGREGATE_OPERATOR = "computeFullIntelligence";
const AGGREGATE_OPERATOR_VERSION = "1";
const RESOURCE_LIMITS = { nodes: 10_000, edges: 30_000, compositions: 5_000 };

function asStrings(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []; }
function requirementNames(value: unknown): string[] {
  if (Array.isArray(value)) return asStrings(value);
  if (value && typeof value === "object") return Object.entries(value).filter(([, enabled]) => enabled === true).map(([key]) => key);
  return [];
}

/** Resolve the governed capability graph against persisted contracts, executable code, and user evidence. */
export async function planCapabilities(userId: string, requested: string[]): Promise<CapabilityPlan> {
  const requestedIds = [...new Set(requested.filter(Boolean))];
  const [{ data: contracts, error: contractError }, { data: products, error: productError }, { count: fieldCount, error: fieldError }, { count: accountCount, error: accountError }, { count: transactionCount, error: transactionError }] = await Promise.all([
    supabaseAdmin.from("iris_capability_contracts").select("capability_id,version,operator_id,operator_version,evidence_requirements,dependencies,validation_rules,output_type,recursive,cross_domain").eq("active", true),
    supabaseAdmin.from("plaid_product_observations").select("product,item_id,evidence_state,lifecycle_state").eq("user_id", userId).eq("provider", "plaid").eq("is_current", true).eq("lifecycle_state", "observed").eq("evidence_state", "observed"),
    supabaseAdmin.from("iris_source_field_observations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("evidence_state", "observed"),
    supabaseAdmin.from("plaid_accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
  ]);

  if (contractError) throw new Error(`CAPABILITY_REGISTRY_READ_FAILED: ${contractError.message}`);

  const registry = new Map<string, CapabilityContract>((contracts ?? []).map(row => [row.capability_id, row as CapabilityContract]));
  const missing = new Set<string>(requestedIds.filter(id => !registry.has(id)));
  const unsupported: string[] = [];
  const contractMismatches: string[] = [];
  const ordered: string[] = [];
  const activePath = new Set<string>();
  const visited = new Set<string>();
  let cycleDetected = false;
  let requiredEvidenceMissing = false;
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
      limitations.push(`Capability dependency contract is missing: ${id}.`);
      return;
    }
    activePath.add(id);
    for (const dep of asStrings(contract.dependencies)) visit(dep);
    activePath.delete(id);
    visited.add(id);
    ordered.push(id);
  };

  for (const id of requestedIds) visit(id);

  for (const id of ordered) {
    const contract = registry.get(id);
    const operator = id === AGGREGATE_CAPABILITY ? { status: "implemented", operator_id: AGGREGATE_OPERATOR, version: AGGREGATE_OPERATOR_VERSION } : getCapabilityOperator(id);

    if (!operator || operator.status !== "implemented") {
      unsupported.push(id);
      continue;
    }
    if (contract && contract.operator_id !== operator.operator_id) {
      contractMismatches.push(id);
      limitations.push(`Capability ${id} contract operator ${contract.operator_id} does not match executable operator ${operator.operator_id}.`);
    } else if (contract && contract.operator_version !== operator.version) {
      contractMismatches.push(id);
      limitations.push(`Capability ${id} contract version ${contract.operator_version} does not match executable version ${operator.version}.`);
    }

    const requirements = requirementNames(contract?.evidence_requirements);
    if ((requirements.includes("authorized_plaid_evidence") || requirements.includes("provider_observations")) && !(products?.length ?? 0)) {
      requiredEvidenceMissing = true;
      limitations.push(`Capability ${id} requires observed provider evidence, but no observed Plaid product evidence is available.`);
    }
    if ((requirements.includes("canonical_financial_model") || requirements.includes("canonical_accounts")) && !(accountCount ?? 0)) {
      requiredEvidenceMissing = true;
      limitations.push(`Capability ${id} requires canonical financial state, but no canonical account observations are available.`);
    }
    if (requirements.includes("canonical_financial_model") && !(transactionCount ?? 0)) {
      requiredEvidenceMissing = true;
      limitations.push(`Capability ${id} requires canonical financial transactions, but no active canonical transactions are available.`);
    }
    if (requirements.includes("source_field_observations") && !(fieldCount ?? 0)) {
      requiredEvidenceMissing = true;
      limitations.push(`Capability ${id} requires source-field observations, but none are available.`);
    }
  }

  const missingCapabilities = [...missing].sort();
  if (missingCapabilities.length) limitations.push(`Missing governed capability contracts: ${missingCapabilities.join(", ")}.`);
  if (unsupported.length) limitations.push(`No implemented executable operator exists for: ${unsupported.join(", ")}.`);
  if (contractMismatches.length) limitations.push(`Persisted capability contracts do not match executable operators: ${contractMismatches.join(", ")}.`);
  if (productError) limitations.push(`Provider product observation could not be read: ${productError.message}.`);
  if (fieldError) limitations.push(`Provider source-field observations could not be counted: ${fieldError.message}.`);
  if (accountError) limitations.push(`Canonical account state could not be counted: ${accountError.message}.`);
  if (transactionError) limitations.push(`Canonical transaction state could not be counted: ${transactionError.message}.`);

  const observedProducts = [...new Set((products ?? []).map(p => p.product).filter((p): p is string => typeof p === "string"))];
  if (!observedProducts.length) limitations.push("No observed Plaid product domain is available to the planner for this user.");

  const contractsUsed = ordered.map(id => registry.get(id)!).filter(Boolean);
  const edges = contractsUsed.reduce((n, c) => n + asStrings(c.dependencies).filter(d => registry.has(d)).length, 0);
  const nodes = ordered.length;
  const compositions = contractsUsed.filter(c => c.recursive || c.cross_domain).length;
  const resourceExceeded = nodes > RESOURCE_LIMITS.nodes || edges > RESOURCE_LIMITS.edges || compositions > RESOURCE_LIMITS.compositions;
  if (resourceExceeded) limitations.push(`Capability plan exceeds resource limits: nodes=${nodes}/${RESOURCE_LIMITS.nodes}, edges=${edges}/${RESOURCE_LIMITS.edges}, compositions=${compositions}/${RESOURCE_LIMITS.compositions}.`);

  const infrastructureReadFailed = Boolean(productError || fieldError || accountError || transactionError);
  const status = cycleDetected || missingCapabilities.length || unsupported.length || contractMismatches.length || requiredEvidenceMissing || resourceExceeded || infrastructureReadFailed
    ? "BLOCKED"
    : limitations.length
      ? "LIMITED"
      : "READY";

  return {
    planner_version: CAPABILITY_PLANNER_VERSION,
    requested: requestedIds,
    ordered_capabilities: ordered,
    contracts: contractsUsed,
    missing_capabilities: missingCapabilities,
    unsupported_capabilities: unsupported,
    cycle_detected: cycleDetected,
    evidence: { observed_products: observedProducts, observed_product_count: observedProducts.length, source_field_observation_count: fieldCount ?? 0, canonical_account_count: accountCount ?? 0, canonical_transaction_count: transactionCount ?? 0 },
    resource_estimate: { nodes, edges, compositions },
    status,
    limitations,
  };
}
