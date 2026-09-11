import { createHash } from "node:crypto";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type SemanticDependencyProof = {
  capability_id: string;
  consumed_dependency_ids: string[];
  consumed_dependency_hashes: Record<string, string>;
  output_hash: string;
  proof_version: string;
};

const PROOF_VERSION = "1.0.0";

export function hashIntelligenceResult(result: CapabilityOperatorResult): string {
  return createHash("sha256").update(JSON.stringify(result.result)).digest("hex");
}

export function buildSemanticDependencyProof(
  capabilityId: string,
  declaredDependencyIds: string[],
  dependencyResults: Record<string, CapabilityOperatorResult>,
  output: CapabilityOperatorResult,
): SemanticDependencyProof {
  const consumed = declaredDependencyIds.filter((id) => dependencyResults[id] !== undefined);
  const consumedHashes = Object.fromEntries(
    consumed.sort().map((id) => [id, hashIntelligenceResult(dependencyResults[id])]),
  );
  return {
    capability_id: capabilityId,
    consumed_dependency_ids: consumed,
    consumed_dependency_hashes: consumedHashes,
    output_hash: hashIntelligenceResult(output),
    proof_version: PROOF_VERSION,
  };
}

export function verifySemanticDependencyProof(
  proof: SemanticDependencyProof,
  dependencyResults: Record<string, CapabilityOperatorResult>,
  output: CapabilityOperatorResult,
): boolean {
  if (proof.proof_version !== PROOF_VERSION) return false;
  if (proof.output_hash !== hashIntelligenceResult(output)) return false;
  const ids = [...proof.consumed_dependency_ids].sort();
  if (ids.length !== Object.keys(proof.consumed_dependency_hashes).length) return false;
  return ids.every((id) => {
    const dependency = dependencyResults[id];
    return dependency !== undefined && proof.consumed_dependency_hashes[id] === hashIntelligenceResult(dependency);
  });
}
