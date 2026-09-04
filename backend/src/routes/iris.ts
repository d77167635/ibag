import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";
import { resolveIrisContext, type IrisQuestionContext } from "../intelligence/irisContext.js";
import { evidenceSummary, planIrisEvidence } from "../intelligence/irisEvidence.js";
import { buildReasoningTrace } from "../intelligence/reasoningTrace.js";
import { verifyProviderLineage } from "../intelligence/evidenceGraph.js";

export const irisRouter = Router();

function money(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "not available from current evidence";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function answerFor(intent: ReturnType<typeof resolveIrisContext>["intent"], intel: any, accountCount: number, evidencePlan: ReturnType<typeof planIrisEvidence>) {
  const metrics = intel?.layer_metrics ?? {};
  const limitations = evidencePlan.limitations;
  const evidence = intel?.layer_max_intelligence?.provenance ?? [];
  const base = { intent, evidence_state: evidencePlan.evidenceState, account_count: accountCount, evidence: evidence.slice(0, 12), evidence_plan: evidencePlan, limitations, financial_state: intel?.financial_state ?? null, uncertainty: intel?.uncertainty ?? null, causal_analysis: intel?.causal_analysis ?? null };

  switch (intent) {
    case "liquidity": {
      const s = metrics.cash_flow_safety;
      if (s?.safeToSpend == null) return { ...base, evidence_state: "insufficient_evidence", answer: "I can't responsibly give you a safe-to-spend amount from the evidence currently available. The required liquidity inputs are incomplete or insufficient." };
      return { ...base, answer: `Iris currently calculates ${money(s.safeToSpend)} as the safe-to-spend amount over the current ${s.horizonDays ?? "available"}-day horizon. This is a calculated view of observed evidence, not a guarantee of future cash.` };
    }
    case "cash_flow": {
      const c = metrics.cash_flow;
      if (!c) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient cash-flow evidence to answer that yet." };
      return { ...base, answer: `For the current observed window, Iris sees ${money(c.inflow)} of inflows, ${money(c.outflow)} of outflows, and net flow of ${money(c.net)}. ${c.netChangePct == null ? "A reliable prior-window comparison is not available." : `Net flow is ${c.netChangePct >= 0 ? "up" : "down"} ${Math.abs(c.netChangePct).toFixed(0)}% versus the comparison window.`}` };
    }
    case "spending": {
      const domains = Array.isArray(metrics.spending_by_domain) ? metrics.spending_by_domain : [];
      if (!domains.length) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have enough categorized spending evidence to explain your spending yet." };
      const top = domains.slice().sort((a: any, b: any) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 3);
      return { ...base, answer: `Your largest observed spending domains in the current analysis are ${top.map((d: any) => `${d.label ?? d.key} (${money(d.amount)})`).join(", ")}. I can drill into merchants, transactions, changes over time, and the evidence behind any one of these.` };
    }
    case "debt": {
      const d = metrics.debt_health;
      if (!d) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient liability evidence to assess your debt position yet." };
      return { ...base, answer: `Iris currently observes revolving debt of ${money(d.revolving_debt)}${d.credit_utilization == null ? ". Credit utilization is not sufficiently evidenced." : ` with calculated utilization of ${(d.credit_utilization * 100).toFixed(0)}%.`}` };
    }
    case "roundups": {
      const r = metrics.roundup_projection;
      if (!r) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient Round-Up evidence to answer that yet." };
      return { ...base, answer: `Iris has Round-Up intelligence available from the observed contribution ledger. The current projection is ${money(r.projectedAmount ?? r.projected)} when a numeric projection is available. I can distinguish observed contributions from calculated projections.` };
    }
    case "anomaly": {
      const anomalies = Array.isArray(metrics.anomalies) ? metrics.anomalies.slice(0, 5) : [];
      if (!anomalies.length) return { ...base, answer: "Iris does not currently have a material anomaly finding in the available evidence. That does not prove nothing unusual occurred; it means no supported anomaly finding is currently surfaced." };
      return { ...base, answer: `Iris currently has ${anomalies.length} surfaced anomaly finding${anomalies.length === 1 ? "" : "s"}. The highest-priority findings should be investigated against their underlying transactions rather than treated as proven fraud or causation.` };
    }
    case "provider_data":
      return { ...base, evidence_state: "limited", answer: "Provider facts remain read-only source information. Iris can explain or analyze information supplied by Plaid, but it does not rewrite provider facts. The current provider surface should be used to inspect the source record itself." };
    case "explanation":
      return { ...base, answer: `${evidenceSummary(evidencePlan)} Iris separates provider observations from Iris calculations and inferences. A specific explanation should trace the relevant observation, calculation, time window, evidence state, provenance, and limitations.` };
    case "overview":
      return { ...base, answer: intel?.narrative ?? "Iris does not have enough evidence to produce a complete financial interpretation yet." };
    default:
      return { ...base, evidence_state: "limited", answer: "I understand the question, but I don't yet have a safe, evidence-grounded interpretation for that question type. Iris can work across the available financial evidence and will identify when additional evidence is required rather than inventing an answer." };
  }
}

irisRouter.post("/iris/ask", requireAuth, async (req: AuthedRequest, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "Question is required" });
  if (question.length > 2000) return res.status(400).json({ error: "Question is too long" });

  try {
    const userId = req.userId!;
    const suppliedContext: IrisQuestionContext = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
    const resolved = resolveIrisContext(question, suppliedContext);
    const [{ data: accounts, error: accountError }, intelligence, providerLineage] = await Promise.all([
      supabaseAdmin.from("plaid_accounts").select("id").eq("user_id", userId),
      computeFullIntelligence(userId),
      verifyProviderLineage(supabaseAdmin, userId),
    ]);
    if (accountError) return res.status(500).json({ error: accountError.message });
    const evidencePlan = planIrisEvidence(resolved.intent, intelligence);
    const reasoningTrace = buildReasoningTrace(resolved.intent, intelligence.evidence_graph);
    const answer = answerFor(resolved.intent, intelligence, accounts?.length ?? 0, evidencePlan);
    res.json({
      question: resolved.normalizedQuestion,
      context: resolved.context,
      generated_at: new Date().toISOString(),
      provider_lineage: providerLineage,
      reasoning_trace: reasoningTrace,
      ...answer,
    });
  } catch (error) {
    console.error("Iris question failed", error);
    res.status(500).json({ error: "Iris could not complete the question from the current evidence" });
  }
});
