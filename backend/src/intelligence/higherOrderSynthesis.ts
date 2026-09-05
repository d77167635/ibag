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
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Produces only bounded, calculated cross-domain conclusions from already-certified
 * Iris analytical outputs. It never creates financial observations or provider facts.
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
    findings.push({
      id: "debt-cashflow-interaction",
      title: "Debt pressure coincides with negative cash flow",
      conclusion: "Observed revolving debt pressure and negative economic cash flow occur together in the current evidence window.",
      evidence: { revolving_debt: debt, credit_utilization: utilization, cash_flow_net: cashFlow },
      confidence: "calculated",
      limitation: "This relationship does not establish that debt caused the cash-flow deficit or that reducing debt will resolve it."
    });
  }

  if (finite(liquid) && finite(safe) && safe < 0 && finite(cashFlow) && cashFlow < 0) {
    findings.push({
      id: "liquidity-cashflow-interaction",
      title: "Liquidity and cash-flow pressure are aligned",
      conclusion: "The current evidence shows negative safe-to-spend capacity alongside negative economic cash flow.",
      evidence: { liquid_assets: liquid, safe_to_spend: safe, cash_flow_net: cashFlow },
      confidence: "calculated",
      limitation: "Safe-to-spend is an Iris calculation; this does not establish future insolvency or predict an exact account outcome."
    });
  }

  if (finite(projected) && finite(liquid) && projected < liquid && finite(cashFlow) && cashFlow < 0) {
    findings.push({
      id: "forward-liquidity-direction",
      title: "Forward projection points below current liquid position",
      conclusion: "The evidence-bounded forward model projects a lower liquid position than the current observed liquid position while current economic cash flow is negative.",
      evidence: { current_liquid_assets: liquid, projected_liquid_position: projected, cash_flow_net: cashFlow },
      confidence: "calculated",
      limitation: "The projection is model-based and does not establish a guaranteed future balance."
    });
  }

  if (finite(roundupProjected) && roundupProjected > 0 && finite(safe) && safe > 0) {
    findings.push({
      id: "roundup-capacity-interaction",
      title: "Round-Up opportunity exists within positive spending capacity",
      conclusion: "The observed transaction set supports a positive Round-Up projection while Iris currently calculates positive safe-to-spend capacity.",
      evidence: { projected_roundups: roundupProjected, safe_to_spend: safe },
      confidence: "calculated",
      limitation: "The Round-Up amount is an opportunity calculation, not a money movement or commitment."
    });
  }

  const crossDomain = input.crossDomainFindings ?? [];
  for (const finding of crossDomain.slice(0, 8)) {
    if (finding.confidence !== "calculated") continue;
    findings.push({
      id: `synthesis-${finding.id}`,
      title: `Cross-domain signal: ${finding.title}`,
      conclusion: "A bounded cross-domain relationship is present in the canonical evidence and is available for deeper investigation.",
      evidence: finding.evidence,
      confidence: "calculated",
      limitation: "This synthesis preserves the underlying finding's evidence boundary and does not infer causation from association."
    });
  }

  return {
    engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V1",
    findings: findings.slice(0, 16),
    lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
    generation: {
      source: "certified Iris analytical outputs and evidence-bounded cross-domain findings",
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      findings_are_calculated_not_observed: true
    }
  };
}
