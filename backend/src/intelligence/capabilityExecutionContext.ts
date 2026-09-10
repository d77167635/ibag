import { supabaseAdmin } from "../config/supabase.js";

export type CapabilityDependencyOutput = {
  capability_id: string;
  execution_id: string;
  output_hash: string;
  value: unknown;
  evidence_state: string | null;
  uncertainty: unknown;
};

export type CapabilityExecutionContext = {
  userId: string;
  capabilityId: string;
  evidenceBoundary: string | null;
  dependencyOutputs: Readonly<Record<string, CapabilityDependencyOutput>>;
  dependencyIds: readonly string[];
  resourceBudget: Readonly<{ max_execution_time_ms: number; max_graph_nodes: number; max_graph_edges: number; max_compositions: number; max_investigations: number }> | null;
  recursionDepth: number;
};

function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

/** Load the durable execution context for the currently executing capability. */
export async function loadCapabilityExecutionContext(userId: string, capabilityId: string): Promise<CapabilityExecutionContext> {
  const { data: records, error: recordError } = await supabaseAdmin
    .from("iris_execution_records")
    .select("id,run_id,input_manifest")
    .eq("user_id", userId)
    .eq("capability_id", capabilityId)
    .eq("execution_state", "EXECUTING")
    .order("started_at", { ascending: false })
    .limit(2);

  if (recordError) throw new Error(`CAPABILITY_CONTEXT_RECORD_READ_FAILED: ${recordError.message}`);
  if (!records?.length) throw new Error(`CAPABILITY_CONTEXT_MISSING: ${capabilityId}`);
  if (records.length > 1) throw new Error(`CAPABILITY_CONTEXT_AMBIGUOUS: ${capabilityId}`);

  const record = records[0] as { id: string; run_id: string; input_manifest: any };
  const manifest = record.input_manifest ?? {};
  const dependencyIds = asStringArray(manifest.dependencies);
  const dependencyRefs = manifest.dependency_outputs && typeof manifest.dependency_outputs === "object" ? manifest.dependency_outputs as Record<string, { execution_id?: string; output_hash?: string } | null> : {};
  const executionIds = dependencyIds.map(id => dependencyRefs[id]?.execution_id).filter((id): id is string => typeof id === "string");

  const dependencyOutputs: Record<string, CapabilityDependencyOutput> = {};
  if (executionIds.length) {
    const { data: outputs, error: outputError } = await supabaseAdmin
      .from("iris_execution_outputs")
      .select("execution_id,output_key,value,hash,evidence_state,uncertainty")
      .in("execution_id", executionIds);
    if (outputError) throw new Error(`CAPABILITY_CONTEXT_OUTPUT_READ_FAILED: ${outputError.message}`);
    const byExecutionId = new Map((outputs ?? []).map(row => [row.execution_id, row]));
    for (const dependencyId of dependencyIds) {
      const ref = dependencyRefs[dependencyId];
      if (!ref?.execution_id) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_MISSING: ${capabilityId}->${dependencyId}`);
      const output = byExecutionId.get(ref.execution_id);
      if (!output) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_MISSING: ${capabilityId}->${dependencyId}`);
      if (ref.output_hash && output.hash !== ref.output_hash) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_HASH_MISMATCH: ${capabilityId}->${dependencyId}`);
      dependencyOutputs[dependencyId] = { capability_id: dependencyId, execution_id: output.execution_id, output_hash: output.hash, value: output.value, evidence_state: output.evidence_state ?? null, uncertainty: output.uncertainty ?? null };
    }
  } else if (dependencyIds.length) {
    throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_MISSING: ${capabilityId}`);
  }

  const { data: run, error: runError } = await supabaseAdmin.from("iris_runs").select("resource_budget").eq("id", record.run_id).eq("user_id", userId).maybeSingle();
  if (runError) throw new Error(`CAPABILITY_CONTEXT_RUN_READ_FAILED: ${runError.message}`);
  const resourceBudget = run?.resource_budget && typeof run.resource_budget === "object" ? run.resource_budget as CapabilityExecutionContext["resourceBudget"] : null;

  const { data: runExecutions, error: graphError } = await supabaseAdmin.from("iris_execution_records").select("id,capability_id,input_manifest").eq("run_id", record.run_id).eq("user_id", userId);
  if (graphError) throw new Error(`CAPABILITY_CONTEXT_GRAPH_READ_FAILED: ${graphError.message}`);
  const manifestByCapability = new Map((runExecutions ?? []).map(row => [row.capability_id, row.input_manifest ?? {}]));
  const depthMemo = new Map<string, number>();
  const active = new Set<string>();
  const depthOf = (id: string): number => {
    const memo = depthMemo.get(id);
    if (memo !== undefined) return memo;
    if (active.has(id)) throw new Error(`CAPABILITY_CONTEXT_CYCLE_DETECTED: ${id}`);
    active.add(id);
    const deps = asStringArray(manifestByCapability.get(id)?.dependencies);
    const depth = deps.length ? 1 + Math.max(...deps.map(depthOf)) : 0;
    active.delete(id);
    depthMemo.set(id, depth);
    return depth;
  };
  const recursionDepth = depthOf(capabilityId);

  return { userId, capabilityId, evidenceBoundary: typeof manifest.as_of === "string" ? manifest.as_of : null, dependencyOutputs, dependencyIds, resourceBudget, recursionDepth };
}

export function dependencyResult<T = any>(context: CapabilityExecutionContext, capabilityId: string): T | null {
  return (context.dependencyOutputs[capabilityId]?.value as T | undefined) ?? null;
}
