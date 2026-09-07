import { createHash } from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";

export type CapabilityContract = {
  key: string;
  label: string;
  capability_group: string;
  description: string | null;
  metadata: Record<string, unknown>;
  active: boolean;
};

export type CapabilityGraphNode = CapabilityContract & {
  node_id: string;
  operator_id: string | null;
  operator_version: string | null;
  evidence_inputs: string[];
  output_types: string[];
  prerequisites: string[];
  validation_rules: string[];
  dependencies: string[];
  depth: number;
  evidence_ready: boolean;
  state: "discoverable" | "ready" | "blocked";
};

export type CapabilityGraphEdge = {
  from: string;
  to: string;
  relation: "depends_on" | "feeds" | "composes_with" | "blocked_by";
  evidence_compatible: boolean;
  semantic_compatible: boolean;
  rationale: string;
};

const asStrings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const metadata = (c: CapabilityContract) => c.metadata ?? {};

function contractValue(c: CapabilityContract, key: string): unknown {
  return metadata(c)[key];
}

function compatible(a: CapabilityContract, b: CapabilityContract): boolean {
  if (a.key === b.key) return false;
  const aOutputs = asStrings(contractValue(a, "output_types"));
  const bInputs = asStrings(contractValue(b, "evidence_inputs"));
  const bOutputs = asStrings(contractValue(b, "output_types"));
  const aInputs = asStrings(contractValue(a, "evidence_inputs"));
  return aOutputs.some(x => bInputs.includes(x)) ||
    bOutputs.some(x => aInputs.includes(x)) ||
    a.capability_group === b.capability_group ||
    aInputs.some(x => bInputs.includes(x));
}

function hashGraph(nodes: CapabilityGraphNode[], edges: CapabilityGraphEdge[]): string {
  return createHash("sha256").update(JSON.stringify({ nodes, edges })).digest("hex");
}

/**
 * Builds a recursively traversable capability graph from persisted contracts.
 * The graph is a plan/discovery artifact: it never creates financial evidence.
 * Depth is bounded only by the caller's resource budget, not by a fixed
 * intelligence-layer ceiling.
 */
export async function buildRecursiveCapabilityGraph(options: {
  userId: string;
  maxDepth?: number;
  maxNodes?: number;
  maxEdges?: number;
}): Promise<{
  graph_version: string;
  nodes: CapabilityGraphNode[];
  edges: CapabilityGraphEdge[];
  roots: string[];
  frontier: string[];
  graph_hash: string;
  truncated_by_budget: boolean;
}> {
  const maxDepth = Math.max(0, options.maxDepth ?? 32);
  const maxNodes = Math.max(1, options.maxNodes ?? 5000);
  const maxEdges = Math.max(1, options.maxEdges ?? 20000);

  const { data, error } = await supabaseAdmin
    .from("iris_intelligence_capabilities")
    .select("key,label,capability_group,description,metadata,active")
    .eq("active", true);
  if (error) throw new Error(`CAPABILITY_GRAPH_LOAD_FAILED:${error.message}`);

  const contracts = (data ?? []) as CapabilityContract[];
  const nodes: CapabilityGraphNode[] = [];
  const edges: CapabilityGraphEdge[] = [];
  const seen = new Set<string>();
  const frontier: string[] = [];
  let truncated = false;

  // Capability readiness is contract/evidence driven. The optional readiness
  // metadata may be populated by a runtime evidence planner; absence is blocked.
  const ready = (c: CapabilityContract) => contractValue(c, "evidence_ready") === true && contractValue(c, "runtime_proven") === true;

  const queue: Array<{ key: string; depth: number }> = contracts.map(c => ({ key: c.key, depth: 0 }));
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(`${current.key}:${current.depth}`)) continue;
    if (nodes.length >= maxNodes) { truncated = true; break; }
    if (current.depth > maxDepth) { frontier.push(current.key); continue; }

    const contract = contracts.find(c => c.key === current.key);
    if (!contract) continue;
    const deps = asStrings(contractValue(contract, "dependencies"));
    const evidenceInputs = asStrings(contractValue(contract, "evidence_inputs"));
    const outputTypes = asStrings(contractValue(contract, "output_types"));
    const prerequisites = asStrings(contractValue(contract, "prerequisites"));
    const validationRules = asStrings(contractValue(contract, "validation_rules"));
    const operatorId = typeof contractValue(contract, "operator_id") === "string" ? contractValue(contract, "operator_id") as string : null;
    const operatorVersion = typeof contractValue(contract, "operator_version") === "string" ? contractValue(contract, "operator_version") as string : null;
    const isReady = ready(contract);

    nodes.push({
      ...contract,
      node_id: `${contract.key}@${current.depth}`,
      operator_id: operatorId,
      operator_version: operatorVersion,
      evidence_inputs: evidenceInputs,
      output_types: outputTypes,
      prerequisites,
      validation_rules: validationRules,
      dependencies: deps,
      depth: current.depth,
      evidence_ready: isReady,
      state: isReady ? "ready" : "blocked",
    });
    seen.add(`${current.key}:${current.depth}`);

    for (const dep of deps) {
      if (edges.length >= maxEdges) { truncated = true; break; }
      const target = contracts.find(c => c.key === dep);
      const targetReady = !!target && ready(target);
      edges.push({ from: contract.key, to: dep, relation: "depends_on", evidence_compatible: targetReady, semantic_compatible: !!target, rationale: target ? `Declared dependency of ${contract.key}.` : `Dependency ${dep} is not registered.` });
      if (target) queue.push({ key: target.key, depth: current.depth + 1 });
      else frontier.push(dep);
    }

    if (edges.length >= maxEdges) { truncated = true; break; }
    for (const other of contracts) {
      if (!compatible(contract, other)) continue;
      if (edges.length >= maxEdges) { truncated = true; break; }
      edges.push({
        from: contract.key,
        to: other.key,
        relation: contract.capability_group === other.capability_group ? "composes_with" : "feeds",
        evidence_compatible: ready(contract) && ready(other),
        semantic_compatible: true,
        rationale: `Contract inputs/outputs or capability family permit composition; readiness remains evidence-gated.`,
      });
      if (current.depth < maxDepth) queue.push({ key: other.key, depth: current.depth + 1 });
    }
  }

  const roots = contracts.filter(c => !contracts.some(d => asStrings(contractValue(d, "dependencies")).includes(c.key))).map(c => c.key);
  return {
    graph_version: "IRIS_RECURSIVE_CAPABILITY_GRAPH_V1",
    nodes,
    edges,
    roots,
    frontier: [...new Set(frontier)],
    graph_hash: hashGraph(nodes, edges),
    truncated_by_budget: truncated,
  };
}
