/**
 * Iris Intelligence Hierarchy
 *
 * This module is the canonical semantic hierarchy for Iris intelligence.
 * It is intentionally independent of UI pages, product catalogs, provider
 * products, and financial-data fixtures.
 *
 * Formal hierarchy:
 *   Level 1: Iris
 *   Level 2: eight financial-life domain intelligences
 *   Level 3+: recursively governed intelligence branches
 *
 * There is no artificial maximum semantic depth. A branch may create another
 * branch whenever the parent intelligence produces a meaningful, evidence-
 * governed question or intelligence object that can itself be analyzed.
 * Runtime resource limits are execution controls, never hierarchy limits.
 */

export const IRIS_INTELLIGENCE_HIERARCHY_VERSION = "IRIS_INTELLIGENCE_HIERARCHY_V1" as const;

export type IrisHierarchyEvidenceState =
  | "OBSERVED"
  | "CALCULATED"
  | "INFERRED"
  | "PREDICTED"
  | "SCENARIO"
  | "INSUFFICIENT_EVIDENCE";

export type IrisHierarchyNodeKind = "iris" | "domain" | "intelligence" | "higher_order";

export type IrisIntelligenceNode = {
  id: string;
  parent_id: string | null;
  level: number;
  kind: IrisHierarchyNodeKind;
  name: string;
  purpose: string;
  domain_id: string | null;
  branch_key: string;
  can_recurse: true;
};

export type IrisIntelligenceDomain = IrisIntelligenceNode & {
  kind: "domain";
  level: 2;
  domain_id: string;
};

export type IrisIntelligenceHierarchy = {
  version: typeof IRIS_INTELLIGENCE_HIERARCHY_VERSION;
  root: IrisIntelligenceNode;
  domains: readonly IrisIntelligenceDomain[];
  rules: {
    formal_levels: readonly [1, 2];
    recursive_level_start: 3;
    maximum_semantic_depth: null;
    recursion_condition: string;
    resource_limits_are_semantic_limits: false;
    capability_families_are_levels: false;
  };
};

const root: IrisIntelligenceNode = {
  id: "iris",
  parent_id: null,
  level: 1,
  kind: "iris",
  name: "Iris",
  purpose: "Govern the complete financial-life intelligence hierarchy and determine what deeper intelligence can be responsibly derived.",
  domain_id: null,
  branch_key: "iris",
  can_recurse: true,
};

const domain = (
  id: string,
  name: string,
  purpose: string,
): IrisIntelligenceDomain => ({
  id: `domain.${id}`,
  parent_id: "iris",
  level: 2,
  kind: "domain",
  name,
  purpose,
  domain_id: id,
  branch_key: id,
  can_recurse: true,
});

/**
 * The eight and only eight formal Level-2 domain intelligences.
 *
 * Their children are not fixed here. Each domain is a recursive root from
 * which evidence-valid subdomains and deeper intelligence may be created.
 */
export const IRIS_DOMAIN_INTELLIGENCES = [
  domain("auth", "Auth Intelligence", "Understand authorization, connection identity, access state, consent context, and the evidence boundary governing what Iris may know."),
  domain("transactions", "Transactions Intelligence", "Understand observed economic activity, transaction semantics, merchants, categories, timing, recurrence, and transaction-derived behavior."),
  domain("balance", "Balance Intelligence", "Understand observed account balances, available capacity, liquidity, balance movement, and financial-state position."),
  domain("identity", "Identity Intelligence", "Understand the identity information actually supplied by authorized financial data and its relationships to the financial life state."),
  domain("assets", "Assets Intelligence", "Understand observed assets and asset-related financial information, including structure, position, movement, and relationships where evidence supports them."),
  domain("liabilities", "Liabilities Intelligence", "Understand observed liabilities, obligations, balances, payments, costs, utilization, timing, and changing debt conditions."),
  domain("investments", "Investments Intelligence", "Understand observed investment holdings, positions, activity, valuation information, and investment relationships where supported by available evidence."),
  domain("statements", "Statements Intelligence", "Understand statement-level financial evidence, periods, balances, activity, disclosures, and relationships to the broader financial life state."),
] as const;

const domainById = new Map(IRIS_DOMAIN_INTELLIGENCES.map(item => [item.domain_id, item]));

/**
 * Returns the immutable formal hierarchy roots.
 * No financial values are created by this function.
 */
export function getIrisIntelligenceHierarchy(): IrisIntelligenceHierarchy {
  return {
    version: IRIS_INTELLIGENCE_HIERARCHY_VERSION,
    root,
    domains: IRIS_DOMAIN_INTELLIGENCES,
    rules: {
      formal_levels: [1, 2],
      recursive_level_start: 3,
      maximum_semantic_depth: null,
      recursion_condition: "Create deeper intelligence only when a parent intelligence produces a distinct, meaningful, evidence-governed intelligence question or result that can itself be evaluated.",
      resource_limits_are_semantic_limits: false,
      capability_families_are_levels: false,
    },
  };
}

