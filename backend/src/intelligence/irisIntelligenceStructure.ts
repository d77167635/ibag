/**
 * Iris Intelligence Structure
 *
 * This file defines named intelligence concepts that are permitted to exist
 * inside the recursive Iris hierarchy. It contains no financial values,
 * fixtures, seeded observations, provider responses, or user state.
 *
 * Important boundary:
 * - Level 1 is Iris.
 * - Level 2 is the eight formal financial-life domains.
 * - Level 3+ is recursive and is not a finite catalog.
 * - These named paths are real structural concepts, not a claim that every
 *   path has already been executed or certified.
 */

import {
  getIrisDomain,
  materializeIrisBranchPath,
  type IrisIntelligenceNode,
} from "./irisIntelligenceHierarchy.js";

export type IrisNamedIntelligencePath = {
  domainId: string;
  names: ReadonlyArray<{
    id: string;
    name: string;
    purpose: string;
    kind?: "intelligence" | "higher_order";
  }>;
};

/**
 * Universal intelligence progression named by the Iris architecture.
 * These are structural stages, not semantic depth limits. Operators may be
 * repeated, reordered, or composed when the evidence and reasoning warrant it.
 */
export const IRIS_UNIVERSAL_INTELLIGENCE_STAGES = [
  { id: "observation", name: "Observation", purpose: "Represent provider observations without inventing facts." },
  { id: "canonical_facts", name: "Canonical Facts", purpose: "Represent normalized facts derived from governed observations." },
  { id: "semantic_interpretation", name: "Semantic Interpretation", purpose: "Interpret the meaning of canonical facts within their evidence boundary." },
  { id: "classification", name: "Classification", purpose: "Classify observed or derived facts using governed evidence and methods." },
  { id: "temporal_intelligence", name: "Temporal Intelligence", purpose: "Reason about change, sequence, duration, recency, and time-dependent state." },
  { id: "relational_intelligence", name: "Relational Intelligence", purpose: "Reason about relationships among financial-life entities and intelligence objects." },
  { id: "pattern_behavioral_intelligence", name: "Pattern / Behavioral Intelligence", purpose: "Identify supported behavioral and recurring patterns from governed evidence." },
  { id: "statistical_intelligence", name: "Statistical Intelligence", purpose: "Apply statistical methods to evidence-supported populations and distributions." },
  { id: "baselines", name: "Baselines", purpose: "Construct evidence-supported reference states for comparison." },
  { id: "adaptive_thresholds", name: "Adaptive Thresholds", purpose: "Derive thresholds from observed history rather than fixed fabricated user state." },
  { id: "anomaly_intelligence", name: "Anomaly Intelligence", purpose: "Detect deviations from governed baselines and adaptive thresholds." },
  { id: "risk_intelligence", name: "Risk Intelligence", purpose: "Assess supported financial-life risks and their evidence limitations." },
  { id: "opportunity_intelligence", name: "Opportunity Intelligence", purpose: "Identify evidence-supported opportunities without fabricating expected outcomes." },
  { id: "causal_reasoning", name: "Causal Reasoning", purpose: "Evaluate causal hypotheses only where the available evidence supports the method." },
  { id: "predictive_intelligence", name: "Predictive Intelligence", purpose: "Produce constrained predictions from governed historical evidence and explicit assumptions." },
  { id: "scenario_counterfactual_intelligence", name: "Scenario / Counterfactual Intelligence", purpose: "Evaluate explicit scenarios and counterfactuals without inventing user assumptions." },
  { id: "decision_intelligence", name: "Decision Intelligence", purpose: "Structure decision alternatives from supported intelligence and constraints." },
  { id: "recommendation_intelligence", name: "Recommendation Intelligence", purpose: "Produce evidence-grounded recommendations while preserving uncertainty and user agency." },
  { id: "consequence_intelligence", name: "Consequence Intelligence", purpose: "Analyze supported downstream consequences of decisions or scenarios." },
  { id: "outcome_intelligence", name: "Outcome Intelligence", purpose: "Represent outcomes only when later evidence actually observes them." },
  { id: "learning_intelligence", name: "Learning Intelligence", purpose: "Learn from validated outcomes and accumulated evidence across time." },
  { id: "cross_domain_synthesis", name: "Cross-Domain Synthesis", purpose: "Compose intelligence across the eight financial-life domains when evidence and lineage permit." },
  { id: "higher_order_intelligence", name: "Higher-Order Intelligence", purpose: "Reason over previously derived intelligence as governed inputs to further intelligence." },
  { id: "recursive_composition", name: "Recursive Composition", purpose: "Use derived intelligence as an input to additional governed intelligence without a semantic depth ceiling." },
  { id: "new_derived_intelligence", name: "New Derived Intelligence", purpose: "Create a distinct derived intelligence object when evidence, relationships, and reasoning justify it." },
] as const;

