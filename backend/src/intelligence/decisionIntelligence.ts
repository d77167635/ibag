import type { CausalAnalysis } from "./causal.js";
import type { IrisDecisionGraph } from "./decisionGraph.js";
import type { FinancialStateModel } from "./financialState.js";
import type { FinancialReasoning } from "./relational.js";
import type { EvidenceNode } from "./evidenceGraph.js";

export type DecisionQuality = "high" | "moderate" | "low" | "blocked";
export type DecisionOptionKind = "monitor" | "investigate" | "reduce_pressure" | "preserve_liquidity" | "optimize_roundups";

export interface DecisionOption {
  id: string;
  kind: DecisionOptionKind;
  label: string;
  rationale: string;
  expected_effects: string[];
  risks: string[];
  constraints: string[];
  reversibility: "high" | "medium" | "low";
  evidence_state: EvidenceNode["state"];
  execution: "analysis_only";
}

export interface DecisionIntelligence {
  architecture_version: "IRIS_DECISION_INTELLIGENCE_V1";
  quality: DecisionQuality;
  quality_score: number;
  decision_ready: boolean;
  objective: string;
  options: DecisionOption[];
  governing_evidence: string[];
  constraints: string[];
  missing_evidence: string[];
  expected_consequences: string[];
  safety_rules: string[];
}

const rank: Record<EvidenceNode["state"], number> = {
  observed: 1,
  calculated: 0.9,
  inferred: 0.65,
  limited: 0.35,
  insufficient_evidence: 0,
};

function qualityFrom(score: number, blocked: boolean): DecisionQuality {
  if (blocked) return "blocked";
  if (score >= 0.85) return "high";
  if (score >= 0.65) return "moderate";
  return "low";
}

