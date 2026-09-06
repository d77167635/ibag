export type IrisGovernorPolicy = {
  architecture_version: "IRIS_GOVERNOR_V1";
  customer_access: false;
  admin_only: true;
  production_promotion_requires_admin: true;
  execution_capability: false;
  money_movement_capability: false;
  fabricated_financial_data: false;
  provider_observations_created: false;
  external_knowledge_is_financial_evidence: false;
};

export type IrisGovernorOperation = {
  id: string;
  product_domains: string[];
  layer_ids: string[];
  operation: string;
  order: string[];
  status: "candidate" | "validated" | "promoted" | "rejected";
  evidence_ready: boolean;
  creates_new_analysis: boolean;
  financial_values_created: false;
  provider_observations_created: false;
  execution_capability: false;
  limitation: string | null;
};

/**
 * Governance contract for Admin Iris. This is intentionally a policy/data model,
 * not an execution engine. Candidate analytics can be composed and evaluated,
 * but production promotion remains an explicit administrator-controlled action.
 */
export function buildIrisGovernorPolicy(): IrisGovernorPolicy {
  return {
    architecture_version: "IRIS_GOVERNOR_V1",
    customer_access: false,
    admin_only: true,
    production_promotion_requires_admin: true,
    execution_capability: false,
    money_movement_capability: false,
    fabricated_financial_data: false,
    provider_observations_created: false,
    external_knowledge_is_financial_evidence: false,
  };
}

export function evaluateIrisGovernorOperation(input: Omit<IrisGovernorOperation, "status" | "financial_values_created" | "provider_observations_created" | "execution_capability">): IrisGovernorOperation {
  const uniqueProducts = [...new Set(input.product_domains)];
  const uniqueLayers = [...new Set(input.layer_ids)];
  const order = input.order.filter(Boolean);
  const validOrder = order.length > 0 && new Set(order).size === order.length;
  const evidenceReady = input.evidence_ready && uniqueProducts.length > 0 && uniqueLayers.length > 0 && validOrder;
  return {
    ...input,
    product_domains: uniqueProducts,
    layer_ids: uniqueLayers,
    order,
    status: evidenceReady ? "candidate" : "rejected",
    evidence_ready: evidenceReady,
    financial_values_created: false,
    provider_observations_created: false,
    execution_capability: false,
    limitation: evidenceReady ? "Candidate analytics require validation and explicit administrator promotion before production use." : "Operation cannot be evaluated until its evidence boundary, inputs, and ordered operation path are complete.",
  };
}