/**
 * Established domain-specific named paths. These are concrete structural
 * concepts discussed by the Iris architecture; they are not an exhaustive
 * inventory of everything Iris may eventually derive.
 */
export const IRIS_NAMED_INTELLIGENCE_PATHS: readonly IrisNamedIntelligencePath[] = [
  {
    domainId: "transactions",
    names: [
      { id: "transaction_analysis", name: "Transaction Analysis", purpose: "Analyze canonical transaction facts within their governed evidence boundary." },
      { id: "purchase_analysis", name: "Purchase Analysis", purpose: "Analyze observed purchase activity and its supported semantics." },
      { id: "merchant_analysis", name: "Merchant Analysis", purpose: "Analyze observed merchant relationships and activity." },
      { id: "merchant_behavior_analysis", name: "Merchant Behavior Analysis", purpose: "Analyze observed behavior associated with merchants over time." },
      { id: "merchant_pattern_analysis", name: "Merchant Pattern Analysis", purpose: "Analyze recurring merchant patterns supported by transaction history." },
      { id: "merchant_pattern_forecasting", name: "Merchant Pattern Forecasting", purpose: "Forecast supported merchant patterns from observed history." },
      { id: "merchant_scenario_modeling", name: "Merchant Scenario Modeling", purpose: "Model explicit merchant-related scenarios without inventing assumptions." },
    ],
  },
  {
    domainId: "transactions",
    names: [
      { id: "round_up_intelligence", name: "Round-Up Intelligence", purpose: "Analyze observed Round-Up-eligible transaction behavior under the governed Round-Up rules." },
      { id: "round_up_pattern_intelligence", name: "Round-Up Pattern Intelligence", purpose: "Analyze recurring Round-Up patterns from eligible observed transactions." },
      { id: "round_up_forecast_intelligence", name: "Round-Up Forecast Intelligence", purpose: "Forecast Round-Up behavior only from governed observed history." },
      { id: "round_up_scenario_intelligence", name: "Round-Up Scenario Intelligence", purpose: "Model explicit Round-Up scenarios without executing money movement." },
    ],
  },
  {
    domainId: "balance",
    names: [
      { id: "liquidity_intelligence", name: "Liquidity Intelligence", purpose: "Analyze observed liquidity position and available financial capacity." },
      { id: "liquidity_trend_intelligence", name: "Liquidity Trend Intelligence", purpose: "Analyze observed changes in liquidity across time." },
      { id: "liquidity_risk_intelligence", name: "Liquidity Risk Intelligence", purpose: "Assess supported liquidity risks from observed balance and activity evidence." },
    ],
  },
] as const;

/**
 * Materialize one named path into actual hierarchy nodes. The returned nodes
 * are structural objects only; no financial state is generated.
 */
export function materializeNamedIntelligencePath(path: IrisNamedIntelligencePath): IrisIntelligenceNode[] {
  if (!getIrisDomain(path.domainId)) {
    throw new Error(`Unknown Iris domain: ${path.domainId}`);
  }
  return materializeIrisBranchPath({ domainId: path.domainId, branches: path.names });
}

/**
 * Return all currently defined named structural paths without executing them.
 */
export function getIrisNamedIntelligenceStructure(): IrisIntelligenceNode[][] {
  return IRIS_NAMED_INTELLIGENCE_PATHS.map(materializeNamedIntelligencePath);
}
