import { createHash } from "node:crypto";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type SemanticDependencyProof = {
  capability_id: string;
  consumed_dependency_ids: string[];
  consumed_dependency_hashes: Record<string, string>;
  consumed_dependency_paths: Record<string, string[]>;
  output_hash: string;
  proof_version: string;
};

export const SEMANTIC_DEPENDENCY_PROOF_VERSION = "1.2.0" as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
}
export function hashIntelligenceResult(result: CapabilityOperatorResult): string { return createHash("sha256").update(JSON.stringify(canonicalize(result.result))).digest("hex"); }
export function buildSemanticDependencyProof(capabilityId: string, consumedDependencyIds: string[], dependencyResults: Record<string, CapabilityOperatorResult>, consumedDependencyPaths: Record<string, Set<string>>, output: CapabilityOperatorResult): SemanticDependencyProof {
  const consumed = [...new Set(consumedDependencyIds)].filter((id) => dependencyResults[id] !== undefined).sort();
  const consumedHashes = Object.fromEntries(consumed.map((id) => [id, hashIntelligenceResult(dependencyResults[id])]));
  const paths = Object.fromEntries(consumed.map((id) => [id, [...(consumedDependencyPaths[id] ?? new Set<string>())].sort()]));
  return { capability_id: capabilityId, consumed_dependency_ids: consumed, consumed_dependency_hashes: consumedHashes, consumed_dependency_paths: paths, output_hash: hashIntelligenceResult(output), proof_version: SEMANTIC_DEPENDENCY_PROOF_VERSION };
}
export function verifySemanticDependencyProof(proof: SemanticDependencyProof, dependencyResults: Record<string, CapabilityOperatorResult>, output: CapabilityOperatorResult): boolean {
  if (proof.proof_version !== SEMANTIC_DEPENDENCY_PROOF_VERSION || proof.output_hash !== hashIntelligenceResult(output)) return false;
  const ids = [...new Set(proof.consumed_dependency_ids)].sort();
  const hashIds = Object.keys(proof.consumed_dependency_hashes).sort();
  const pathIds = Object.keys(proof.consumed_dependency_paths).sort();
  if (ids.length !== hashIds.length || ids.length !== pathIds.length || ids.some((id, index) => id !== hashIds[index] || id !== pathIds[index])) return false;
  return ids.every((id) => dependencyResults[id] !== undefined && proof.consumed_dependency_hashes[id] === hashIntelligenceResult(dependencyResults[id]) && Array.isArray(proof.consumed_dependency_paths[id]));
}
