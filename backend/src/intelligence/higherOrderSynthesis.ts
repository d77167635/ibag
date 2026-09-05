import type { DecisionIntelligence } from "./decisionIntelligence.js";
import type { ConsequenceModel } from "./consequence.js";
import type { OptimizationIntelligence } from "./optimization.js";
import { buildProviderDomainIntelligence } from "./providerDomainIntelligence.js";

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
  evidenceReady?: boolean;
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Highest-order deterministic synthesis over certified Iris analytical outputs.
 * Provider-domain inputs are independently revalidated here so higher-order findings
 * cannot claim eight-domain execution from capability declarations alone.
 */
export async function buildHigherOrderSynthesis(input: SynthesisInput) {
  if (input.evidenceReady === false) {
    return {
      engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V4",
      findings: [] as HigherOrderFinding[],
      lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
      generation: { source: "certified Iris analytical outputs and evidence-bounded provider-domain inputs", financial_values_created: false, fake_mock_or_seeded_data: false, findings_are_calculated_not_observed: true, execution_capability: false, evidence_gate: "closed" },
    };
  }

  const provider = await buildProviderDomainIntelligence((input as any).userId ?? "");
  const findings: HigherOrderFinding[] = [];
  const utilization = input.creditUtilization;
  const debt = input.revolvingDebt;
  const cashFlow = input.cashFlowNet;
  const liquid = input.liquidAssets;
  const safe = input.safeToSpend;
  const projected = input.forwardProjected;
  const roundupProjected = input.roundupProjected;

  if (provider.evidence_ready) {
    const d = provider.domains ?? {};
    findings.push({ id: "full-eight-domain-financial-state", title: "All eight Plaid evidence domains are available to the analytical state", conclusion: "Iris has a single certified Plaid Item containing Auth, Transactions, Balance, Identity, Assets, Liabilities, Investments, and Statements, and the provider-domain analytical pass has consumed those real observations without combining Items.", evidence: { selected_item_id: provider.selected_item_id, auth_records: d.auth?.account_records ?? 0, transaction_records: d.transactions?.transaction_records ?? 0, balance_records: d.balance?.balance_records ?? 0, identity_records: d.identity?.record_count ?? 0, asset_items: d.assets?.asset_items ?? 0, liability_records: d.liabilities?.liability_records ?? 0, investment_holdings: d.investments?.holding_records ?? 0, statement_records: d.statements?.statement_records ?? 0 }, confidence: "calculated", limitation: "This certifies provider-domain analytical consumption and same-Item evidence availability; it does not imply that every possible downstream financial conclusion is valid or that any financial action was executed." });
    if (provider.derived?.net_worth != null) findings.push({ id: "provider-net-worth-state", title: "Provider-domain net-worth state is available", conclusion: "Iris has a same-Item net-worth calculation derived from mutually exclusive Plaid account-balance categories, with investment holdings and assets-report balances excluded from the total to prevent double counting.", evidence: { net_worth: provider.derived.net_worth, selected_item_id: provider.selected_item_id }, confidence: "calculated", limitation: "Net worth is a calculated analytical value using the observed currency-safe account balance basis; it is not a provider-reported net-worth figure." });
    const portfolio = provider.derived?.portfolio;
    if (portfolio) findings.push({ id: "provider-portfolio-state", title: "Investment portfolio evidence is incorporated", conclusion: "Iris has incorporated observed investment holdings and securities from the certified Item into portfolio analysis while keeping those holdings out of the account-balance net-worth basis.", evidence: { holdings: portfolio.holdings ?? 0, securities: portfolio.securities ?? 0, market_value: portfolio.market_value ?? null, selected_item_id: provider.selected_item_id }, confidence: "calculated", limitation: "Portfolio values depend on the provider fields actually present; absent valuation fields are not inferred." });
    const statement = provider.derived?.statement_reconciliation;
    if (statement) findings.push({ id: "provider-statement-history", title: "Statement history is incorporated with explicit reconciliation limits", conclusion: "Iris has incorporated the observed statement records and their account overlap with transaction history. It does not label account overlap as dollar reconciliation.", evidence: { statement_records: statement.statement_records ?? 0, statement_accounts: statement.statement_accounts ?? 0, transaction_account_overlap: statement.transaction_account_overlap ?? 0, dollar_reconciliation: statement.dollar_reconciliation ?? null, selected_item_id: provider.selected_item_id }, confidence: "calculated", limitation: statement.limitation ?? "Dollar reconciliation remains unavailable until statement-period and transaction-amount matching is evidenced." });
    const integrityState = provider.derived?.account_integrity;
    if (integrityState) findings.push({ id: "provider-account-integrity", title: "Auth, identity, and balance evidence are incorporated", conclusion: "Iris has incorporated the certified Item's Auth and Identity records alongside its observed balance accounts for account-integrity analysis.", evidence: { auth_records: integrityState.auth_records ?? 0, identity_records: integrityState.identity_records ?? 0, balance_accounts: integrityState.balance_accounts ?? 0, identity_auth_match: integrityState.identity_auth_match ?? null, selected_item_id: provider.selected_item_id }, confidence: "calculated", limitation: "Record-count agreement is not proof of identity correctness; Iris does not infer identity facts beyond the provider evidence." });
  }

  if (finite(debt) && debt > 0 && finite(utilization) && utilization >= 0.30 && finite(cashFlow) && cashFlow < 0) findings.push({ id: "debt-cashflow-interaction", title: "Debt pressure coincides with negative cash flow", conclusion: "Iris calculates revolving-debt pressure and negative economic cash flow in the same evidence window.", evidence: { revolving_debt: debt, credit_utilization: utilization, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "Debt pressure is an Iris calculation; the relationship does not establish causation." });
  if (finite(liquid) && finite(safe) && safe < 0 && finite(cashFlow) && cashFlow < 0) findings.push({ id: "liquidity-cashflow-interaction", title: "Liquidity and cash-flow pressure are aligned", conclusion: "The current evidence shows negative safe-to-spend capacity alongside negative economic cash flow.", evidence: { liquid_assets: liquid, safe_to_spend: safe, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "Safe-to-spend is calculated and does not establish future insolvency." });
  if (finite(projected) && finite(liquid) && projected < liquid && finite(cashFlow) && cashFlow < 0) findings.push({ id: "forward-liquidity-direction", title: "Forward projection points below current liquid position", conclusion: "The evidence-bounded forward model projects a lower liquid position than the current observed liquid position while current economic cash flow is negative.", evidence: { current_liquid_assets: liquid, projected_liquid_position: projected, cash_flow_net: cashFlow }, confidence: "calculated", limitation: "The projection is model-based and is not a guaranteed future balance." });
  if (finite(roundupProjected) && roundupProjected > 0 && finite(safe) && safe > 0) findings.push({ id: "roundup-capacity-interaction", title: "Round-Up opportunity exists within positive spending capacity", conclusion: "The observed transaction set supports a positive Round-Up projection while Iris currently calculates positive safe-to-spend capacity.", evidence: { projected_roundups: roundupProjected, safe_to_spend: safe }, confidence: "calculated", limitation: "The Round-Up amount is an opportunity calculation, not money movement." });

  for (const finding of (input.crossDomainFindings ?? []).slice(0, 8)) {
    if (finding.confidence !== "calculated") continue;
    findings.push({ id: `synthesis-${finding.id}`, title: `Cross-domain signal: ${finding.title}`, conclusion: "A bounded cross-domain relationship is calculated from canonical evidence and is available for deeper investigation.", evidence: finding.evidence, confidence: "calculated", limitation: "This synthesis preserves the underlying finding's evidence boundary and does not infer causation." });
  }

  const decision = input.decision;
  const consequences = input.consequences;
  const optimization = input.optimization;
  if (decision && decision.decision_ready && decision.options.length) {
    const preferred = optimization?.preferred_option_id ? decision.options.find((o) => o.id === optimization.preferred_option_id) : null;
    if (preferred) {
      const scenario = consequences?.scenarios.find((s) => s.decision_option_id === preferred.id);
      findings.push({ id: "decision-consequence-optimization-chain", title: "Evidence supports a decision-to-consequence analysis chain", conclusion: "Iris can connect the preferred analytical option, its modeled consequence, and the current optimization objective without executing the option.", evidence: { option_id: preferred.id, option_kind: preferred.kind, modeled_change: scenario?.modeled_change ?? null, optimization_score: optimization?.scores.find((s) => s.option_id === preferred.id)?.total_score ?? null }, confidence: "calculated", limitation: "The preferred option is an analytical ranking, and its modeled consequence is not guaranteed." });
    }
  }
  if (decision && consequences && optimization && optimization.scores.length > 1) {
    const preferred = optimization.preferred_option_id ? optimization.scores.find((s) => s.option_id === optimization.preferred_option_id) : null;
    const second = preferred ? optimization.scores.find((s) => s.option_id !== preferred.option_id && s.total_score > 0) : null;
    if (preferred && second) findings.push({ id: "optimization-sensitivity", title: "Decision preference has measurable ranking sensitivity", conclusion: `The leading analytical option exceeds the next viable option by ${(preferred.total_score - second.total_score).toFixed(3)} score points; the ranking should be treated as sensitive to assumptions accordingly.`, evidence: { preferred_option_id: preferred.option_id, preferred_score: preferred.total_score, next_option_id: second.option_id, next_score: second.total_score }, confidence: "calculated", limitation: "Optimization scores are deterministic analytical comparisons, not probabilities or guarantees." });
  }

  return {
    engine_version: "IRIS_HIGHER_ORDER_SYNTHESIS_V4",
    findings: findings.slice(0, 20),
    lifecycle: ["Evidence", "Synthesis", "Prediction", "Simulation", "Decision", "Outcome", "Validation", "Learning", "Adaptation"],
    generation: { source: "certified Iris analytical outputs and same-Item provider-domain inputs", financial_values_created: false, fake_mock_or_seeded_data: false, findings_are_calculated_not_observed: true, execution_capability: false, evidence_gate: "open" },
    provider_domain_execution: { evidence_ready: provider.evidence_ready, selected_item_id: provider.selected_item_id, utilization: provider.utilization, derived: provider.derived ?? null },
  };
}
