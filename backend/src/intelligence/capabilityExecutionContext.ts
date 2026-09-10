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
  executionId: string;
  runId: string;
  evidenceBoundary: string | null;
  dependencyOutputs: Readonly<Record<string, CapabilityDependencyOutput>>;
  dependencyIds: readonly string[];
  resourceBudget: Readonly<{ max_execution_time_ms: number; max_graph_nodes: number; max_graph_edges: number; max_compositions: number; max_investigations: number }> | null;
  recursionDepth: number;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Load the durable execution context for the current capability and fail closed when its execution graph exceeds the run budget. */
export async function loadCapabilityExecutionContext(userId: string, capabilityId: string, executionId?: string): Promise<CapabilityExecutionContext> {
  const query = supabaseAdmin
    .from("iris_execution_records")
    .select("id,run_id,capability_id,input_manifest,execution_state,started_at")
    .eq("user_id", userId)
    .eq("capability_id", capabilityId)
    .eq("execution_state", "EXECUTING");
  const { data: records, error: recordError } = executionId
    ? await query.eq("id", executionId).limit(1)
    : await query.order("started_at", { ascending: false }).limit(2);

  if (recordError) throw new Error(`CAPABILITY_CONTEXT_RECORD_READ_FAILED: ${recordError.message}`);
  if (!records?.length) throw new Error(`CAPABILITY_CONTEXT_MISSING: ${capabilityId}${executionId ? `:${executionId}` : ""}`);
  if (!executionId && records.length > 1) throw new Error(`CAPABILITY_CONTEXT_AMBIGUOUS: ${capabilityId}`);

  const record = records[0] as { id: string; run_id: string; capability_id: string; input_manifest: Record<string, unknown>; execution_state: string; started_at: string };
  const manifest = record.input_manifest ?? {};
  const dependencyIds = asStringArray(manifest.dependencies);
  const dependencyRefs = manifest.dependency_outputs && typeof manifest.dependency_outputs === "object"
    ? manifest.dependency_outputs as Record<string, { execution_id?: string; output_hash?: string } | null>
    : {};
  const executionIds = dependencyIds.map(id => dependencyRefs[id]?.execution_id).filter((id): id is string => typeof id === "string");
  if (executionIds.length !== dependencyIds.length) throw new Error(`CAPABILITY_DEPENDENCY_REFERENCE_MISSING: ${capabilityId}`);

  const dependencyOutputs: Record<string, CapabilityDependencyOutput> = {};
  if (executionIds.length) {
    const { data: dependencyExecutions, error: dependencyExecutionError } = await supabaseAdmin
      .from("iris_execution_records")
      .select("id,run_id,user_id,capability_id,execution_state,output_hash")
      .in("id", executionIds)
      .eq("run_id", record.run_id)
      .eq("user_id", userId);
    if (dependencyExecutionError) throw new Error(`CAPABILITY_CONTEXT_DEPENDENCY_EXECUTION_READ_FAILED: ${dependencyExecutionError.message}`);

    const dependencyExecutionById = new Map((dependencyExecutions ?? []).map(row => [row.id, row]));
    for (const dependencyId of dependencyIds) {
      const ref = dependencyRefs[dependencyId];
      const dependencyExecution = ref?.execution_id ? dependencyExecutionById.get(ref.execution_id) : undefined;
      if (!ref?.execution_id || !dependencyExecution) throw new Error(`CAPABILITY_DEPENDENCY_EXECUTION_MISSING_OR_FOREIGN: ${capabilityId}->${dependencyId}`);
      if (dependencyExecution.capability_id !== dependencyId) throw new Error(`CAPABILITY_DEPENDENCY_EXECUTION_CAPABILITY_MISMATCH: ${capabilityId}->${dependencyId}`);
      if (dependencyExecution.execution_state !== "EXECUTED") throw new Error(`CAPABILITY_DEPENDENCY_EXECUTION_NOT_COMPLETE: ${capabilityId}->${dependencyId}`);
      if (ref.output_hash && dependencyExecution.output_hash !== ref.output_hash) throw new Error(`CAPABILITY_DEPENDENCY_EXECUTION_HASH_MISMATCH: ${capabilityId}->${dependencyId}`);
    }

    const { data: outputs, error: outputError } = await supabaseAdmin
      .from("iris_execution_outputs")
      .select("execution_id,output_key,value,hash,evidence_state,uncertainty")
      .in("execution_id", executionIds);
    if (outputError) throw new Error(`CAPABILITY_CONTEXT_OUTPUT_READ_FAILED: ${outputError.message}`);
    const outputByExecutionId = new Map((outputs ?? []).map(row => [row.execution_id, row]));
    for (const dependencyId of dependencyIds) {
      const ref = dependencyRefs[dependencyId];
      const output = ref?.execution_id ? outputByExecutionId.get(ref.execution_id) : undefined;
      if (!ref?.execution_id || !output) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_MISSING: ${capabilityId}->${dependencyId}`);
      if (output.output_key !== dependencyId) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_KEY_MISMATCH: ${capabilityId}->${dependencyId}`);
      if (ref.output_hash && output.hash !== ref.output_hash) throw new Error(`CAPABILITY_DEPENDENCY_OUTPUT_HASH_MISMATCH: ${capabilityId}->${dependencyId}`);
      dependencyOutputs[dependencyId] = {
        capability_id: dependencyId,
        execution_id: output.execution_id,
        output_hash: output.hash,
        value: output.value,
        evidence_state: output.evidence_state ?? null,
        uncertainty: output.uncertainty ?? null,
      };
    }
  }

  const { data: run, error: runError } = await supabaseAdmin
    .from("iris_runs")
    .select("resource_budget")
    .eq("id", record.run_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (runError) throw new Error(`CAPABILITY_CONTEXT_RUN_READ_FAILED: ${runError.message}`);
  const resourceBudget = run?.resource_budget && typeof run.resource_budget === "object"
    ? run.resource_budget as CapabilityExecutionContext["resourceBudget"]
    : null;

  const { data: runExecutions, error: graphError } = await supabaseAdmin
    .from("iris_execution_records")
    .select("id,capability_id,input_manifest")
    .eq("run_id", record.run_id)
    .eq("user_id", userId);
  if (graphError) throw new Error(`CAPABILITY_CONTEXT_GRAPH_READ_FAILED: ${graphError.message}`);

  const executions = runExecutions ?? [];
  const manifestByCapability = new Map(executions.map(row => [row.capability_id, row.input_manifest ?? {}]));
  const graphNodes = executions.length;
  const graphEdges = executions.reduce((sum, row) => sum + asStringArray((row.input_manifest ?? {}).dependencies).length, 0);
  const compositions = executions.filter(row => asStringArray((row.input_manifest ?? {}).dependencies).length > 1).length;
  const investigations = executions.filter(row => row.capability_id.includes("investigation")).length;
  if (resourceBudget) {
    if (graphNodes > resourceBudget.max_graph_nodes) throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:graph_nodes:${graphNodes}>${resourceBudget.max_graph_nodes}`);
    if (graphEdges > resourceBudget.max_graph_edges) throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:graph_edges:${graphEdges}>${resourceBudget.max_graph_edges}`);
    if (compositions > resourceBudget.max_compositions) throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:compositions:${compositions}>${resourceBudget.max_compositions}`);
    if (investigations > resourceBudget.max_investigations) throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:investigations:${investigations}>${resourceBudget.max_investigations}`);
    const startedMs = Date.parse(record.started_at);
    if (Number.isFinite(startedMs) && Date.now() - startedMs > resourceBudget.max_execution_time_ms) {
      throw new Error(`CAPABILITY_RESOURCE_BUDGET_EXCEEDED:execution_time_ms:${Date.now() - startedMs}>${resourceBudget.max_execution_time_ms}`);
    }
  }

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

  return {
    userId,
    capabilityId,
    executionId: record.id,
    runId: record.run_id,
    evidenceBoundary: typeof manifest.as_of === "string" ? manifest.as_of : null,
    dependencyOutputs,
    dependencyIds,
    resourceBudget,
    recursionDepth,
  };
}

export function dependencyResult<T = unknown>(context: Pick<CapabilityExecutionContext, "dependencyOutputs">, capabilityId: string): T | null {
  return (context.dependencyOutputs[capabilityId]?.value as T | undefined) ?? null;
}
