import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export const RECURSIVE_LINEAGE_VERSION = "iris-recursive-lineage-v1" as const;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function lineageHash(input: Record<string, unknown>): string {
  return hash({ version: RECURSIVE_LINEAGE_VERSION, ...input });
}

/**
 * Persist the actual dependency graph traversed by one governed execution.
 * Capability identifiers are semantic graph node identifiers; the execution
 * record supplies the concrete run boundary. No financial observation is
 * created here.
 */
export async function persistRecursiveLineage(input: {
  userId: string;
  runId: string;
  executionId: string;
  capabilityId: string;
  result: CapabilityOperatorResult;
  dependencyResults: Record<string, CapabilityOperatorResult>;
  runEvidenceIds: string[];
}): Promise<void> {
  const rows: Array<Record<string, unknown>> = [];

  for (const [dependencyId, dependency] of Object.entries(input.dependencyResults).sort(([a], [b]) => a.localeCompare(b))) {
    const sourceHash = hash(dependency.result);
    const metadata = {
      lineage_version: RECURSIVE_LINEAGE_VERSION,
      dependency_capability_id: dependencyId,
      destination_capability_id: input.capabilityId,
      dependency_evidence_state: dependency.evidence_state,
      dependency_output_hash: sourceHash,
      destination_output_hash: hash(input.result.result),
      actual_dependency_consumed: true,
    };
    rows.push({
      user_id: input.userId,
      run_id: input.runId,
      execution_id: input.executionId,
      lineage_role: "DEPENDENCY_INPUT",
      source_type: "capability_output",
      source_id: `${input.runId}:${dependencyId}`,
      source_field_path: null,
      destination_type: "capability_output",
      destination_id: `${input.runId}:${input.capabilityId}`,
      destination_field_path: null,
      evidence_state: dependency.evidence_state,
      transformation: `compose:${dependencyId}->${input.capabilityId}`,
      source_hash: sourceHash,
      lineage_hash: lineageHash({ role: "DEPENDENCY_INPUT", source: dependencyId, destination: input.capabilityId, source_hash: sourceHash, destination_hash: hash(input.result.result) }),
      metadata,
    });
  }

  for (const evidenceId of [...new Set(input.runEvidenceIds)].sort()) {
    const metadata = {
      lineage_version: RECURSIVE_LINEAGE_VERSION,
      destination_capability_id: input.capabilityId,
      run_evidence_id: evidenceId,
      actual_evidence_boundary: true,
    };
    rows.push({
      user_id: input.userId,
      run_id: input.runId,
      execution_id: input.executionId,
      lineage_role: "SOURCE_EVIDENCE",
      source_type: "run_evidence",
      source_id: evidenceId,
      source_field_path: null,
      destination_type: "capability_output",
      destination_id: `${input.runId}:${input.capabilityId}`,
      destination_field_path: null,
      evidence_state: input.result.evidence_state,
      transformation: `derive:${input.capabilityId}`,
      source_hash: null,
      lineage_hash: lineageHash({ role: "SOURCE_EVIDENCE", source: evidenceId, destination: input.capabilityId, output_hash: hash(input.result.result) }),
      metadata,
    });
  }

  if (!rows.length) return;

  const { error } = await supabaseAdmin.from("iris_execution_lineage").upsert(rows, {
    onConflict: "user_id,execution_id,lineage_role,source_type,source_id,source_field_path,destination_type,destination_id,destination_field_path,lineage_hash",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`RECURSIVE_LINEAGE_PERSIST_FAILED: ${error.message}`);
}
