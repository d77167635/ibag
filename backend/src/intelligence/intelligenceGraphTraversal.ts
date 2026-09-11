export type IntelligenceGraphEdge = {
  user_id: string;
  run_id: string;
  execution_id?: string | null;
  upstream_node_id: string;
  downstream_node_id: string;
  relation_type: string;
};

export type IntelligenceGraphTraversalResult = {
  start_node_id: string;
  direction: "upstream" | "downstream";
  node_ids: string[];
  edge_keys: string[];
  cycle_detected: boolean;
  boundary_mismatch_count: number;
};

function edgeKey(edge: IntelligenceGraphEdge): string {
  return [edge.upstream_node_id, edge.downstream_node_id, edge.relation_type].join("|");
}

function matchesBoundary(edge: IntelligenceGraphEdge, userId: string, runId: string, executionId?: string | null): boolean {
  return edge.user_id === userId && edge.run_id === runId && (executionId == null || edge.execution_id === executionId);
}

/**
 * Traverse only an explicitly supplied persisted graph boundary.
 * This function never invents nodes or treats missing edges as evidence.
 * A cycle is reported and traversal terminates that branch; it is not an
 * intelligence-depth ceiling.
 */
export function traverseIntelligenceGraph(input: {
  startNodeId: string;
  direction: "upstream" | "downstream";
  edges: IntelligenceGraphEdge[];
  userId: string;
  runId: string;
  executionId?: string | null;
}): IntelligenceGraphTraversalResult {
  const eligible = input.edges.filter((edge) => matchesBoundary(edge, input.userId, input.runId, input.executionId));
  const boundaryMismatchCount = input.edges.length - eligible.length;
  const adjacency = new Map<string, IntelligenceGraphEdge[]>();
  for (const edge of eligible) {
    const key = input.direction === "upstream" ? edge.downstream_node_id : edge.upstream_node_id;
    adjacency.set(key, [...(adjacency.get(key) ?? []), edge]);
  }

  const nodeIds: string[] = [];
  const edgeKeys: string[] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  let cycleDetected = false;

  const walk = (nodeId: string) => {
    if (active.has(nodeId)) {
      cycleDetected = true;
      return;
    }
    if (visited.has(nodeId)) return;
    active.add(nodeId);
    visited.add(nodeId);
    if (nodeId !== input.startNodeId) nodeIds.push(nodeId);
    for (const edge of adjacency.get(nodeId) ?? []) {
      edgeKeys.push(edgeKey(edge));
      const next = input.direction === "upstream" ? edge.upstream_node_id : edge.downstream_node_id;
      walk(next);
    }
    active.delete(nodeId);
  };

  walk(input.startNodeId);
  return {
    start_node_id: input.startNodeId,
    direction: input.direction,
    node_ids: [...new Set(nodeIds)].sort(),
    edge_keys: [...new Set(edgeKeys)].sort(),
    cycle_detected: cycleDetected,
    boundary_mismatch_count: boundaryMismatchCount,
  };
}
