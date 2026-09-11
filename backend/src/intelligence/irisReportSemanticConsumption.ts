import { getSemanticDependencyContract } from "./semanticDependencyContract.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";

export type IrisReportSemanticConsumption = {
  report_id: string;
  state: "verified" | "partial" | "unverified";
  capability_ids: string[];
  proof_capability_ids: string[];
  missing_capability_proofs: string[];
  missing_dependency_reads: string[];
  /** Structural runtime-read proof is not semantic sufficiency. This remains false until a stronger semantic contract is independently satisfied. */
  semantic_sufficiency_certified: boolean;
  limitation: string | null;
};

export function evaluateIrisReportSemanticConsumption(input: {
  dependency: IrisReportDependency;
  capabilityIds: string[];
  proofs: SemanticDependencyProof[];
}): IrisReportSemanticConsumption {
  const proofsByCapability = new Map(input.proofs.map((proof) => [proof.capability_id, proof]));
  const missingCapabilityProofs = input.capabilityIds.filter((id) => getSemanticDependencyContract(id)?.proof_required && !proofsByCapability.has(id)).sort();
  const missingDependencyReads: string[] = [];

  for (const capabilityId of input.capabilityIds) {
    const contract = getSemanticDependencyContract(capabilityId);
    if (!contract) continue;
    const proof = proofsByCapability.get(capabilityId);
    if (!proof) continue;
    for (const requirement of contract.requirements) {
      if (!proof.consumed_dependency_ids.includes(requirement.dependency_id)) {
        missingDependencyReads.push(`${capabilityId}->${requirement.dependency_id}:dependency_not_consumed`);
        continue;
      }
      const paths = proof.consumed_dependency_paths[requirement.dependency_id] ?? [];
      for (const requiredPath of requirement.required_paths) if (!paths.includes(requiredPath)) missingDependencyReads.push(`${capabilityId}->${requirement.dependency_id}:${requiredPath}`);
    }
  }

  const uniqueMissing = [...new Set(missingDependencyReads)].sort();
  const state = missingCapabilityProofs.length === 0 && uniqueMissing.length === 0 ? "verified" : input.proofs.length > 0 ? "partial" : "unverified";
  const limitation = state === "verified"
    ? "Declared runtime dependency reads are evidenced. Semantic sufficiency is not certified by this structural execution proof."
    : state === "partial"
      ? "Only part of the report's declared runtime dependency consumption was evidenced for this execution."
      : "No execution-level semantic dependency proof was resolved for the report's mapped capabilities.";

  return { report_id: input.dependency.report_id, state, capability_ids: [...input.capabilityIds].sort(), proof_capability_ids: [...proofsByCapability.keys()].sort(), missing_capability_proofs: missingCapabilityProofs, missing_dependency_reads: uniqueMissing, semantic_sufficiency_certified: false, limitation };
}
