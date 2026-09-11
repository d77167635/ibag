export type ReportRuntimeComponent = {
  report_id: string;
  intelligence_node_ids: string[];
  upstream_intelligence_node_ids: string[];
  run_id: string;
  execution_id: string;
};

export type RecursiveReportComposition = {
  report_ids: string[];
  intelligence_node_ids: string[];
  upstream_intelligence_node_ids: string[];
  run_id: string;
  execution_id: string;
  depth: number | null;
  limitation: string | null;
};

/**
 * Composes already-resolved runtime reports. Depth is derived from supplied
 * graph metadata when available; this function imposes no maximum hierarchy.
 * Empty input is explicit rather than fabricated.
 */
export function composeRecursiveReports(input: {
  components: ReportRuntimeComponent[];
  depthByNodeId?: Record<string, number | null>;
}): RecursiveReportComposition {
  if (input.components.length === 0) throw new Error("RECURSIVE_REPORT_COMPOSITION_INPUT_EMPTY");
  const first = input.components[0];
  if (input.components.some((item) => item.run_id !== first.run_id || item.execution_id !== first.execution_id)) throw new Error("RECURSIVE_REPORT_COMPOSITION_BOUNDARY_MISMATCH");
  const intelligence = [...new Set(input.components.flatMap((item) => item.intelligence_node_ids))].sort();
  const upstream = [...new Set(input.components.flatMap((item) => item.upstream_intelligence_node_ids))].filter((id) => !intelligence.includes(id)).sort();
  const depths = intelligence.map((id) => input.depthByNodeId?.[id]).filter((value): value is number => typeof value === "number");
  return {
    report_ids: [...new Set(input.components.map((item) => item.report_id))].sort(),
    intelligence_node_ids: intelligence,
    upstream_intelligence_node_ids: upstream,
    run_id: first.run_id,
    execution_id: first.execution_id,
    depth: depths.length ? Math.max(...depths) : null,
    limitation: depths.length === intelligence.length ? null : "Runtime composition is resolved, but one or more node depths were not supplied; no artificial depth value is inferred.",
  };
}
