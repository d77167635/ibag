import { createHash } from "node:crypto";
import type { CapabilityExecutionContext, CapabilityOperatorResult, GovernedCapabilityResult } from "./capabilityOperators.js";

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function dep(context: CapabilityExecutionContext | undefined, id: string): CapabilityOperatorResult | null {
  return context?.dependencyResults?.[id] ?? null;
}

function result(context: CapabilityExecutionContext | undefined, id: string): GovernedCapabilityResult | null {
  return dep(context, id)?.result ?? null;
}

function wrap(capabilityId: string, output: GovernedCapabilityResult, state: CapabilityOperatorResult["evidence_state"], context?: CapabilityExecutionContext): CapabilityOperatorResult {
  const dependencies = Object.entries(context?.dependencyResults ?? {})
    .map(([capability_id, value]) => ({ capability_id, evidence_state: value.evidence_state, output_hash: hash(value.result) }))
    .sort((a, b) => a.capability_id.localeCompare(b.capability_id));
  return {
    capability_id: capabilityId,
    operator_id: capabilityId,
    operator_version: "1.0.0",
    evidence_state: state,
    result: {
      ...output,
      evidence: { state, source: "certified_capability_outputs", transaction_count: output.transaction_count ?? null },
      provenance: {
        source: "certified_capability_outputs",
        provider_observations_created: false,
        financial_values_created: false,
        money_movement_executed: false,
        run_id: context?.runId ?? null,
        evidence_manifest_hash: context?.evidenceManifestHash ?? null,
        run_evidence_ids: [...(context?.runEvidenceIds ?? [])].sort(),
        evidence_boundary: context?.evidenceBoundary ?? context?.asOf ?? null,
        dependency_capabilities: dependencies,
      },
    },
  };
}

function available(context: CapabilityExecutionContext | undefined, ids: string[]): boolean {
  return ids.some(id => {
    const value = dep(context, id);
    return value !== null && value.evidence_state !== "INSUFFICIENT_EVIDENCE";
  });
}

function anomalyCount(value: GovernedCapabilityResult | null): number {
  const count = value?.detection_count;
  if (typeof count === "number" && Number.isFinite(count)) return count;
  return Array.isArray(value?.detections) ? value.detections.length : 0;
}

