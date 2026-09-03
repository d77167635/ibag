import { supabaseAdmin } from "../config/supabase.js";
import type { FinancialReasoning } from "./relational.js";

/**
 * LAYER 11/12 — DECISION NARRATIVE & EXPLAINABILITY
 *
 * money() and buildNarrative() moved here from services/intelligence.ts —
 * narrative generation is a decision/communication concern, not a metric
 * primitive, and belongs with the layer that already ranks what matters
 * most (relational.ts's priorityFocus).
 *
 * buildNarrative is extended (not just moved) to speak from the full
 * FinancialReasoning object, so the top-line summary now leads with
 * whatever the risk-ranking layer determined is highest priority, instead
 * of a fixed recitation order (safe-to-spend, then cash flow, then debt).
 * The fixed-order version silently implied that order = importance; it
 * usually wasn't.
 */

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildNarrative(
  reasoning: FinancialReasoning,
  facts: {
    safeToSpend: number | null;
    essentialBillsCount: number;
    cashFlowNet: number | null;
    cashFlowNetChangePct: number | null;
    debtChangePct: number | null;
    anomalyCount: number;
  }
): string {
  const parts: string[] = [];

  // Lead with whatever relational.ts determined is the priority — the
  // narrative's first sentence is now decision-ranked, not fixed-order.
  if (reasoning.priorityFocus) {
    parts.push(reasoning.priorityFocus.reason);
  }

  if (facts.safeToSpend !== null) {
    parts.push(
      `Safe-to-spend is ${money(facts.safeToSpend)}, based on ${facts.essentialBillsCount} known essential bill${
        facts.essentialBillsCount === 1 ? "" : "s"
      } due soon.`
    );
  } else {
    parts.push("There isn't enough account data yet to estimate safe-to-spend.");
  }

  if (facts.cashFlowNet !== null) {
    const direction = facts.cashFlowNet >= 0 ? "positive" : "negative";
    parts.push(`Cash flow over the last 30 days is ${direction} (${money(facts.cashFlowNet)}).`);
    if (facts.cashFlowNetChangePct !== null) {
      const pct = Math.abs(facts.cashFlowNetChangePct).toFixed(0);
      parts.push(
        pct === "0"
          ? "That's about the same as the prior 30 days."
          : `That's ${facts.cashFlowNetChangePct >= 0 ? "up" : "down"} ${pct}% versus the prior 30 days.`
      );
    }
  }

  if (facts.debtChangePct !== null) {
    parts.push(
      `Revolving debt has ${facts.debtChangePct >= 0 ? "increased" : "decreased"} ${Math.abs(
        facts.debtChangePct
      ).toFixed(0)}% over the last 30 days.`
    );
  }

  if (facts.anomalyCount > 0) {
    parts.push(
      `${facts.anomalyCount} transaction${
        facts.anomalyCount === 1 ? " looks" : "s look"
      } unusually large compared to that merchant's typical amount — see below.`
    );
  }

  if (reasoning.unresolvedQuestions.length > 0) {
    parts.push(reasoning.unresolvedQuestions[0]);
  }

  return parts.join(" ");
}

/**
 * Writes one row per top-level intelligence response to calculation_audit_log
 * — the explainability layer. This does not replace the per-sweep audit
 * rows roundup.ts already writes; it adds a record of what the FULL
 * dashboard response was, at what time, so "why did the app tell me X on
 * date Y" is answerable later even after underlying data changes.
 */
export async function recordExplainabilityTrace(userId: string, reasoning: FinancialReasoning) {
  await supabaseAdmin.from("calculation_audit_log").insert({
    user_id: userId,
    metric_key: "dashboard_intelligence_snapshot",
    inputs: {
      riskKeys: reasoning.risks.map((r) => r.key),
      opportunityKeys: reasoning.opportunities.map((o) => o.key),
      unresolvedCount: reasoning.unresolvedQuestions.length,
    },
    result: reasoning.priorityFocus?.key ?? null,
  });
}
