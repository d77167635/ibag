import { intentDomains, type IrisIntent } from "./irisContext.js";

type IntelligenceEnvelope = Record<string, any>;

export type IrisEvidencePlan = {
  requiredDomains: string[];
  availableDomains: string[];
  missingDomains: string[];
  evidenceState: "observed" | "calculated" | "inferred" | "limited" | "insufficient_evidence";
  limitations: string[];
};

export function planIrisEvidence(intent: IrisIntent, intelligence: IntelligenceEnvelope): IrisEvidencePlan {
  const requiredDomains = intentDomains(intent);
  const availableDomains: string[] = [];
  const missingDomains: string[] = [];
  const limitations = Array.isArray(intelligence?.layer_max_intelligence?.evidence_coverage?.limitations)
    ? intelligence.layer_max_intelligence.evidence_coverage.limitations.map(String)
    : [];

  for (const domain of requiredDomains) {
    const present = hasDomain(domain, intelligence);
    (present ? availableDomains : missingDomains).push(domain);
  }

  let evidenceState: IrisEvidencePlan["evidenceState"] = "calculated";
  if (missingDomains.length === requiredDomains.length) evidenceState = "insufficient_evidence";
  else if (missingDomains.length) evidenceState = "limited";

  return { requiredDomains, availableDomains, missingDomains, evidenceState, limitations };
}

function hasDomain(domain: string, intelligence: IntelligenceEnvelope): boolean {
  if (domain === "evidence_coverage") return Boolean(intelligence?.layer_max_intelligence?.evidence_coverage);
  if (domain === "provenance") return Array.isArray(intelligence?.layer_max_intelligence?.provenance) && intelligence.layer_max_intelligence.provenance.length > 0;
  if (domain === "reasoning") return Boolean(intelligence?.layer_reasoning);
  if (domain === "behavioral") return Boolean(intelligence?.layer_behavioral);
  if (domain === "temporal") return Boolean(intelligence?.layer_temporal);
  if (domain === "debt_cost") return Boolean(intelligence?.layer_debt_cost);
  if (domain === "plaid_source" || domain === "product_observations") return false;
  const aliases: Record<string, string> = {
    cash_flow: "cash_flow",
    liquidity: "cash_flow_safety",
    spending: "spending_by_domain",
    debt: "debt_health",
    roundups: "roundup_projection",
    transactions: "layer_metrics",
    accounts: "layer_metrics",
  };
  const key = aliases[domain] ?? domain;
  return intelligence?.layer_metrics?.[key] != null;
}

export function evidenceSummary(plan: IrisEvidencePlan): string {
  if (plan.evidenceState === "insufficient_evidence") return "The required evidence is not available for a responsible answer.";
  if (plan.evidenceState === "limited") return `The answer is limited because ${plan.missingDomains.join(", ")} evidence is not currently available.`;
  return "The required intelligence domains are available for the current calculation.";
}
