import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";

export const irisRouter = Router();

type QuestionIntent =
  | "overview"
  | "cash_flow"
  | "spending"
  | "liquidity"
  | "debt"
  | "roundups"
  | "anomaly"
  | "explanation"
  | "unknown";

function classifyQuestion(question: string): QuestionIntent {
  const q = question.toLowerCase();
  if (/round.?ups?|spare change|ibag balance/.test(q)) return "roundups";
  if (/safe to spend|liquid|liquidity|available cash|cash on hand/.test(q)) return "liquidity";
  if (/cash flow|cashflow|income.*expense|inflow|outflow/.test(q)) return "cash_flow";
  if (/spend|spending|expense|expenses|merchant|category|where.*money/.test(q)) return "spending";
  if (/debt|credit card|utilization|loan|liabilit/.test(q)) return "debt";
  if (/anomal|unusual|strange|unexpected|different|spike/.test(q)) return "anomaly";
  if (/why|explain|how.*calculate|how.*work|what.*mean/.test(q)) return "explanation";
  if (/what.*happen|what.*going on|overview|summar|tell me|financial life|money/.test(q)) return "overview";
  return "unknown";
}

function money(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "not available from current evidence";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function answerFor(intent: QuestionIntent, intel: any, accountCount: number) {
  const limitations = Array.isArray(intel?.maximum_intelligence?.evidence_coverage?.limitations)
    ? intel.maximum_intelligence.evidence_coverage.limitations
    : [];
  const evidence = intel?.maximum_intelligence?.provenance ?? [];
  const base = {
    intent,
    evidence_state: "calculated",
    account_count: accountCount,
    evidence: evidence.slice(0, 12),
    limitations,
  };

  switch (intent) {
    case "liquidity": {
      const s = intel?.cash_flow_safety;
      if (s?.safeToSpend == null) return { ...base, evidence_state: "insufficient_evidence", answer: "I can't responsibly give you a safe-to-spend amount from the evidence currently available. The required liquidity inputs are incomplete or insufficient." };
      return { ...base, answer: `Iris currently calculates ${money(s.safeToSpend)} as the safe-to-spend amount over the current ${s.horizonDays ?? "available"}-day horizon. This is a calculated view of observed evidence, not a guarantee of future cash.` };
    }
    case "cash_flow": {
      const c = intel?.cash_flow;
      if (!c) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient cash-flow evidence to answer that yet." };
      return { ...base, answer: `For the current observed window, Iris sees ${money(c.inflow)} of inflows, ${money(c.outflow)} of outflows, and net flow of ${money(c.net)}. ${c.netChangePct == null ? "A reliable prior-window comparison is not available." : `Net flow is ${c.netChangePct >= 0 ? "up" : "down"} ${Math.abs(c.netChangePct).toFixed(0)}% versus the comparison window.`}` };
    }
    case "spending": {
      const domains = Array.isArray(intel?.spending_by_domain) ? intel.spending_by_domain.slice(0, 8) : [];
      if (!domains.length) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have enough categorized spending evidence to explain your spending yet." };
      const top = domains.slice().sort((a: any, b: any) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 3);
      return { ...base, answer: `Your largest observed spending domains in the current analysis are ${top.map((d: any) => `${d.label ?? d.key} (${money(d.amount)})`).join(", ")}. I can drill into merchants, transactions, changes over time, and the evidence behind any one of these.` };
    }
    case "debt": {
      const d = intel?.debt_health;
      if (!d) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient liability evidence to assess your debt position yet." };
      return { ...base, answer: `Iris currently observes revolving debt of ${money(d.revolvingDebt)}${d.creditUtilization == null ? ". Credit utilization is not sufficiently evidenced." : ` with calculated utilization of ${(d.creditUtilization * 100).toFixed(0)}%.`}` };
    }
    case "roundups": {
      const r = intel?.roundup_projection;
      if (!r) return { ...base, evidence_state: "insufficient_evidence", answer: "I don't have sufficient Round-Up evidence to answer that yet." };
      return { ...base, answer: `Iris has Round-Up intelligence available from the observed contribution ledger. The current projection is ${money(r.projectedAmount ?? r.projected)} when a numeric projection is available. I can distinguish observed contributions from calculated projections.` };
    }
    case "anomaly": {
      const anomalies = Array.isArray(intel?.anomalies) ? intel.anomalies.slice(0, 5) : [];
      if (!anomalies.length) return { ...base, answer: "Iris does not currently have a material anomaly finding in the available evidence. That does not prove nothing unusual occurred; it means no supported anomaly finding is currently surfaced." };
      return { ...base, answer: `Iris currently has ${anomalies.length} surfaced anomaly finding${anomalies.length === 1 ? "" : "s"}. The highest-priority findings should be investigated against their underlying transactions rather than treated as proven fraud or causation.` };
    }
    case "explanation":
      return { ...base, answer: "Iris separates provider observations from Iris calculations and inferences. When you ask about a specific number or finding, Iris should trace the answer back to the relevant observed objects, calculation, time window, evidence state, and limitations. Select the item you want explained and ask again for a context-specific explanation." };
    case "overview":
      return { ...base, answer: intel?.narrative ?? "Iris does not have enough evidence to produce a complete financial interpretation yet." };
    default:
      return { ...base, evidence_state: "limited", answer: "I understand the question, but I don't yet have a safe, evidence-grounded interpretation for that question type. Ask me about your spending, cash flow, liquidity, debt, Round-Ups, anomalies, or a specific piece of information and I can work from the available evidence." };
  }
}

irisRouter.post("/iris/ask", requireAuth, async (req: AuthedRequest, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "Question is required" });
  if (question.length > 2000) return res.status(400).json({ error: "Question is too long" });

  try {
    const userId = req.userId!;
    const [{ data: accounts, error: accountError }, intelligence] = await Promise.all([
      supabaseAdmin.from("plaid_accounts").select("id").eq("user_id", userId),
      computeFullIntelligence(userId),
    ]);
    if (accountError) return res.status(500).json({ error: accountError.message });
    const intent = classifyQuestion(question);
    res.json({ question, ...answerFor(intent, intelligence, accounts?.length ?? 0) });
  } catch (error) {
    console.error("Iris question failed", error);
    res.status(500).json({ error: "Iris could not complete the question from the current evidence" });
  }
});