function observedOutflow(value: GovernedCapabilityResult | null): number | null {
  const flow = value?.flow;
  if (!flow || typeof flow !== "object") return null;
  const amount = (flow as Record<string, unknown>).outflow;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

export async function executeRisk(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  void userId;
  const anomaly = result(context, "anomaly");
  const predictive = result(context, "predictive");
  const behavioral = result(context, "behavioral");
  const analysis = result(context, "analysis");
  const signals: Array<Record<string, unknown>> = [];

  const anomalies = anomalyCount(anomaly);
  if (anomaly && anomalies > 0) {
    signals.push({ type: "observed_anomaly_signal", count: anomalies, severity: "review", basis: "robust anomaly detections" });
  }
  if (behavioral?.merchant_frequency && Array.isArray(behavioral.merchant_frequency) && behavioral.merchant_frequency.length > 0) {
    signals.push({ type: "concentration_signal", severity: "review", basis: "observed merchant frequency", count: behavioral.merchant_frequency.length });
  }
  const projection = predictive?.projection;
  if (projection && typeof projection === "object") {
    const endingBalance = (projection as Record<string, unknown>).ending_balance;
    if (typeof endingBalance === "number" && Number.isFinite(endingBalance) && endingBalance < 0) {
      signals.push({ type: "projected_negative_balance_signal", severity: "high", basis: "constrained forward projection", projected_ending_balance: endingBalance });
    }
  }

  const evidenceAvailable = available(context, ["analysis", "behavioral", "anomaly", "predictive"]);
  const state: CapabilityOperatorResult["evidence_state"] = evidenceAvailable ? "INFERRED" : "INSUFFICIENT_EVIDENCE";
  return wrap("risk", {
    risk_signals: signals,
    signal_count: signals.length,
    risk_state: signals.length ? "signals_present" : evidenceAvailable ? "no_material_signal_detected" : "insufficient_evidence",
    observed_outflow: observedOutflow(analysis),
    methodology: "Evidence-bound synthesis of certified analytical outputs; signal presence is not a probability of loss and does not establish causation.",
    transaction_count: analysis?.transaction_count ?? null,
  }, state, context);
}

export async function executeOpportunity(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  void userId;
  const analysis = result(context, "analysis");
  const behavioral = result(context, "behavioral");
  const scenario = result(context, "scenario");
  const recommendation = result(context, "recommendation");
  const opportunities: Array<Record<string, unknown>> = [];

  if (Array.isArray(analysis?.spending)) {
    for (const item of analysis.spending.slice(0, 10)) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const amount = row.amount;
      if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
        opportunities.push({ type: "spending_review", subject: row.label ?? row.key ?? "observed category", observed_amount: amount, action: "review", basis: "material observed outflow component" });
      }
    }
  }
  if (Array.isArray(behavioral?.merchant_frequency)) {
    for (const merchant of behavioral.merchant_frequency.slice(0, 5)) {
      if (merchant && typeof merchant === "object") opportunities.push({ type: "merchant_review", basis: "observed frequency", merchant });
    }
  }
  if (Array.isArray(scenario?.scenarios)) {
    opportunities.push({ type: "modeled_scenario_space", basis: "scenario analysis", scenario_count: scenario.scenarios.length, user_decision_required: true });
  }
  if (Array.isArray(recommendation?.recommendations)) {
    opportunities.push({ type: "existing_recommendation_set", basis: "certified recommendation output", count: recommendation.recommendations.length });
  }

  const evidenceAvailable = available(context, ["analysis", "behavioral", "scenario", "recommendation"]);
  const state: CapabilityOperatorResult["evidence_state"] = evidenceAvailable ? "INFERRED" : "INSUFFICIENT_EVIDENCE";
  return wrap("opportunity", {
    opportunities: opportunities.slice(0, 50),
    opportunity_count: Math.min(opportunities.length, 50),
    opportunity_state: evidenceAvailable ? "investigation_candidates" : "insufficient_evidence",
    methodology: "Observed or modeled areas for user investigation; no savings, return, or behavioral outcome is promised.",
    transaction_count: analysis?.transaction_count ?? null,
  }, state, context);
}

export async function executeConsequence(userId: string, context?: CapabilityExecutionContext): Promise<CapabilityOperatorResult> {
  void userId;
  const risk = result(context, "risk");
  const opportunity = result(context, "opportunity");
  const scenario = result(context, "scenario");
  const decision = result(context, "decision");
  const consequences: Array<Record<string, unknown>> = [];

  if (Array.isArray(risk?.risk_signals)) {
    for (const signal of risk.risk_signals) consequences.push({ direction: "risk", consequence: "requires_review", source_signal: signal, certainty: "conditional" });
  }
  if (Array.isArray(opportunity?.opportunities)) {
    for (const item of opportunity.opportunities.slice(0, 10)) consequences.push({ direction: "opportunity", consequence: "investigation_may_inform_choice", source_opportunity: item, certainty: "conditional" });
  }
  if (Array.isArray(scenario?.scenarios)) {
    consequences.push({ direction: "scenario", consequence: "modeled_change_can_alter_projected_context", scenario_count: scenario.scenarios.length, certainty: "scenario_only" });
  }
  if (decision) {
    consequences.push({ direction: "decision", consequence: "decision_options_require_user_selection", decision_available: true, certainty: "conditional" });
  }

  const evidenceAvailable = available(context, ["risk", "opportunity", "scenario", "decision"]);
  const state: CapabilityOperatorResult["evidence_state"] = evidenceAvailable ? "INFERRED" : "INSUFFICIENT_EVIDENCE";
  return wrap("consequence", {
    consequences: consequences.slice(0, 100),
    consequence_count: Math.min(consequences.length, 100),
    consequence_state: evidenceAvailable ? "conditional_implications" : "insufficient_evidence",
    methodology: "Conditional implications propagated from certified risk, opportunity, scenario, and decision outputs; no future outcome is asserted.",
    transaction_count: risk?.transaction_count ?? opportunity?.transaction_count ?? null,
  }, state, context);
}
