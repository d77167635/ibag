import type { IrisAnalysisDefinition } from "./analysisAtlas.js";

export type IrisFormalLevel = {
  level: number;
  name: string;
  responsibility: string;
  governs: string[];
};

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

export type RecursiveIntelligenceNode = {
  id: string;
  parent_id: string | null;
  level: number;
  level_name: string;
  domain: string | null;
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

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const domainFor = (definition: IrisAnalysisDefinition): string | null => {
  const known = new Set(["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"]);
  return known.has(definition.family) ? definition.family : null;
};

function formalLevelFor(definition: IrisAnalysisDefinition): number {
  if (domainFor(definition)) return 2;
  if (["relationship", "causal", "integrity", "evidence", "explainability"].includes(definition.output)) return 4;
  if (["forecast", "projection", "trajectory"].includes(definition.output)) return 5;
  if (["scenario", "simulation", "counterfactual"].includes(definition.output)) return 6;
  if (["decision", "optimization", "goal"].includes(definition.output)) return 7;
  if (["outcome", "validation"].includes(definition.output)) return 8;
  if (["learning"].includes(definition.output)) return 9;
  if (["adaptive"].includes(definition.output)) return 10;
  if (["emergent"].includes(definition.output)) return 11;
  if (["meta"].includes(definition.output)) return 12;
  return 3;
}

/**
 * Builds an explicit 12-level governance hierarchy while allowing unlimited
 * subordinate analytical depth. Runtime limits are resource safeguards, not
 * semantic intelligence-level limits. Source evidence remains reusable at
 * every node; derived intelligence never replaces original provider evidence.
 */
export function buildRecursiveIntelligenceHierarchy(
  definitions: Array<IrisAnalysisDefinition & { evidence_ready?: boolean }>,
  options: { maxGeneratedNodes?: number } = {},
) {
  const maxGeneratedNodes = Math.max(1000, options.maxGeneratedNodes ?? 20000);
  const nodes: RecursiveIntelligenceNode[] = [];
  const byParent = new Map<string, string[]>();

  for (const definition of definitions) {
    if (nodes.length >= maxGeneratedNodes) break;
    const level = formalLevelFor(definition);
    const domain = domainFor(definition);
    const id = `L${level}:${definition.id}`;
    nodes.push({
      id,
      parent_id: level === 2 ? "L1:IRIS" : `L${level - 1}:governor`,
      level,
      level_name: IRIS_FORMAL_LEVELS[level - 1]?.name ?? "Analytical Intelligence",
      domain,
      family: definition.family,
      name: definition.name,
      purpose: definition.purpose,
      inputs: [...definition.inputs],
      output: definition.output,
      evidence_ready: definition.evidence_ready === true,
      depth: 1,
      path: ["IRIS", IRIS_FORMAL_LEVELS[level - 1]?.name ?? "Analytical Intelligence", definition.name],
      reusable_source_access: true,
    });
  }

  const base = [...nodes];
  let generatedDepth = 0;
  // Recursively compose compatible analytical definitions. Each generated node
  // is a distinct intelligence branch; cycles are prevented by canonical path.
  const walk = (parent: RecursiveIntelligenceNode, source: RecursiveIntelligenceNode[], depth: number) => {
    if (nodes.length >= maxGeneratedNodes || depth > definitions.length) return;
    for (const candidate of source) {
      if (nodes.length >= maxGeneratedNodes) break;
      if (candidate.id === parent.id || candidate.path.includes(candidate.name)) continue;
      const shared = parent.inputs.filter(input => candidate.inputs.includes(input));
      const outputFeeds = parent.output === candidate.inputs[0] || candidate.inputs.includes(parent.output);
      const crossDomain = parent.domain !== null && candidate.domain !== null && parent.domain !== candidate.domain;
      if (!shared.length && !outputFeeds && !crossDomain) continue;
      const childId = `${parent.id}>${candidate.id}`;
      if (nodes.some(n => n.id === childId)) continue;
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
      nodes.push(child);
      const children = byParent.get(parent.id) ?? [];
      children.push(child.id);
      byParent.set(parent.id, children);
      generatedDepth = Math.max(generatedDepth, depth);
      walk(child, source, depth + 1);
    }
  };
  for (const node of base) walk(node, base, 2);

  return {
    hierarchy_version: "IRIS_MAXIMUM_INTELLIGENCE_HIERARCHY_V1",
    formal_levels: IRIS_FORMAL_LEVELS,
    semantic_depth_policy: "Unlimited subordinate depth until no additional meaningful evidence-supported intelligence can be derived; no fixed semantic level ceiling.",
    runtime_safeguard: { max_generated_nodes: maxGeneratedNodes, safeguard_type: "resource_budget_only", does_not_define_intelligence_depth: true },
    source_reuse_policy: "Every level may access original observed provider evidence, canonical data, and validated intelligence from any prior level; provenance must remain attached.",
    evidence_policy: "Generated compatibility is never evidence. An intelligence node is evidence-ready only when every required input is evidence-ready.",
    feedback_loop: "Outcome → Learning → Adaptive → Emergent → Meta → Iris governance",
    nodes,
    counts: {
      formal_levels: IRIS_FORMAL_LEVELS.length,
      nodes: nodes.length,
      base_nodes: base.length,
      generated_nodes: Math.max(0, nodes.length - base.length),
      deepest_generated_path: generatedDepth,
      evidence_ready: nodes.filter(n => n.evidence_ready).length,
      domains: new Set(nodes.map(n => n.domain).filter(Boolean)).size,
    },
    generated_without_financial_mutation: true,
    generated_without_provider_mutation: true,
    generated_without_execution_capability: true,
  };
}
