import { supabaseAdmin } from "../config/supabase.js";

export const IRIS_AUTHORITATIVE_DOMAINS = [
  { domain: "authentication", product: "auth", nodeKey: "auth_evidence" },
  { domain: "transactions", product: "transactions", nodeKey: "tx_evidence" },
  { domain: "balance", product: "balance", nodeKey: "balance_evidence" },
  { domain: "identity", product: "identity", nodeKey: "identity_evidence" },
  { domain: "assets", product: "assets", nodeKey: "assets_evidence" },
  { domain: "liabilities", product: "liabilities", nodeKey: "liability_evidence" },
  { domain: "investments", product: "investments", nodeKey: "investment_evidence" },
  { domain: "statements", product: "statements", nodeKey: "statement_evidence" },
] as const;

type DomainNodeRow = { key: string; id: string; node_type: string; active: boolean };
type SourceFieldCountRow = { family_node_id: string; count: number };

export type IrisAuthoritativeDomainCoverage = {
  architecture_domains: typeof IRIS_AUTHORITATIVE_DOMAINS;
  domains: Array<{
    domain: string;
    product: string;
    node_key: string;
    family_node_present: boolean;
    family_node_id: string | null;
    observed_source_field_count: number;
    runtime_observation_state: "observed" | "no_observation";
    structural_state: "defined_and_registered" | "defined_but_unregistered" | "not_registered";
  }>;
  completeness: {
    domain_count: number;
    family_nodes_present: number;
    domains_with_observed_source_fields: number;
    structurally_complete: boolean;
    runtime_complete: boolean;
  };
};

/**
 * Audits the eight authoritative Level-2 domains without creating nodes,
 * observations, evidence, or user data. Registry metadata is not promoted to
 * runtime evidence. A domain is runtime-observed only when exact source-field
 * observations exist for its registered family node.
 */
export async function auditIrisAuthoritativeDomainCoverage(): Promise<IrisAuthoritativeDomainCoverage> {
  const { data: nodes, error: nodeError } = await supabaseAdmin
    .from("iris_intelligence_nodes")
    .select("id,key,node_type,active")
    .in("key", IRIS_AUTHORITATIVE_DOMAINS.map((domain) => domain.nodeKey));
  if (nodeError) throw new Error(`IRIS_DOMAIN_COVERAGE_NODE_LOOKUP_FAILED: ${nodeError.message}`);

  const domainNodes = (nodes ?? []) as DomainNodeRow[];
  const nodeByKey = new Map(domainNodes.map((node) => [node.key, node]));
  const familyNodeIds = domainNodes.filter((node) => node.node_type === "data_family" && node.active).map((node) => node.id);

  const counts = new Map<string, number>();
  if (familyNodeIds.length) {
    const { data, error } = await supabaseAdmin
      .from("iris_intelligence_source_fields")
      .select("family_node_id")
      .in("family_node_id", familyNodeIds)
      .eq("active", true);
    if (error) throw new Error(`IRIS_DOMAIN_COVERAGE_SOURCE_FIELD_LOOKUP_FAILED: ${error.message}`);
    for (const row of (data ?? []) as SourceFieldCountRow[]) counts.set(row.family_node_id, (counts.get(row.family_node_id) ?? 0) + 1);
  }

  const domains = IRIS_AUTHORITATIVE_DOMAINS.map((definition) => {
    const node = nodeByKey.get(definition.nodeKey);
    const familyNodePresent = !!node && node.node_type === "data_family" && node.active;
    const observedSourceFieldCount = familyNodePresent ? counts.get(node!.id) ?? 0 : 0;
    return {
      domain: definition.domain,
      product: definition.product,
      node_key: definition.nodeKey,
      family_node_present: familyNodePresent,
      family_node_id: familyNodePresent ? node!.id : null,
      observed_source_field_count: observedSourceFieldCount,
      runtime_observation_state: observedSourceFieldCount > 0 ? "observed" as const : "no_observation" as const,
      structural_state: familyNodePresent
        ? observedSourceFieldCount > 0 ? "defined_and_registered" as const : "defined_but_unregistered" as const
        : "not_registered" as const,
    };
  });

  const familyNodesPresent = domains.filter((domain) => domain.family_node_present).length;
  const domainsWithObservedSourceFields = domains.filter((domain) => domain.observed_source_field_count > 0).length;

  return {
    architecture_domains: IRIS_AUTHORITATIVE_DOMAINS,
    domains,
    completeness: {
      domain_count: domains.length,
      family_nodes_present: familyNodesPresent,
      domains_with_observed_source_fields: domainsWithObservedSourceFields,
      structurally_complete: familyNodesPresent === domains.length,
      runtime_complete: domainsWithObservedSourceFields === domains.length,
    },
  };
}
