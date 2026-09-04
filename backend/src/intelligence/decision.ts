import { supabaseAdmin } from "../config/supabase.js";
import type { FinancialReasoning } from "./relational.js";

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
  if (reasoning.priorityFocus) parts.push(reasoning.priorityFocus.reason);
  if (facts.safeToSpend !== null) {
    parts.push(`Safe-to-spend is ${money(facts.safeToSpend)}, based on ${facts.essentialBillsCount} known essential bill${facts.essentialBillsCount === 1 ? "" : "s"} due soon.`);
  } else parts.push("There isn't enough account data yet to estimate safe-to-spend.");
  if (facts.cashFlowNet !== null) {
    parts.push(`Cash flow over the last 30 days is ${facts.cashFlowNet >= 0 ? "positive" : "negative"} (${money(facts.cashFlowNet)}).`);
    if (facts.cashFlowNetChangePct !== null) {
      const pct = Math.abs(facts.cashFlowNetChangePct).toFixed(0);
      parts.push(pct === "0" ? "That's about the same as the prior 30 days." : `That's ${facts.cashFlowNetChangePct >= 0 ? "up" : "down"} ${pct}% versus the prior 30 days.`);
    }
  }
  if (facts.debtChangePct !== null) {
    parts.push(`Revolving debt has ${facts.debtChangePct >= 0 ? "increased" : "decreased"} ${Math.abs(facts.debtChangePct).toFixed(0)}% over the last 30 days.`);
  }
  if (facts.anomalyCount > 0) {
    parts.push(`${facts.anomalyCount} transaction${facts.anomalyCount === 1 ? " looks" : "s look"} unusually large compared to that merchant's typical amount — see below.`);
  }
  if (reasoning.unresolvedQuestions.length > 0) parts.push(reasoning.unresolvedQuestions[0]);
  return parts.join(" ");
}

/** Records the top-level intelligence snapshot without forcing a textual key into a numeric column. */
export async function recordExplainabilityTrace(userId: string, reasoning: FinancialReasoning) {
  const { error } = await supabaseAdmin.from("calculation_audit_log").insert({
    user_id: userId,
    metric_key: "dashboard_intelligence_snapshot",
    inputs: {
      riskKeys: reasoning.risks.map((r) => r.key),
      opportunityKeys: reasoning.opportunities.map((o) => o.key),
      unresolvedCount: reasoning.unresolvedQuestions.length,
      priorityFocusKey: reasoning.priorityFocus?.key ?? null,
    },
    result: null,
  });
  if (error) throw error;
}
