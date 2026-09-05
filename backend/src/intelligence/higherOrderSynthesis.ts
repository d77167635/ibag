import type { DecisionIntelligence } from "./decisionIntelligence.js";
import type { ConsequenceModel } from "./consequence.js";
import type { OptimizationIntelligence } from "./optimization.js";

export type HigherOrderFinding = {
  id: string;
  title: string;
  conclusion: string;
  evidence: Record<string, string | number | boolean | null>;
  confidence: "calculated" | "insufficient_evidence";
  limitation: string | null;
};

type SynthesisInput = {
  liquidAssets?: number | null;
  safeToSpend?: number | null;
  cashFlowNet?: number | null;
  revolvingDebt?: number | null;
  creditUtilization?: number | null;
  forwardProjected?: number | null;
  roundupProjected?: number | null;
  anomalies?: number;
  crossDomainFindings?: Array<{ id: string; kind: string; title: string; evidence: Record<string, string | number>; confidence: string }>;
  decision?: DecisionIntelligence;
  consequences?: ConsequenceModel;
  optimization?: OptimizationIntelligence;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Highest-order deterministic synthesis over already-certified Iris analytical outputs.
 * It never creates observations, provider facts, predictions, or executable financial actions.
 */
export function buildHigherOrderSynthesis(input: SynthesisInput) {
  const findings: HigherOrderFinding[] = [];
  const utilization = input.creditUtilization;
  const debt = input.revolvingDebt;
  const cashFlow = input.cashFlowNet;
  const liquid = input.liquidAssets;
  const safe = input.safeToSpend;
  const projected = input.forwardProjected;
  const roundupProjected = input.roundupProjected;

  if (finite(debt) && debt > 0 && finite(utilization) && utilization >= 0.30 && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "debt-cashflow-interaction", title: "Debt pressure coincides with negative cash flow", conclusion: "Observed revolving debt pressure and negative economic cash flow occur together in the current evidence window.", evidence: { revolving_debt: debt, credit_utilization: utilization, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "This relationship does not establish that debt caused the cash-flow deficit or that reducing debt will resolve it." });
  }
  if (finite(liquid) && finite(safe) && safe < 0 && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "liquidity-cashflow-interaction", title: "Liquidity and cash-flow pressure are aligned", conclusion: "The current evidence shows negative safe-to-spend capacity alongside negative economic cash flow.", evidence: { liquid_assets: liquid, safe_to_spend: safe, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "Safe-to-spend is an Iris calculation; this does not establish future insolvency or predict an exact account outcome." });
  }
  if (finite(projected) && finite(liquid) && projected < liquid && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "forward-liquidity-direction", title: "Forward projection points below current liquid position", conclusion: "The evidence-bounded forward model projects a lower liquid position than the current observed liquid position while current economic cash flow is negative.", evidence: { current_liquid_assets: liquid, projected_liquid_position: projected, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "The projection is model-based and does not establish a guaranteed future balance." });
  }
  if (finite(roundupProjected) && roundupProjected > 0 && finite(safe) && safe > 0) {
    findings.push({ id: "roundup-capacity-interaction", title: "Round-Up opportunity exists within positive spending capacity", conclusion: "The observed transaction set supports a positive Round-Up projection while Iris currently calculates positive safe-to-spend capacity.", evidence: { projected_roundups: roundupProjected, safe_to_spend: safe }, confidence: "calculated", limitation: "The Round-Up amount is an opportunity calculation, not a money movement or commitment." });
  }

  for (const finding of (input.crossDomainFindings ?? []).slice(0, 8)) {
    if (finding.confidence !== "calculated") continue;
    findings.push({ id: `synthesis-${finding.id}`, title: `Cross-domain signal: ${finding.title}`, conclusion: "A bounded cross-domain relationship is present in the canonical evidence and is available for deeper investigation.", evidence: finding.evidence, confidence: "calculated", limitation: "This synthesis preserves the underlying finding's evidence boundary and does not infer causation from association." });
  }

  const decision = input.decision;
  const consequences = input.consequences;
  const optimization = input.optimization;
  if (decision && decision.decision_ready && decision.options.length) {
    const preferred = optimization?.preferred_option_id ? decision.options.find((o) => o.id === optimization.preferred_option_id) : null;
    if (preferred) {
      const scenario = consequences?.scenarios.find((s) => s.decision_option_id === preferred.id);
      findings.push({
        id: "decision-consequence-optimization-chain",
        title: "Evidence supports a decision-to-consequence analysis chain",
        conclusion: `Iris can connect the preferred analytical option, its modeled consequence, and the current optimization objective without executing the option.`,
        evidence: { option_id: preferred.id, option_kind: preferred.kind, modeled_change: scenario?.modeled_change ?? null, optimization_score: optimization?.scores.find((s) => s.option_id === preferred.id)?.total_score ?? null },
        confidence: "calculated",
        limitation: "The preferred option is an analytical ranking, and its modeled consequence is illustrative rather than a guaranteed outcome.",
      });
    }
  }

  if (decision && consequences && optimization && optimization.scores.length > 1) {
    const preferred = optimization.preferred_option_id ? optimization.scores.find((s) => s.option_id === optimization.preferred_option_id) : null;
    const second = preferred ? optimization.scores.find((s) => s.option_id !== preferred.option_id && s.total_score > 0) : null;
    if (preferred && second) {
      findings.push({
        id: "optimization-sensitivity",
        title: "Decision preference has measurable ranking sensitivity",
        conclusion: `The leading analytical option exceeds the next viable option by ${(preferred.total_score - second.total_score).toFixed(3)} score points; the ranking should be treated as more or less sensitive to assumptions accordingly.`,
        evidence: { preferred_option_id: preferred.option_id, preferred_score: preferred.total_score, next_option_id: second.option_id, next_score: second.total_score },
        confidence: "calculated",
        limitation: "Optimization scores are deterministic analytical comparisons, not probabilities or guarantees of user outcomes.",
      });
    }
  }

  return {
    engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V2",
    findings: findings.slice(0, 20),
    lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
    generation: {
      source: "certified Iris analytical outputs, evidence-bounded cross-domain findings, decision alternatives, consequence models, and optimization rankings",
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      findings_are_calculated_not_observed: true,
      execution_capability: false,
    }
  };
}
