import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { getCanonicalTransactions } from "./transactionSemantics.js";
import { buildCanonicalLifeState } from "./canonicalLifeState.js";
import { buildRelationalOntologyExpansion } from "./relationalOntologyExpansion.js";
import { buildIncomeIntelligence, buildRecurrenceIntelligence } from "./financialLifeStateExtensions.js";
import { buildDebtPaymentIntelligence } from "./debtPaymentIntelligence.js";
import { buildLiabilityIntelligence, type LiabilityObservation } from "./liabilityIntelligence.js";
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

async function exactLiabilityObservations(userId: string, context?: CapabilityExecutionContext): Promise<LiabilityObservation[]> {
  if (!context?.runId) return [];
  const boundary = context.evidenceBoundary ?? context.asOf ?? null;
  const evidenceQuery = await supabaseAdmin
    .from("iris_run_evidence")
    .select("raw_observation_id,effective_at,acquired_at")
    .eq("run_id", context.runId)
    .eq("user_id", userId)
    .eq("provider", "plaid")
    .eq("evidence_type", "provider_raw_liability");
  if (evidenceQuery.error) throw new Error(`LIABILITY_RUN_EVIDENCE_READ_FAILED: ${evidenceQuery.error.message}`);

  const evidenceRows = (evidenceQuery.data ?? []).filter(row => typeof row.raw_observation_id === "string");
  const ids = [...new Set(evidenceRows.map(row => row.raw_observation_id as string))];
  if (!ids.length) return [];

  let query = supabaseAdmin
    .from("plaid_raw_liabilities")
    .select("id,account_id,effective_at,acquired_at,raw_response,evidence_state")
    .eq("user_id", userId)
    .in("id", ids)
    .eq("evidence_state", "observed");
  if (boundary) query = query.lte("acquired_at", boundary);
  const rawQuery = await query;
  if (rawQuery.error) throw new Error(`LIABILITY_RAW_READ_FAILED: ${rawQuery.error.message}`);

  const evidenceById = new Map(evidenceRows.map(row => [row.raw_observation_id as string, row]));
  return (rawQuery.data ?? []).map(row => {
    const evidence = evidenceById.get(row.id);
    return {
      id: row.id,
      account_id: row.account_id,
      effective_at: row.effective_at ?? evidence?.effective_at ?? null,
      acquired_at: row.acquired_at ?? evidence?.acquired_at ?? null,
      raw_response: row.raw_response,
    };
  });
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
  const income = buildIncomeIntelligence(txs);
  const recurrence = buildRecurrenceIntelligence(txs);
  const debtPayments = buildDebtPaymentIntelligence(txs);
  const liabilityObservations = await exactLiabilityObservations(userId, context);
  const liabilities = buildLiabilityIntelligence(liabilityObservations);
  return wrap(
    "financial_life_state",
    {
      canonical_life_state: {
        ...lifeState,
        income,
        recurrence,
        debt_payments: debtPayments,
        liabilities,
        life_state_extensions: {
          income_version: "IRIS_INCOME_INTELLIGENCE_V1",
          recurrence_version: "IRIS_RECURRENCE_INTELLIGENCE_V1",
          debt_payment_version: "IRIS_DEBT_PAYMENT_INTELLIGENCE_V1",
          liability_version: "IRIS_LIABILITY_INTELLIGENCE_V1",
        },
      },
      transaction_count: txs.length,
    },
    state,
    context,
  );
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
