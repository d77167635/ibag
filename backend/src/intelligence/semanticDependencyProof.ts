import { createHash } from "node:crypto";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type SemanticDependencyProof = {
  capability_id: string;
  consumed_dependency_ids: string[];
  consumed_dependency_hashes: Record<string, string>;
  output_hash: string;
  proof_version: string;
};

export const SEMANTIC_DEPENDENCY_PROOF_VERSION = "1.1.0" as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function hashIntelligenceResult(result: CapabilityOperatorResult): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(result.result))).digest("hex");
}

export function buildSemanticDependencyProof(
  capabilityId: string,
  consumedDependencyIds: string[],
  dependencyResults: Record<string, CapabilityOperatorResult>,
  output: CapabilityOperatorResult,
): SemanticDependencyProof {
  const consumed = [...new Set(consumedDependencyIds)].filter((id) => dependencyResults[id] !== undefined).sort();
  const consumedHashes = Object.fromEntries(
    consumed.map((id) => [id, hashIntelligenceResult(dependencyResults[id])]),
  );
  return {
    capability_id: capabilityId,
    consumed_dependency_ids: consumed,
    consumed_dependency_hashes: consumedHashes,
    output_hash: hashIntelligenceResult(output),
    proof_version: SEMANTIC_DEPENDENCY_PROOF_VERSION,
  };
}

export function verifySemanticDependencyProof(
  proof: SemanticDependencyProof,
  dependencyResults: Record<string, CapabilityOperatorResult>,
  output: CapabilityOperatorResult,
): boolean {
  if (proof.proof_version !== SEMANTIC_DEPENDENCY_PROOF_VERSION) return false;
  if (proof.output_hash !== hashIntelligenceResult(output)) return false;
  const ids = [...new Set(proof.consumed_dependency_ids)].sort();
  const hashIds = Object.keys(proof.consumed_dependency_hashes).sort();
  if (ids.length !== hashIds.length || ids.some((id, index) => id !== hashIds[index])) return false;
  return ids.every((id) => {
    const dependency = dependencyResults[id];
    return dependency !== undefined && proof.consumed_dependency_hashes[id] === hashIntelligenceResult(dependency);
  });
}
