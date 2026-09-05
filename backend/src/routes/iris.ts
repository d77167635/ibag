import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";
import { resolveIrisContext, type IrisQuestionContext } from "../intelligence/irisContext.js";
import { evidenceSummary, planIrisEvidence } from "../intelligence/irisEvidence.js";
import { buildReasoningTrace } from "../intelligence/reasoningTrace.js";
import { verifyProviderLineage } from "../intelligence/evidenceGraph.js";
import { retrieveProviderEvidence } from "../intelligence/providerEvidence.js";
import { answerProviderQuestion } from "../intelligence/providerQuestion.js";
import { buildTrialProductIntelligence } from "../intelligence/trialProductIntelligence.js";

export const irisRouter = Router();

function money(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "not available from current evidence";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PRODUCT_GATED_INTENTS = new Set(["overview", "cash_flow", "spending", "liquidity", "debt", "roundups", "anomaly"]);

function answerFor(intent: ReturnType<typeof resolveIrisContext>["intent"], intel: any, accountCount: number, evidencePlan: ReturnType<typeof planIrisEvidence>, providerAnswer?: string | null, trialProducts?: any) {
  const metrics = intel?.layer_metrics ?? {};
  const limitations = evidencePlan.limitations;
  const evidence = intel?.layer_max_intelligence?.provenance ?? [];
  const productSelection = trialProducts?.selection ?? null;
  const base = {
    intent,
    evidence_state: evidencePlan.evidenceState,
    account_count: accountCount,
    evidence: evidence.slice(0, 12),
    evidence_plan: evidencePlan,
    limitations,
    financial_state: intel?.financial_state ?? null,
    uncertainty: intel?.uncertainty ?? null,
    causal_analysis: intel?.causal_analysis ?? null,
    product_evidence: {
      observed_products: trialProducts?.observed_products ?? [],
      observed_by_item: trialProducts?.observed_by_item ?? {},
      consumed_products: trialProducts?.consumed_products ?? [],
      consumed_analyses: trialProducts?.consumed_analyses ?? [],
      selection: productSelection,
    },
  };

  if (PRODUCT_GATED_INTENTS.has(intent) && productSelection && productSelection.evidence_ready === false) {
    const blocked = (productSelection.blocked_combinations ?? []).slice(0, 4).map((x: any) => `${x.key}${x.missing_products?.length ? ` (missing: ${x.missing_products.join(", ")})` : ""}`).join("; ");
    return {
      ...base,
      evidence_state: "insufficient_evidence",
      answer: `Iris cannot responsibly answer this financial question from the currently certified Plaid evidence. Required product evidence is incomplete or not available on the same Plaid Item${blocked ? `. Blocked combinations: ${blocked}` : "."}`,
    };
  }

  switch (intent) {
    case "liquidity": {
      const s = metrics.cash_flow_safety;
      if (s?.safeToSpend == null) return { ...base, evidence_state: "insufficient_evidence", answer: "I can't responsibly give you a safe-to-spend amount from the evidence currently available. The required liquidity inputs are incomplete or insufficient." };
      return { ...base, answer: `Iris currently calculates ${money(s.safeToSpend)} as the safe-to-spend amount over the current ${s.horizonDays ?? "available"}-day horizon. This combines the canonical transaction and balance evidence that is certified for this question; it is a calculated view, not a guarantee of future cash.` };
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
      return { ...base, answer: `Your largest observed spending domains in the current analysis are ${top.map((d: any) => `${d.label ?? d.key} (${money(d.amount)})`).join(", ")}. Iris can combine transaction evidence with certified balance, statement, liability, asset, or investment evidence only when those provider observations are actually current and observed.` };
    }
    case "debt": {
      const d = metrics.debt_health;
      const cost = intel?.layer_debt_cost;
      if (!d) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient liability, balance, and transaction evidence to assess your debt position yet." };
      const utilization = d.credit_utilization == null ? "Credit utilization is not sufficiently evidenced." : `calculated utilization is ${(d.credit_utilization * 100).toFixed(0)}%`;
      const trend = d.change_pct_30d == null ? "A reliable 30-day debt trend is not available." : `revolving debt is ${d.change_pct_30d >= 0 ? "up" : "down"} ${Math.abs(d.change_pct_30d).toFixed(0)}% over the comparison window`;
      const apr = cost?.weightedAvgApr == null ? "No balance-weighted APR is currently available from observed liability evidence." : `the balance-weighted APR is ${Number(cost.weightedAvgApr).toFixed(2)}%`;
      const interest = cost?.estimatedMonthlyInterestCost == null ? "Monthly interest cost cannot be calculated from the currently observed liability fields." : `the simple estimated monthly interest cost is ${money(Number(cost.estimatedMonthlyInterestCost))}`;
      return { ...base, answer: `Iris currently observes revolving debt of ${money(d.revolving_debt)}; ${utilization}. ${trend}. From the certified Plaid liability evidence, ${apr}; ${interest}. These are calculated views from current evidence, not a payoff guarantee.` };
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
      return { ...base, evidence_state: providerAnswer ? "observed" : "limited", answer: providerAnswer ?? "Provider facts remain read-only source information. Iris can explain or analyze information supplied by Plaid, but it does not rewrite provider facts. I retrieved the current provider evidence snapshot, but the question needs a narrower source query to answer without guessing." };
    case "explanation":
      return { ...base, answer: `${evidenceSummary(evidencePlan)} Iris separates provider observations from Iris calculations and inferences. A specific explanation should trace the relevant observation, calculation, time window, evidence state, provenance, limitations, and—when applicable—the exact combination of certified Plaid product evidence used.` };
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
    const [{ data: accounts, error: accountError }, intelligence, providerLineage, providerEvidence, trialProductIntelligence] = await Promise.all([
      supabaseAdmin.from("plaid_accounts").select("id").eq("user_id", userId),
      computeFullIntelligence(userId),
      verifyProviderLineage(supabaseAdmin, userId),
      retrieveProviderEvidence(supabaseAdmin, userId, suppliedContext),
      buildTrialProductIntelligence(userId, resolved.intent),
    ]);
    if (accountError) return res.status(500).json({ error: accountError.message });
    const evidencePlan = planIrisEvidence(resolved.intent, intelligence);
    const reasoningTrace = buildReasoningTrace(resolved.intent, intelligence.evidence_graph);
    const providerAnswer = answerProviderQuestion(question, providerEvidence);
    const answer = answerFor(resolved.intent, intelligence, accounts?.length ?? 0, evidencePlan, providerAnswer, trialProductIntelligence);
    res.json({ question: resolved.normalizedQuestion, context: resolved.context, generated_at: new Date().toISOString(), provider_lineage: providerLineage, provider_evidence: providerEvidence, trial_product_intelligence: trialProductIntelligence, reasoning_trace: reasoningTrace, ...answer });
  } catch (error) {
    console.error("Iris question failed", error);
    res.status(500).json({ error: "Iris could not complete the question from the current evidence" });
  }
});
