import { IRIS_AUTHORITATIVE_DOMAINS } from "./irisAuthoritativeDomainCoverage.js";

/**
 * Read-only test fixtures for the eight authoritative Level-2 domains.
 *
 * These are structural provider-evidence fixtures only. They intentionally
 * contain symbolic test identifiers and provider field paths, never financial
 * values, user records, credentials, tokens, or production identifiers.
 *
 * The fixture models the proof chain that a real provider observation must
 * satisfy:
 *
 * provider observation -> registered source field -> run evidence
 * -> source-evidence lineage -> first intelligence node
 * -> recursive derived node(s) -> reverse traversal -> report dependency.
 *
 * No fixture is written to Supabase and no fixture is treated as live evidence.
 */
export type IrisAuthoritativeDomainGateFixture = {
  domain: string;
  product: string;
  family_node_key: string;
  provider: "plaid";
  source_field: {
    symbolic_id: string;
    provider_path: string;
  };
  observation: {
    symbolic_id: string;
    evidence_state: "observed";
    raw_observation_symbol: string;
  };
  run_evidence: {
    symbolic_id: string;
    source_field_symbolic_id: string;
    raw_observation_symbol: string;
  };
  forward_lineage: Array<{
    lineage_role: "SOURCE_EVIDENCE" | "DEPENDENCY_INPUT";
    source_symbolic_id: string;
    destination_symbolic_id: string;
  }>;
  recursive_nodes: Array<{
    symbolic_id: string;
    capability_id: string;
    upstream_symbolic_ids: string[];
  }>;
  reverse_report: {
    report_dependency_key: string;
    reachable_from_node_symbolic_ids: string[];
  };
};

const FIELD_PATHS: Record<string, string> = {
  authentication: "institution.institution_id",
  transactions: "transactions[*].transaction_id",
  balance: "accounts[*].account_id",
  identity: "identity.names[*].name",
  assets: "accounts[*].type",
  liabilities: "liabilities[*].account_id",
  investments: "holdings[*].security_id",
  statements: "statements[*].statement_id",
};

function fixtureFor(
  definition: (typeof IRIS_AUTHORITATIVE_DOMAINS)[number],
): IrisAuthoritativeDomainGateFixture {
  const slug = definition.domain.replace(/[^a-z0-9]+/g, "_");
  const sourceFieldId = `fixture:${slug}:source_field`;
  const observationId = `fixture:${slug}:observation`;
  const runEvidenceId = `fixture:${slug}:run_evidence`;
  const sourceNodeId = `fixture:${slug}:intelligence:source`;
  const derivedNodeId = `fixture:${slug}:intelligence:derived`;
  const reportKey = `fixture:${slug}:report_dependency`;

  return {
    domain: definition.domain,
    product: definition.product,
    family_node_key: definition.nodeKey,
    provider: "plaid",
    source_field: {
      symbolic_id: sourceFieldId,
      provider_path: FIELD_PATHS[definition.domain],
    },
    observation: {
      symbolic_id: observationId,
      evidence_state: "observed",
      raw_observation_symbol: `fixture:${slug}:raw_observation`,
    },
    run_evidence: {
      symbolic_id: runEvidenceId,
      source_field_symbolic_id: sourceFieldId,
      raw_observation_symbol: `fixture:${slug}:raw_observation`,
    },
    forward_lineage: [
      {
        lineage_role: "SOURCE_EVIDENCE",
        source_symbolic_id: runEvidenceId,
        destination_symbolic_id: sourceNodeId,
      },
      {
        lineage_role: "DEPENDENCY_INPUT",
        source_symbolic_id: sourceNodeId,
        destination_symbolic_id: derivedNodeId,
      },
    ],
    recursive_nodes: [
      {
        symbolic_id: sourceNodeId,
        capability_id: `fixture:${slug}:source_intelligence`,
        upstream_symbolic_ids: [],
      },
      {
        symbolic_id: derivedNodeId,
        capability_id: `fixture:${slug}:derived_intelligence`,
        upstream_symbolic_ids: [sourceNodeId],
      },
    ],
    reverse_report: {
      report_dependency_key: reportKey,
      reachable_from_node_symbolic_ids: [sourceNodeId, derivedNodeId],
    },
  };
}

export const IRIS_AUTHORITATIVE_DOMAIN_GATE_FIXTURES: readonly IrisAuthoritativeDomainGateFixture[] =
  IRIS_AUTHORITATIVE_DOMAINS.map(fixtureFor);
