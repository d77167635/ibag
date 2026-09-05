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

type ProviderDomainSynthesis = {
  selected_item_id?: string | null;
  evidence_ready?: boolean;
  derived?: {
    net_worth?: number | null;
    net_worth_components?: Record<string, number | null> | null;
    portfolio?: { holding_count?: number; security_count?: number; institution_value?: number | null } | null;
    liability_state?: { liability_balance?: number | null; liability_count?: number } | null;
    statement_reconciliation?: { statement_records?: number; statement_accounts?: number; dollar_reconciliation?: number | null } | null;
    account_integrity?: { auth_accounts?: number; identity_accounts?: number } | null;
  };
  domains?: Record<string, { observed?: boolean; raw_observation_count?: number }>;
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
  providerDomains?: ProviderDomainSynthesis;
  evidenceReady?: boolean;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function buildHigherOrderSynthesis(input: SynthesisInput) {
  if (input.evidenceReady === false) {
    return {
      engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V4",
      findings: [] as HigherOrderFinding[],
      lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
      generation: { source: "certified Iris analytical outputs", financial_values_created: false, fake_mock_or_seeded_data: false, findings_are_calculated_not_observed: true, execution_capability: false, evidence_gate: "closed" },
    };
  }

  const findings: HigherOrderFinding[] = [];
  const utilization = input.creditUtilization;
  const debt = input.revolvingDebt;
  const cashFlow = input.cashFlowNet;
  const liquid = input.liquidAssets;
  const safe = input.safeToSpend;
  const projected = input.forwardProjected;
  const roundupProjected = input.roundupProjected;
  const provider = input.providerDomains;

  if (finite(debt) && debt > 0 && finite(utilization) && utilization >= 0.30 && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "debt-cashflow-interaction", title: "Debt pressure coincides with negative cash flow", conclusion: "Iris calculates revolving-debt pressure and negative economic cash flow in the same evidence window.", evidence: { revolving_debt: debt, credit_utilization: utilization, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "The relationship does not establish causation." });
  }
  if (finite(liquid) && finite(safe) && safe < 0 && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "liquidity-cashflow-interaction", title: "Liquidity and cash-flow pressure are aligned", conclusion: "The current evidence shows negative safe-to-spend capacity alongside negative economic cash flow.", evidence: { liquid_assets: liquid, safe_to_spend: safe, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "Safe-to-spend is calculated and does not establish future insolvency." });
  }
  if (finite(projected) && finite(liquid) && projected < liquid && finite(cashFlow) && cashFlow < 0) {
    findings.push({ id: "forward-liquidity-direction", title: "Forward projection points below current liquid position", conclusion: "The evidence-bounded forward model projects a lower liquid position while current economic cash flow is negative.", evidence: { current_liquid_assets: liquid, projected_liquid_position: projected, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "The projection is model-based, not guaranteed." });
  }
  if (finite(roundupProjected) && roundupProjected > 0 && finite(safe) && safe > 0) {
    findings.push({ id: "roundup-capacity-interaction", title: "Round-Up opportunity exists within positive spending capacity", conclusion: "Observed purchases support a positive Round-Up projection while Iris calculates positive safe-to-spend capacity.", evidence: { projected_roundups: roundupProjected, safe_to_spend: safe }, confidence: "calculated", limitation: "Round-Up is an opportunity calculation, not money movement." });
  }

  if (provider?.evidence_ready && provider.selected_item_id) {
    const d = provider.derived ?? {};
    if (finite(d.net_worth)) {
      findings.push({ id: "provider-net-worth-state", title: "Provider-domain net worth is incorporated", conclusion: "Iris incorporates the certified same-Item provider-domain net-worth calculation into higher-order financial-state synthesis.", evidence: { selected_item_id: provider.selected_item_id, provider_net_worth: d.net_worth }, confidence: "calculated", limitation: "Net worth is calculated from non-overlapping provider account bases; it is not an observed provider field." });
    }
    if (d.portfolio && (d.portfolio.holding_count ?? 0) > 0) {
      findings.push({ id: "provider-portfolio-state", title: "Investment portfolio evidence is incorporated", conclusion: "Iris incorporates certified same-Item investment holdings into portfolio-state synthesis without double-counting them as separate net-worth assets.", evidence: { selected_item_id: provider.selected_item_id, holding_count: d.portfolio.holding_count ?? 0, security_count: d.portfolio.security_count ?? 0, institution_value: d.portfolio.institution_value ?? null }, confidence: "calculated", limitation: "Portfolio holdings are provider observations used analytically; valuation is only reported when safely evidenced." });
    }
    if (d.liability_state && (d.liability_state.liability_count ?? 0) > 0) {
      findings.push({ id: "provider-liability-state", title: "Liability-domain evidence is incorporated", conclusion: "Iris incorporates same-Item liability evidence into debt-state synthesis while retaining account-level debt calculations separately.", evidence: { selected_item_id: provider.selected_item_id, liability_count: d.liability_state.liability_count ?? 0, liability_balance: d.liability_state.liability_balance ?? null }, confidence: "calculated", limitation: "Liability totals are only aggregated when provider currency and numeric evidence are sufficiently unambiguous." });
    }
    if (d.statement_reconciliation && (d.statement_reconciliation.statement_records ?? 0) > 0) {
      findings.push({ id: "provider-statement-history", title: "Statement evidence is incorporated into financial history", conclusion: "Iris incorporates certified same-Item statement coverage into historical-state synthesis and preserves dollar reconciliation as unavailable until transaction-period matching is evidenced.", evidence: { selected_item_id: provider.selected_item_id, statement_records: d.statement_reconciliation.statement_records ?? 0, statement_accounts: d.statement_reconciliation.statement_accounts ?? 0, dollar_reconciliation: d.statement_reconciliation.dollar_reconciliation ?? null }, confidence: "calculated", limitation: "Statement coverage is not equivalent to dollar reconciliation until statement-period transactions are explicitly matched." });
    }
    if (d.account_integrity && ((d.account_integrity.auth_accounts ?? 0) > 0 || (d.account_integrity.identity_accounts ?? 0) > 0)) {
      findings.push({ id: "provider-account-integrity", title: "Auth and identity evidence is incorporated", conclusion: "Iris incorporates same-Item Auth and Identity observations into account-integrity context rather than treating them as financial amounts.", evidence: { selected_item_id: provider.selected_item_id, auth_accounts: d.account_integrity.auth_accounts ?? 0, identity_accounts: d.account_integrity.identity_accounts ?? 0 }, confidence: "calculated", limitation: "Identity and Auth observations provide account context; they do not by themselves prove ownership or identity beyond the provider response." });
    }
  }

  for (const finding of (input.crossDomainFindings ?? []).slice(0, 8)) {
    if (finding.confidence !== "calculated") continue;
    findings.push({ id: `synthesis-${finding.id}`, title: `Cross-domain signal: ${finding.title}`, conclusion: "A bounded cross-domain relationship is calculated from canonical evidence and is available for deeper investigation.", evidence: finding.evidence, confidence: "calculated", limitation: "This synthesis does not infer causation from association." });
  }

  const decision = input.decision;
  const consequences = input.consequences;
  const optimization = input.optimization;
  if (decision && decision.decision_ready && decision.options.length) {
    const preferred = optimization?.preferred_option_id ? decision.options.find((o) => o.id === optimization.preferred_option_id) : null;
    if (preferred) {
      const scenario = consequences?.scenarios.find((s) => s.decision_option_id === preferred.id);
      findings.push({ id: "decision-consequence-optimization-chain", title: "Evidence supports a decision-to-consequence analysis chain", conclusion: "Iris can connect the preferred analytical option, its modeled consequence, and the current optimization objective without executing the option.", evidence: { option_id: preferred.id, option_kind: preferred.kind, modeled_change: scenario?.modeled_change ?? null, optimization_score: optimization?.scores.find((s) => s.option_id === preferred.id)?.total_score ?? null }, confidence: "calculated", limitation: "The preferred option and modeled consequence are analytical, not guaranteed outcomes." });
    }
  }

  if (decision && consequences && optimization && optimization.scores.length > 1) {
    const preferred = optimization.preferred_option_id ? optimization.scores.find((s) => s.option_id === optimization.preferred_option_id) : null;
    const second = preferred ? optimization.scores.find((s) => s.option_id !== preferred.option_id && s.total_score > 0) : null;
    if (preferred && second) {
      findings.push({ id: "optimization-sensitivity", title: "Decision preference has measurable ranking sensitivity", conclusion: `The leading analytical option exceeds the next viable option by ${(preferred.total_score - second.total_score).toFixed(3)} score points.", evidence: { preferred_option_id: preferred.option_id, preferred_score: preferred.total_score, next_option_id: second.option_id, next_score: second.total_score }, confidence: "calculated", limitation: "Optimization scores are deterministic comparisons, not probabilities." });
    }
  }

  return {
    engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V4",
    findings: findings.slice(0, 20),
    lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
    generation: { source: "certified Iris analytical outputs plus same-Item provider-domain analytical outputs", financial_values_created: false, fake_mock_or_seeded_data: false, findings_are_calculated_not_observed: true, execution_capability: false, evidence_gate: "open" },
  };
}