/** Converts evidence and relationships into analysis-only decision alternatives. Never executes financial actions. */
export function buildDecisionIntelligence(
  reasoning: FinancialReasoning,
  state: FinancialStateModel,
  causal: CausalAnalysis,
  graph: IrisDecisionGraph,
): DecisionIntelligence {
  const relevant = graph.nodes.filter((n) => n.kind === "risk" || n.kind === "opportunity" || n.kind === "state" || n.kind === "hypothesis");
  const score = relevant.length
    ? Number((relevant.reduce((sum, node) => sum + rank[node.evidence_state], 0) / relevant.length).toFixed(3))
    : 0;
  const blocked = graph.decision_readiness === "insufficient_evidence" || state.primary_state === "insufficient_evidence";
  const missing = [...new Set([
    ...reasoning.unresolvedQuestions,
    ...causal.hypotheses.flatMap((h) => h.missing_evidence),
    ...graph.unresolved_questions,
  ])];
  const constraints = [...new Set([
    ...state.limitations,
    ...causal.limitations,
    ...graph.limitations,
    ...(state.active_states.includes("liquidity_pressure") ? ["Preserve liquidity; do not assume funds are safely available."] : []),
    ...(state.active_states.includes("debt_pressure") ? ["Debt obligations constrain discretionary decisions."] : []),
  ])];

  const governingEvidence = relevant
    .filter((n) => n.kind !== "hypothesis")
    .sort((a, b) => rank[b.evidence_state] - rank[a.evidence_state])
    .slice(0, 10)
    .map((n) => n.label);

  const options: DecisionOption[] = [];
  const hasPressureRisk = reasoning.risks.some((r) => ["debt_acceleration", "category_spending_drift", "cash_flow_deterioration", "negative_safe_to_spend", "minimum_payment_exceeds_safe_to_spend"].includes(r.key));
  if (hasPressureRisk || state.active_states.includes("debt_pressure") || state.active_states.includes("spending_pressure") || state.active_states.includes("cash_flow_pressure")) {
    const pressureRisk = reasoning.risks.find((r) => ["debt_acceleration", "category_spending_drift", "cash_flow_deterioration", "negative_safe_to_spend", "minimum_payment_exceeds_safe_to_spend"].includes(r.key));
    options.push({
      id: "option:reduce-pressure",
      kind: "reduce_pressure",
      label: "Analyze the highest-impact pressure reduction",
      rationale: pressureRisk?.statement ?? "Current financial-state evidence indicates pressure that warrants reduction analysis.",
      expected_effects: ["Model how a reduction in the identified outflow pressure would affect economic cash flow.", "Reassess liquidity and debt-related constraints under the modeled scenario."],
      risks: ["A modeled reduction is not proof that the user can or should reduce the corresponding spending or obligation.", "Reducing one pressure may conflict with another user goal."],
      constraints,
      reversibility: "high",
      evidence_state: pressureRisk?.evidence ?? "calculated",
      execution: "analysis_only",
    });
  }

  if (reasoning.risks.length) {
    options.push({
      id: "option:investigate-risk",
      kind: "investigate",
      label: "Investigate the highest-priority risk",
      rationale: reasoning.priorityFocus?.reason ?? "A material risk is present in the current evidence.",
      expected_effects: ["Improve evidence quality before taking an irreversible action.", "Identify whether the observed risk is persistent or temporary."],
      risks: ["Investigation may not resolve the uncertainty if required provider data is unavailable."],
      constraints,
      reversibility: "high",
      evidence_state: reasoning.priorityFocus ? reasoning.risks.find((r) => r.key === reasoning.priorityFocus?.key)?.evidence ?? "insufficient_evidence" : "insufficient_evidence",
      execution: "analysis_only",
    });
  }

  if (state.active_states.includes("cash_flow_pressure") || state.active_states.includes("liquidity_pressure")) {
    options.push({
      id: "option:preserve-liquidity",
      kind: "preserve_liquidity",
      label: "Prioritize liquidity preservation in analysis",
      rationale: "Current state indicates pressure on cash availability or cash flow.",
      expected_effects: ["Reduce the chance of treating constrained funds as discretionary."],
      risks: ["May be overly conservative if unobserved liquidity exists elsewhere."],
      constraints,
      reversibility: "high",
      evidence_state: "calculated",
      execution: "analysis_only",
    });
  }

  if (reasoning.opportunities.some((o) => o.key === "roundup_accrual")) {
    options.push({
      id: "option:optimize-roundups",
      kind: "optimize_roundups",
      label: "Analyze Round-Up optimization",
      rationale: "Round-Up accrual is an observed/calculated opportunity and Round-Ups are the defined iBag feature.",
      expected_effects: ["Estimate how account-level Round-Up settings change future accrual opportunity."],
      risks: ["Round-Up availability and affordability remain dependent on real account conditions."],
      constraints: ["Phase 1 is read-only; no transfer or withdrawal is executed by this decision layer."],
      reversibility: "high",
      evidence_state: "calculated",
      execution: "analysis_only",
    });
  }

  if (!options.length) {
    options.push({
      id: "option:monitor",
      kind: "monitor",
      label: "Continue monitoring the available evidence",
      rationale: "There is not enough differentiated evidence to justify a stronger analysis path.",
      expected_effects: ["Preserve optionality while additional authorized data becomes available."],
      risks: ["Important changes may occur between observations."],
      constraints,
      reversibility: "high",
      evidence_state: blocked ? "insufficient_evidence" : "calculated",
      execution: "analysis_only",
    });
  }

  return {
    architecture_version: "IRIS_DECISION_INTELLIGENCE_V1",
    quality: qualityFrom(score, blocked),
    quality_score: score,
    decision_ready: !blocked && score >= 0.65,
    objective: state.primary_state === "insufficient_evidence" ? "Determine what additional evidence is required before making a financial decision." : `Improve the user's financial position relative to the current state: ${state.primary_state}.`,
    options,
    governing_evidence: governingEvidence,
    constraints,
    missing_evidence: missing,
    expected_consequences: options.flatMap((o) => o.expected_effects),
    safety_rules: [
      "Use only authorized provider observations and derived calculations.",
      "Never convert an inference into an observed fact.",
      "Do not claim causation where the causal layer has not established it.",
      "Do not execute money movement from the decision-intelligence layer during Phase 1.",
      "If evidence is insufficient, block rather than fabricate certainty.",
    ],
  };
}
