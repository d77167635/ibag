import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IrisFormalLevel = { level: number; name: string; responsibility: string; governs: string[] };

export const IRIS_FORMAL_LEVELS: IrisFormalLevel[] = [
  { level: 1, name: "IRIS", responsibility: "Master intelligence, governance, evidence, composition, validation, and final synthesis", governs: ["all"] },
  { level: 2, name: "Domain Intelligence", responsibility: "Complete understanding of the eight foundational provider domains", governs: ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"] },
  { level: 3, name: "Analytical Intelligence", responsibility: "Classify, measure, aggregate, compare, transform, calculate, and derive", governs: ["analysis"] },
  { level: 4, name: "Relational Intelligence", responsibility: "Discover relationships, dependencies, sequences, interactions, conflicts, and cross-domain structure", governs: ["relationships"] },
  { level: 5, name: "Predictive Intelligence", responsibility: "Project evidence-supported trajectories, events, ranges, and confidence boundaries", governs: ["forecasts"] },
  { level: 6, name: "Scenario Intelligence", responsibility: "Model conditional futures, alternatives, stress, sensitivity, and what-if outcomes", governs: ["scenarios"] },
  { level: 7, name: "Decision Intelligence", responsibility: "Evaluate choices, tradeoffs, timing, constraints, risks, opportunities, and expected outcomes", governs: ["decisions"] },
  { level: 8, name: "Outcome Intelligence", responsibility: "Compare expected versus actual outcomes and validate decisions, predictions, and recommendations", governs: ["outcomes"] },
  { level: 9, name: "Learning Intelligence", responsibility: "Extract validated learning signals from outcome history without rewriting source evidence", governs: ["learning"] },
  { level: 10, name: "Adaptive Intelligence", responsibility: "Adapt analytical composition, attention, questioning, and prioritization from validated learning", governs: ["adaptation"] },
  { level: 11, name: "Emergent Intelligence", responsibility: "Detect higher-order structures and signals that emerge only from multiple interacting intelligence branches", governs: ["emergence"] },
  { level: 12, name: "Meta-Intelligence", responsibility: "Reason about Iris itself: capability, limitations, evidence quality, strategy, and intelligence-generation quality", governs: ["meta"] },
];

/** Capability taxonomy only. A listed subdomain is never evidence of a user's data. */
export const IRIS_DOMAIN_SUBDOMAINS: Record<string, string[]> = {
  auth: ["institution_connection", "item_state", "account_access", "consent_context", "provider_status", "refresh_state", "connection_integrity"],
  transactions: ["transaction_identity", "lifecycle", "date_time", "amount", "currency", "merchant", "category", "payment_channel", "pending_posted", "purchase", "refund", "income", "transfer", "withdrawal", "fee", "loan_payment", "recurring", "cash_flow", "roundup", "behavior", "anomaly", "transaction_relationships"],
  balance: ["current_balance", "available_balance", "cash_position", "historical_balance", "balance_change", "liquidity", "overdraft", "balance_integrity", "balance_transaction_relationships"],
  identity: ["owner", "account_holder", "identity_match", "profile_context", "identity_consistency", "identity_lineage"],
  assets: ["asset_inventory", "asset_value", "cash_assets", "reported_assets", "asset_change", "asset_concentration", "asset_liquidity", "asset_relationships"],
  liabilities: ["liability_inventory", "credit", "mortgage", "student", "balance", "interest_cost", "utilization", "payment", "maturity", "debt_change", "debt_burden", "debt_relationships"],
  investments: ["portfolio", "holding", "security", "quantity", "market_value", "institution_value", "allocation", "concentration", "performance", "investment_change", "investment_risk", "investment_relationships"],
  statements: ["statement_identity", "statement_period", "statement_account", "statement_balance", "statement_transaction", "statement_reconciliation", "statement_history", "document_availability", "statement_relationships"],
};

/** Formal higher-order capabilities map to existing Iris engines; these are capability definitions, not fabricated observations. */
export const IRIS_HIGHER_ORDER_DEFINITIONS: Array<IrisAnalysisDefinition & { formal_level: number }> = [
  { id: "outcome.validation", family: "outcome", name: "Outcome Validation", purpose: "Validate observed outcomes against prior forecasts, scenarios, decisions, and recommendations", inputs: ["validation", "decision_intelligence", "forward_projection"], output: "outcome", formal_level: 8 },
  { id: "learning.outcome-learning", family: "learning", name: "Outcome Learning", purpose: "Extract reusable learning signals from validated expected-versus-actual comparisons", inputs: ["outcome", "validation", "evidence_graph"], output: "learning", formal_level: 9 },
  { id: "adaptive.intelligence-adaptation", family: "adaptive", name: "Adaptive Intelligence", purpose: "Adapt intelligence composition, investigation priorities, and evidence acquisition strategy from validated learning", inputs: ["learning", "meta_intelligence", "uncertainty"], output: "adaptive", formal_level: 10 },
  { id: "emergent.cross-branch-intelligence", family: "emergent", name: "Emergent Cross-Branch Intelligence", purpose: "Detect novel higher-order structures arising from interacting domain and higher-order branches", inputs: ["intelligence_composition", "higher_order_synthesis", "adversarial_reasoning", "counterfactual_intelligence"], output: "emergent", formal_level: 11 },
  { id: "meta.iris-self-intelligence", family: "meta", name: "Iris Self-Intelligence", purpose: "Evaluate Iris capability, evidence quality, limitations, composition quality, uncertainty, and governance", inputs: ["iris_governor", "validation", "uncertainty", "intelligence_composition"], output: "meta", formal_level: 12 },
];

export type RecursiveIntelligenceNode = {
  id: string;
  parent_id: string | null;
  level: number;
  level_name: string;
  domain: string | null;
  subdomain: string | null;
  family: string;
  name: string;
  purpose: string;
  inputs: string[];
  output: string;
  evidence_ready: boolean;
  depth: number;
  path: string[];
  reusable_source_access: true;
};

const domainFor = (definition: IrisAnalysisDefinition): string | null => IRIS_FORMAL_LEVELS[1].governs.includes(definition.family) ? definition.family : null;
const formalLevelFor = (definition: IrisAnalysisDefinition & { formal_level?: number }): number => {
  if (definition.formal_level) return definition.formal_level;
  const domain = domainFor(definition);
  if (domain) return 2;
  if (["relationship", "causal", "integrity", "evidence", "explainability"].includes(definition.output)) return 4;
  if (["forecast", "projection", "trajectory"].includes(definition.output)) return 5;
  if (["scenario", "simulation", "counterfactual"].includes(definition.output)) return 6;
  if (["decision", "optimization", "goal"].includes(definition.output)) return 7;
  if (["outcome", "validation"].includes(definition.output)) return 8;
  if (definition.output === "learning") return 9;
  if (definition.output === "adaptive") return 10;
  if (definition.output === "emergent") return 11;
  if (definition.output === "meta") return 12;
  return 3;
};

function subdomainFor(definition: IrisAnalysisDefinition): string | null {
  const domain = domainFor(definition);
  if (!domain) return null;
  const text = `${definition.name} ${definition.purpose}`.toLowerCase();
  return IRIS_DOMAIN_SUBDOMAINS[domain].find(s => text.includes(s.replace(/_/g, " "))) ?? IRIS_DOMAIN_SUBDOMAINS[domain][0] ?? null;
}

export function buildRecursiveIntelligenceHierarchy(
  definitions: Array<IrisAnalysisDefinition & { evidence_ready?: boolean }>,
  options: { maxGeneratedNodes?: number } = {},
) {
  const allDefinitions = [...definitions, ...IRIS_HIGHER_ORDER_DEFINITIONS];
  const maxGeneratedNodes = Math.max(1000, options.maxGeneratedNodes ?? 20000);
  const nodes: RecursiveIntelligenceNode[] = [];
  const byPath = new Set<string>();
  const base: RecursiveIntelligenceNode[] = [];

  for (const definition of allDefinitions) {
    if (nodes.length >= maxGeneratedNodes) break;
    const level = formalLevelFor(definition);
    const domain = domainFor(definition);
    const node: RecursiveIntelligenceNode = {
      id: `L${level}:${definition.id}`,
      parent_id: level === 2 ? "L1:IRIS" : null,
      level,
      level_name: IRIS_FORMAL_LEVELS[level - 1]?.name ?? "Analytical Intelligence",
      domain,
      subdomain: subdomainFor(definition),
      family: definition.family,
      name: definition.name,
      purpose: definition.purpose,
      inputs: [...definition.inputs],
      output: definition.output,
      evidence_ready: definition.evidence_ready === true,
      depth: 1,
      path: ["IRIS", IRIS_FORMAL_LEVELS[level - 1]?.name ?? "Analytical Intelligence", ...(domain ? [domain] : []), definition.name],
      reusable_source_access: true,
    };
    nodes.push(node); base.push(node); byPath.add(node.id);
  }

  let deepestGeneratedPath = 1;
  const walk = (parent: RecursiveIntelligenceNode, source: RecursiveIntelligenceNode[], depth: number) => {
    if (nodes.length >= maxGeneratedNodes || depth > source.length + 1) return;
    for (const candidate of source) {
      if (nodes.length >= maxGeneratedNodes) break;
      if (candidate.id === parent.id || parent.path.includes(candidate.name)) continue;
      const shared = parent.inputs.filter(input => candidate.inputs.includes(input));
      const outputFeeds = parent.output === candidate.inputs[0] || candidate.inputs.includes(parent.output);
      const crossDomain = parent.domain !== null && candidate.domain !== null && parent.domain !== candidate.domain;
      const higherOrderBridge = parent.level >= 8 || candidate.level >= 8;
      if (!shared.length && !outputFeeds && !crossDomain && !higherOrderBridge) continue;
      const childId = `${parent.id}>${candidate.id}`;
      if (byPath.has(childId)) continue;
      const child: RecursiveIntelligenceNode = {
        ...candidate,
        id: childId,
        parent_id: parent.id,
        level: Math.max(parent.level, candidate.level),
        level_name: IRIS_FORMAL_LEVELS[Math.max(parent.level, candidate.level) - 1]?.name ?? candidate.level_name,
        depth,
        path: [...parent.path, candidate.name],
        inputs: [...new Set([...parent.inputs, ...candidate.inputs])],
      };
      nodes.push(child); byPath.add(childId); deepestGeneratedPath = Math.max(deepestGeneratedPath, depth);
      walk(child, source, depth + 1);
    }
  };
  for (const node of base) walk(node, base, 2);

  return {
    hierarchy_version: "IRIS_MAXIMUM_INTELLIGENCE_HIERARCHY_V3",
    formal_levels: IRIS_FORMAL_LEVELS,
    domain_subdomains: IRIS_DOMAIN_SUBDOMAINS,
    higher_order_capabilities: IRIS_HIGHER_ORDER_DEFINITIONS,
    semantic_depth_policy: "Unlimited subordinate depth until no additional meaningful intelligence can be derived from available evidence and validated intelligence.",
    runtime_safeguard: { max_generated_nodes: maxGeneratedNodes, safeguard_type: "resource_budget_only", does_not_define_intelligence_depth: true },
    source_reuse_policy: "Every level and branch may access original observed provider evidence, canonical data, and validated intelligence from any prior level; provenance remains attached.",
    evidence_policy: "Capability, compatibility, and theoretical composition are never evidence. A branch is evidence-ready only when every required input is evidence-ready.",
    feedback_loop: "Outcome → Learning → Adaptive → Emergent → Meta → Iris governance",
    nodes,
    counts: {
      formal_levels: IRIS_FORMAL_LEVELS.length,
      domains: Object.keys(IRIS_DOMAIN_SUBDOMAINS).length,
      subdomains: Object.values(IRIS_DOMAIN_SUBDOMAINS).reduce((n, values) => n + values.length, 0),
      higher_order_capabilities: IRIS_HIGHER_ORDER_DEFINITIONS.length,
      nodes: nodes.length,
      base_nodes: base.length,
      generated_nodes: Math.max(0, nodes.length - base.length),
      deepest_generated_path: deepestGeneratedPath,
      evidence_ready: nodes.filter(n => n.evidence_ready).length,
      formal_levels_materialized: new Set(nodes.map(n => n.level)).size,
    },
    generated_without_financial_mutation: true,
    generated_without_provider_mutation: true,
    generated_without_execution_capability: true,
  };
}