export function getIrisDomain(domainId: string): IrisIntelligenceDomain | null {
  return domainById.get(domainId) ?? null;
}

/**
 * Create a genuine child in the hierarchy.
 *
 * The function deliberately accepts any parent node, so depth is recursive:
 * a child can itself become a parent without a predefined maximum level.
 */
export function createIrisIntelligenceChild(input: {
  parent: IrisIntelligenceNode;
  id: string;
  name: string;
  purpose: string;
  kind?: "intelligence" | "higher_order";
}): IrisIntelligenceNode {
  if (!input.id.trim()) throw new Error("Iris hierarchy child id is required.");
  if (!input.name.trim()) throw new Error("Iris hierarchy child name is required.");
  if (!input.purpose.trim()) throw new Error("Iris hierarchy child purpose is required.");
  if (input.parent.kind === "iris" && (input.parent.level !== 1 || input.parent.id !== "iris")) {
    throw new Error("Invalid Iris root node.");
  }

  return {
    id: input.id,
    parent_id: input.parent.id,
    level: input.parent.level + 1,
    kind: input.kind ?? "intelligence",
    name: input.name,
    purpose: input.purpose,
    domain_id: input.parent.domain_id,
    branch_key: `${input.parent.branch_key}.${input.id}`,
    can_recurse: true,
  };
}

/**
 * Materialize a finite branch path for inspection or execution planning.
 * The path itself is finite because the caller supplies a finite sequence;
 * the hierarchy has no semantic ceiling.
 */
export function materializeIrisBranchPath(input: {
  domainId: string;
  branches: ReadonlyArray<{ id: string; name: string; purpose: string; kind?: "intelligence" | "higher_order" }>;
}): IrisIntelligenceNode[] {
  const domainNode = getIrisDomain(input.domainId);
  if (!domainNode) throw new Error(`Unknown Iris domain: ${input.domainId}`);

  const nodes: IrisIntelligenceNode[] = [];
  let parent: IrisIntelligenceNode = domainNode;

  for (const branch of input.branches) {
    const child = createIrisIntelligenceChild({ parent, ...branch });
    nodes.push(child);
    parent = child;
  }

  return nodes;
}

/**
 * Return the ancestor chain for a materialized finite branch.
 * This operates only on hierarchy structure; it does not infer financial facts.
 */
export function buildIrisHierarchyPath(nodes: readonly IrisIntelligenceNode[]): IrisIntelligenceNode[] {
  if (nodes.length === 0) return [];

  const byId = new Map<string, IrisIntelligenceNode>([
    [root.id, root],
    ...IRIS_DOMAIN_INTELLIGENCES.map(node => [node.id, node] as const),
    ...nodes.map(node => [node.id, node] as const),
  ]);

  const path: IrisIntelligenceNode[] = [];
  let current: IrisIntelligenceNode | undefined = nodes[nodes.length - 1];
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current.id)) throw new Error("Iris hierarchy cycle detected.");
    seen.add(current.id);
    path.push(current);
    if (current.parent_id === null) break;
    current = byId.get(current.parent_id);
    if (!current) throw new Error(`Missing Iris hierarchy parent: ${path[path.length - 1].parent_id}`);
  }

  return path.reverse();
}

/**
 * Formal hierarchy invariants. These are intended for tests and certification
 * tooling; they do not inspect or manufacture financial data.
 */
export function validateIrisIntelligenceHierarchy(): string[] {
  const errors: string[] = [];
  if (root.level !== 1 || root.kind !== "iris" || root.id !== "iris") errors.push("Level 1 must be the Iris root.");
  if (IRIS_DOMAIN_INTELLIGENCES.length !== 8) errors.push("Iris must have exactly eight formal Level-2 domains.");

  const ids = new Set<string>();
  for (const item of IRIS_DOMAIN_INTELLIGENCES) {
    if (ids.has(item.id)) errors.push(`Duplicate domain id: ${item.id}`);
    ids.add(item.id);
    if (item.level !== 2 || item.kind !== "domain") errors.push(`Invalid Level-2 node: ${item.id}`);
    if (item.parent_id !== "iris") errors.push(`Invalid domain parent: ${item.id}`);
    if (!item.domain_id) errors.push(`Domain id missing: ${item.id}`);
    if (!item.can_recurse) errors.push(`Domain cannot recurse: ${item.id}`);
  }

  return errors;
}

export const IRIS_INTELLIGENCE_HIERARCHY = getIrisIntelligenceHierarchy();

/**
 * Evidence states belong to intelligence results, not hierarchy levels.
 * This type alias is exported here so hierarchy consumers cannot accidentally
 * encode evidence certainty as semantic depth.
 */
export type IrisHierarchyResultEvidenceState = IrisHierarchyEvidenceState;
