export type IrisAnalysisDefinition = {
  id: string;
  family: string;
  name: string;
  purpose: string;
  inputs: string[];
  output: string;
};

/**
 * Iris is the semantic authority above provider surfaces.
 * Plaid remains the source-of-truth provider/evidence substrate; this atlas
 * describes what Iris can derive, combine, explain, and investigate from
 * evidence that is actually present.
 */
export const IRIS_ANALYSIS_ATLAS: IrisAnalysisDefinition[] = [
  ...[
    ["state", "Financial State", "Current financial state", ["financial_state", "net_worth"], "state"],
    ["state", "Liquidity position", "Current liquid-resource position", ["financial_state", "cash_flow_safety", "net_worth"], "state"],
    ["state", "Debt health", "Debt level, utilization, and direction", ["debt_health", "financial_state"], "state"],
    ["state", "Cash-flow health", "Economic inflow/outflow condition", ["cash_flow", "cash_flow_safety"], "state"],
    ["state", "Financial pressure map", "Where the current financial state is under pressure", ["financial_state", "reasoning", "cash_flow_safety"], "state"],
    ["state", "Financial resilience", "Observed capacity to absorb modeled pressure", ["financial_state", "cash_flow_safety", "balance_history"], "state"],
  ],
  ...[
    ["cash_flow", "Cash-flow analysis", "Observed economic inflows and outflows", ["cash_flow"], "flow"],
    ["cash_flow", "Cash-flow safety", "Near-term safety and essential-bill pressure", ["cash_flow_safety"], "risk"],
    ["cash_flow", "Cash-flow trend", "Direction across observed windows", ["temporal", "cash_flow"], "trend"],
    ["cash_flow", "Cash-flow volatility", "Variation across observed periods", ["temporal", "cash_flow"], "trend"],
    ["cash_flow", "Inflow/outflow balance", "Relative economic inflow and outflow structure", ["cash_flow"], "relationship"],
    ["cash_flow", "Cash-flow turning points", "Material changes in observed flow direction", ["temporal", "reasoning"], "trend"],
  ],
  ...[
    ["spending", "Spending analysis", "Observed economic spending", ["spending_by_domain"], "spending"],
    ["spending", "Spending hierarchy", "Spending structure across domains and subdomains", ["spending_hierarchy"], "spending"],
    ["spending", "Category drift", "Change in category mix over time", ["category_drift"], "trend"],
    ["spending", "Merchant concentration", "Concentration of observed spending among merchants", ["spending_hierarchy", "reasoning"], "relationship"],
    ["spending", "Essential vs discretionary pressure", "Observed essential spending pressure", ["spending_hierarchy", "cash_flow_safety"], "risk"],
    ["spending", "Spending change attribution", "Observed contributors to spending change", ["spending_by_domain", "category_drift", "reasoning"], "causal"],
    ["spending", "Spending opportunity map", "Areas with observed room for investigation", ["spending_hierarchy", "maximum_intelligence"], "opportunity"],
  ],
  ...[
    ["temporal", "30-day analysis", "Current-window financial behavior", ["cash_flow", "balance_history"], "window"],
    ["temporal", "60-day analysis", "Intermediate observed financial behavior", ["temporal"], "window"],
    ["temporal", "90-day analysis", "Broader observed financial behavior", ["temporal", "spending_by_domain"], "window"],
    ["temporal", "Multi-window comparison", "Cross-window change and consistency", ["temporal"], "comparison"],
    ["temporal", "Short-vs-long trajectory", "Relative short and long direction", ["temporal", "maximum_intelligence"], "trajectory"],
    ["temporal", "Trend persistence", "Whether observed direction persists across windows", ["temporal"], "trajectory"],
  ],
  ...[
    ["behavior", "Behavior analysis", "Observed behavioral patterns in transactions", ["category_drift", "temporal"], "behavior"],
    ["behavior", "Category behavior", "Changes in category behavior", ["category_drift"], "behavior"],
    ["behavior", "Merchant behavior", "Observed merchant-level behavior", ["anomalies", "spending_hierarchy"], "behavior"],
    ["behavior", "Anomaly analysis", "Unusual observed merchant outflows", ["anomalies"], "anomaly"],
    ["behavior", "Behavioral pressure", "Behavioral patterns contributing to pressure", ["category_drift", "reasoning"], "risk"],
    ["behavior", "Behavioral opportunity", "Observed patterns worth investigating", ["category_drift", "maximum_intelligence"], "opportunity"],
  ],
  ...[
    ["debt", "Debt trend", "Observed debt direction", ["debt_health", "temporal"], "debt"],
    ["debt", "Debt cost", "Observed/derived debt cost intelligence", ["debt_health"], "debt"],
    ["debt", "Utilization pressure", "Credit utilization pressure", ["debt_health"], "risk"],
    ["debt", "Debt trajectory", "Debt direction across observed periods", ["debt_health", "temporal"], "trajectory"],
    ["debt", "Debt opportunity map", "Observed debt areas for investigation", ["debt_health", "maximum_intelligence"], "opportunity"],
    ["debt", "Debt consequence analysis", "Modeled consequences of debt-related decisions", ["debt_health", "consequence_model"], "consequence"],
  ],
  ...[
    ["roundups", "Round-Up opportunity", "Observed eligible purchase round-up opportunity", ["roundup_projection"], "roundup"],
    ["roundups", "Round-Up projection", "Projected continuation of observed round-up behavior", ["roundup_projection"], "projection"],
    ["roundups", "Round-Up contribution analysis", "Contribution by observed transaction structure", ["roundup_projection", "spending_hierarchy"], "relationship"],
    ["roundups", "Round-Up affordability context", "Round-Up opportunity in liquidity context", ["roundup_projection", "cash_flow_safety"], "context"],
    ["roundups", "Round-Up behavior", "Round-Up behavior across observed cards/accounts", ["roundup_projection", "behavior"], "behavior"],
  ],
  ...[
    ["forecast", "Forward balance projection", "Evidence-bounded forward checking balance projection", ["forward_projection"], "forecast"],
    ["forecast", "Essential-bill projection", "Observed recurring essential-bill pressure", ["forward_projection", "cash_flow_safety"], "forecast"],
    ["forecast", "Liquidity outlook", "Near-term liquidity outlook", ["forward_projection", "financial_state"], "forecast"],
    ["forecast", "Trajectory forecast", "Forward interpretation of observed direction", ["maximum_intelligence", "temporal"], "forecast"],
    ["forecast", "Forecast limitation analysis", "What the evidence cannot support yet", ["forward_projection", "uncertainty"], "uncertainty"],
  ],
  ...[
    ["causal", "Causal analysis", "Evidence-linked contributors to observed state", ["causal_analysis"], "causal"],
    ["causal", "Pressure-driver analysis", "Drivers associated with financial pressure", ["causal_analysis", "reasoning"], "causal"],
    ["causal", "Spending-driver analysis", "Observed drivers of spending movement", ["causal_analysis", "spending_by_domain"], "causal"],
    ["causal", "Debt-driver analysis", "Observed contributors to debt movement", ["causal_analysis", "debt_health"], "causal"],
    ["causal", "Cause-vs-correlation boundary", "Separates supported causes from correlations/unknowns", ["causal_analysis", "uncertainty"], "uncertainty"],
  ],
  ...[
    ["decisions", "Decision analysis", "Evidence-linked decision options", ["decision_intelligence"], "decision"],
    ["decisions", "Decision graph", "Relationships among state, options, and consequences", ["decision_graph"], "decision"],
    ["decisions", "Consequence analysis", "Modeled consequences of available decisions", ["consequence_model"], "consequence"],
    ["decisions", "Optimization analysis", "Relative option scoring from available evidence", ["optimization_intelligence"], "optimization"],
    ["decisions", "Goal intelligence", "Evidence-linked goal analysis", ["goal_intelligence"], "goal"],
    ["decisions", "Next-best investigation", "Questions that would most improve intelligence", ["maximum_intelligence", "uncertainty"], "investigation"],
  ],
  ...[
    ["evidence", "Evidence graph", "Traceable relationships among observations and derived findings", ["evidence_graph"], "evidence"],
    ["evidence", "Evidence coverage", "How much observed evidence supports analysis", ["evidence_graph", "maximum_intelligence"], "evidence"],
    ["evidence", "Uncertainty analysis", "Evidence limitations and uncertainty", ["uncertainty"], "uncertainty"],
    ["evidence", "Provider lineage", "Provider-to-canonical data lineage integrity", ["provider_lineage", "evidence_graph"], "integrity"],
    ["evidence", "Analytical readiness", "Whether available evidence is sufficient for a given analysis", ["uncertainty", "integrity"], "readiness"],
    ["evidence", "Explainability trace", "Traceable basis for intelligence generation", ["reasoning", "evidence_graph"], "explainability"],
  ],
  ...[
    ["synthesis", "Narrative synthesis", "Human-readable synthesis of current intelligence", ["narrative", "reasoning"], "synthesis"],
    ["synthesis", "Maximum intelligence synthesis", "Cross-layer synthesis of pressure, opportunity, trajectory, and questions", ["maximum_intelligence"], "synthesis"],
    ["synthesis", "Relational reasoning", "Cross-entity financial relationships", ["reasoning"], "relationship"],
    ["synthesis", "Financial intelligence map", "Integrated state, causes, decisions, and consequences", ["financial_state", "causal_analysis", "decision_intelligence", "consequence_model"], "synthesis"],
    ["synthesis", "Personalized education", "Evidence-linked explanation of observed financial concepts", ["reasoning", "uncertainty", "evidence_graph"], "education"],
    ["synthesis", "Iris investigation", "Dynamic selection of the next useful analytical question", ["maximum_intelligence", "uncertainty", "decision_graph"], "investigation"],
  ],
].map(([family, name, purpose, inputs, output]) => ({ id: `${family}.${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, family: String(family), name: String(name), purpose: String(purpose), inputs: inputs as string[], output: String(output) }));

export function buildIrisAnalysisAtlas(available: Record<string, unknown>) {
  const definitions = IRIS_ANALYSIS_ATLAS.map((definition) => {
    const missing = definition.inputs.filter((input) => available[input] == null);
    return { ...definition, evidence_ready: missing.length === 0, missing_inputs: missing };
  });
  const ready = definitions.filter((d) => d.evidence_ready);
  const families = [...new Set(definitions.map((d) => d.family))];
  return {
    hierarchy: "Iris > synthesis > analytical families > canonical evidence > Plaid source observations",
    provider_role: "Plaid connects institutions and supplies read-only source data. Plaid does not interpret or control Iris intelligence.",
    source_of_truth: "Plaid data remains the source of truth for provider observations; Iris never alters those observations.",
    definitions,
    counts: { total_defined: definitions.length, evidence_ready: ready.length, evidence_limited: definitions.length - ready.length, families: families.length },
    ready_analysis_ids: ready.map((d) => d.id),
  };
}
