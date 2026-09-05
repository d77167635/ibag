export type IrisCatalogCapability = {
  id: string;
  name: string;
  description: string;
  family: string;
  depth: "core" | "advanced" | "frontier";
  atlas_ids: string[];
};

/**
 * User-facing capability catalog. This is deliberately separate from the
 * analytical atlas: a capability is a product concept that may activate many
 * analytical definitions and compositions underneath it.
 */
export const IRIS_CATALOG_VERSION = "IRIS_CATALOG_V1";

const C = (id: string, name: string, description: string, family: string, depth: IrisCatalogCapability["depth"], atlas_ids: string[] = []): IrisCatalogCapability => ({ id, name, description, family, depth, atlas_ids });

export const IRIS_CATALOG: IrisCatalogCapability[] = [
  C("financial-state", "Financial State", "Understand where you stand across observed balances, obligations, flows, and financial condition.", "state", "core", ["state.financial-state"]),
  C("liquidity", "Liquidity", "Understand available capacity, near-term pressure, and how much flexibility the observed evidence supports.", "state", "core", ["state.liquidity-position"]),
  C("financial-resilience", "Financial Resilience", "Examine how the observed financial system responds to pressure and changing conditions.", "state", "advanced", ["state.financial-resilience"]),
  C("pressure-map", "Pressure Map", "Locate the accounts, categories, merchants, flows, and relationships associated with financial pressure.", "state", "advanced", ["state.financial-pressure-map"]),

  C("cash-flow", "Cash Flow", "Understand observed economic money entering and leaving the financial system.", "cash_flow", "core", ["cash_flow.cash-flow-analysis"]),
  C("cash-flow-safety", "Cash-Flow Safety", "Examine near-term cash-flow conditions and essential-bill pressure.", "cash_flow", "core", ["cash_flow.cash-flow-safety"]),
  C("cash-flow-trends", "Cash-Flow Trends", "Compare flow direction and persistence across supported observed windows.", "cash_flow", "advanced", ["cash_flow.cash-flow-trend", "cash_flow.cash-flow-turning-points"]),
  C("cash-flow-volatility", "Cash-Flow Volatility", "Identify changing variation in observed inflows and outflows.", "cash_flow", "advanced", ["cash_flow.cash-flow-volatility"]),

  C("spending", "Spending", "Understand where observed economic outflows are going.", "spending", "core", ["spending.spending-analysis"]),
  C("spending-hierarchy", "Spending Hierarchy", "Move from broad spending domains into increasingly specific observed structure.", "spending", "core", ["spending.spending-hierarchy"]),
  C("merchant-intelligence", "Merchant Intelligence", "Examine merchant concentration, recurrence, behavior, and changes.", "spending", "advanced", ["spending.merchant-concentration", "behavior.merchant-behavior"]),
  C("category-intelligence", "Category Intelligence", "Examine category structure, movement, drift, and behavioral pressure.", "spending", "advanced", ["spending.category-drift", "behavior.category-behavior"]),
  C("essential-discretionary", "Essential vs Discretionary", "Separate observed essential pressure from discretionary activity where evidence supports it.", "spending", "advanced", ["spending.essential-vs-discretionary-pressure"]),
  C("spending-opportunities", "Spending Opportunities", "Surface observed areas worth investigating for improvement or clarification.", "spending", "advanced", ["spending.spending-opportunity-map"]),

  C("time-machine", "Time Machine", "Move across supported historical windows to understand how the financial picture changes.", "temporal", "core", ["temporal.multi-window-comparison"]),
  C("trajectory", "Trajectory", "Understand whether observed financial direction is improving, worsening, or changing.", "temporal", "advanced", ["temporal.short-vs-long-trajectory", "temporal.trend-persistence"]),
  C("turning-points", "Turning Points", "Find meaningful changes in observed financial direction and behavior.", "temporal", "advanced", ["cash_flow.cash-flow-turning-points"]),
  C("window-comparison", "Window Comparison", "Compare supported periods without inventing unavailable history.", "temporal", "core", ["temporal.multi-window-comparison"]),

  C("behavior", "Behavior", "Understand recurring and changing patterns in observed financial activity.", "behavior", "core", ["behavior.behavior-analysis"]),
  C("behavior-change", "Behavior Change", "Identify meaningful shifts in observed transaction behavior.", "behavior", "advanced", ["behavior.category-behavior", "behavior.behavioral-pressure"]),
  C("recurrence", "Recurrence", "Examine repeated merchant, category, and transaction patterns where evidence supports recurrence.", "behavior", "advanced", ["behavior.merchant-behavior"]),
  C("anomalies", "Anomalies", "Find unusual observed activity that deserves attention or investigation.", "behavior", "core", ["behavior.anomaly-analysis"]),
  C("behavioral-pressure", "Behavioral Pressure", "Connect observed behavior patterns to areas of financial pressure.", "behavior", "advanced", ["behavior.behavioral-pressure"]),

  C("debt", "Debt", "Understand observed debt position, movement, utilization, and cost.", "debt", "core", ["state.debt-health"]),
  C("debt-cost", "Debt Cost", "Examine observed or derived cost associated with debt.", "debt", "advanced", ["debt.debt-cost"]),
  C("debt-trajectory", "Debt Trajectory", "Understand how observed debt direction changes over time.", "debt", "advanced", ["debt.debt-trajectory"]),
  C("debt-utilization", "Utilization", "Examine observed utilization pressure where the connected data supports it.", "debt", "advanced", ["debt.utilization-pressure"]),
  C("debt-opportunities", "Debt Opportunities", "Surface evidence-supported debt areas worth further investigation.", "debt", "advanced", ["debt.debt-opportunity-map"]),

  C("roundups", "Round-Ups", "Understand observed eligible purchase round-up opportunity and behavior.", "roundups", "core", ["roundups.round-up-opportunity"]),
  C("roundup-projection", "Round-Up Projection", "Project continuation of observed round-up behavior without fabricating activity.", "roundups", "advanced", ["roundups.round-up-projection"]),
  C("roundup-affordability", "Round-Up Affordability", "Place observed round-up opportunity in liquidity and cash-flow context.", "roundups", "advanced", ["roundups.round-up-affordability-context"]),
  C("roundup-contribution", "Round-Up Contribution", "Understand which observed transaction structures contribute to round-up opportunity.", "roundups", "advanced", ["roundups.round-up-contribution-analysis"]),

  C("forecast", "Forecast", "Understand evidence-bounded forward projections from observed financial history.", "forecast", "core", ["forecast.forward-balance-projection"]),
  C("liquidity-outlook", "Liquidity Outlook", "Examine near-term projected liquidity conditions.", "forecast", "advanced", ["forecast.liquidity-outlook"]),
  C("bill-outlook", "Bill Outlook", "Examine observed recurring essential-bill pressure in forward context.", "forecast", "advanced", ["forecast.essential-bill-projection"]),
  C("forecast-limits", "Forecast Limits", "Know exactly what the available evidence cannot support as a forecast.", "forecast", "core", ["forecast.forecast-limitation-analysis"]),

  C("causality", "Causality", "Separate evidence-linked contributors from correlation and unknowns.", "causal", "frontier", ["causal.causal-analysis"]),
  C("pressure-drivers", "Pressure Drivers", "Identify observed contributors associated with financial pressure.", "causal", "advanced", ["causal.pressure-driver-analysis"]),
  C("spending-drivers", "Spending Drivers", "Examine observed contributors to spending movement.", "causal", "advanced", ["causal.spending-driver-analysis"]),
  C("cause-correlation", "Cause vs Correlation", "Make the boundary between supported causal explanation and correlation explicit.", "causal", "frontier", ["causal.cause-vs-correlation-boundary"]),

  C("decisions", "Decisions", "Compare evidence-linked choices against the observed financial state.", "decisions", "core", ["decisions.decision-analysis"]),
  C("decision-graph", "Decision Graph", "Connect state, choices, evidence, and downstream outcomes.", "decisions", "advanced", ["decisions.decision-graph"]),
  C("consequences", "Consequences", "Understand modeled downstream effects of available choices.", "decisions", "advanced", ["decisions.consequence-analysis"]),
  C("optimization", "Optimization", "Find evidence-supported opportunities to improve an outcome under stated constraints.", "decisions", "advanced", ["decisions.optimization-analysis"]),
  C("goals", "Goals", "Connect declared objectives to the observed financial evidence and available choices.", "decisions", "core", ["decisions.goal-intelligence"]),
  C("next-best-investigation", "Next Best Investigation", "Identify the question or evidence gap most likely to improve intelligence.", "decisions", "frontier", ["decisions.next-best-investigation"]),

  C("evidence", "Evidence", "See the evidence boundary behind Iris intelligence.", "evidence", "core", ["evidence.evidence-graph"]),
  C("evidence-coverage", "Evidence Coverage", "Measure how completely available observations support an analysis.", "evidence", "advanced", ["evidence.evidence-coverage"]),
  C("lineage", "Provider Lineage", "Trace provider observations through canonical records and derived intelligence.", "evidence", "core", ["evidence.provider-lineage"]),
  C("uncertainty", "Uncertainty", "Understand limitations, missing evidence, and uncertainty without false precision.", "evidence", "core", ["evidence.uncertainty-analysis"]),
  C("explainability", "Explainability", "Trace why Iris reached a conclusion and which evidence contributed.", "evidence", "advanced", ["evidence.explainability-trace"]),
  C("analytical-readiness", "Analytical Readiness", "Know whether a particular intelligence question is actually answerable from current evidence.", "evidence", "frontier", ["evidence.analytical-readiness"]),

  C("education", "Education", "Learn what the observed financial evidence means in plain language.", "education", "core", ["synthesis.personalized-education"]),
  C("financial-literacy", "Financial Literacy", "Turn observed concepts and relationships into personalized learning opportunities.", "education", "advanced", ["synthesis.personalized-education"]),
  C("investigation", "Investigation", "Explore questions, evidence gaps, relationships, and deeper analytical paths.", "investigation", "frontier", ["synthesis.iris-investigation"]),
  C("relationships", "Relationships", "Understand connections among accounts, merchants, categories, flows, entities, and intelligence layers.", "synthesis", "frontier", ["synthesis.relational-reasoning"]),
  C("synthesis", "Synthesis", "Combine multiple intelligence layers into a coherent evidence-bounded picture.", "synthesis", "core", ["synthesis.financial-intelligence-map"]),
  C("maximum-intelligence", "Maximum Intelligence", "Let Iris combine the broadest evidence-valid set of analyses, relationships, questions, scenarios, and explanations available.", "synthesis", "frontier", ["synthesis.maximum-intelligence-synthesis"]),
];

export const IRIS_STANDARD_CAPABILITY_IDS = IRIS_CATALOG.slice(0, 20).map(c => c.id);

export function getIrisCatalogCapability(id: string) {
  return IRIS_CATALOG.find(capability => capability.id === id) ?? null;
}
