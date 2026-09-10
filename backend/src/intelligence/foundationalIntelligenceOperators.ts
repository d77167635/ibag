import { createHash } from "node:crypto";
import { getCanonicalTransactions } from "./transactionSemantics.js";
import { buildCanonicalLifeState } from "./canonicalLifeState.js";
import { buildRelationalOntologyExpansion } from "./relationalOntologyExpansion.js";
import type { CapabilityExecutionContext, CapabilityOperatorResult, GovernedCapabilityResult } from "./capabilityOperators.js";

type Tx = Awaited<ReturnType<typeof getCanonicalTransactions>>[number];

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function transactions(userId: string, context?: CapabilityExecutionContext): Promise<Tx[]> {
  const anchor = context?.asOf ? new Date(context.asOf) : new Date();
  const boundary = context?.evidenceBoundary ?? context?.asOf ?? null;
  const cutoff = new Date(anchor.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
  return getCanonicalTransactions(userId, cutoff, boundary, context?.runId ?? null);
}

function wrap(
  capabilityId: string,
  result: GovernedCapabilityResult,
  state: CapabilityOperatorResult["evidence_state"],
  context?: CapabilityExecutionContext,
  dependencies: CapabilityOperatorResult[] = [],
): CapabilityOperatorResult {
  const dependencyCapabilities = dependencies
    .map(value => ({ capability_id: value.capability_id, evidence_state: value.evidence_state, output_hash: hash(value.result) }))
    .sort((a, b) => a.capability_id.localeCompare(b.capability_id));
  return {
    capability_id: capabilityId,
    operator_id: capabilityId,
    operator_version: "1.0.0",
    evidence_state: state,
    result: {
      ...result,
      evidence: {
        state,
        source: "canonical_financial_transactions",
        transaction_count: result.transaction_count ?? null,
      },
      provenance: {
        source: "canonical_financial_transactions",
        provider_observations_created: false,
        financial_values_created: false,
        money_movement_executed: false,
        run_id: context?.runId ?? null,
        evidence_manifest_hash: context?.evidenceManifestHash ?? null,
        run_evidence_ids: [...(context?.runEvidenceIds ?? [])].sort(),
        evidence_boundary: context?.evidenceBoundary ?? context?.asOf ?? null,
        dependency_capabilities: dependencyCapabilities,
      },
    },
  };
}

export async function executeFinancialLifeState(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context);
  const state = txs.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE";
  const lifeState = buildCanonicalLifeState(txs, context?.evidenceBoundary ?? context?.asOf ?? null);
  return wrap("financial_life_state", { canonical_life_state: lifeState, transaction_count: txs.length }, state, context);
}

export async function executeRelationalOntology(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  const txs = await transactions(userId, context);
  const lifeState = context?.dependencyResults?.financial_life_state;
  const relationships = buildRelationalOntologyExpansion(txs);
  const state = txs.length ? "CALCULATED" : "INSUFFICIENT_EVIDENCE";
  return wrap(
    "relational_ontology",
    {
      architecture_version: "IRIS_RELATIONAL_ONTOLOGY_V2",
      relationships,
      relation_count: relationships.length,
      financial_life_state_dependency: lifeState
        ? { evidence_state: lifeState.evidence_state, output_hash: hash(lifeState.result) }
        : null,
      limitation: txs.length
        ? "Relationships are calculated from shared canonical observations and do not establish causation, intent, necessity, or future behavior."
        : "No canonical transaction evidence is available to construct relational observations.",
      transaction_count: txs.length,
    },
    state,
    context,
    lifeState ? [lifeState] : [],
  );
}
