import { getSemanticDependencyContract } from "./semanticDependencyContract.js";
import type { SemanticDependencyProof } from "./semanticDependencyProof.js";
import type { IrisReportDependency } from "./irisReportDependencyGraph.js";
import type { CapabilityOperatorResult } from "./capabilityOperators.js";

export type IrisReportSemanticConsumption = {
  report_id: string;
  state: "verified" | "partial" | "unverified";
  capability_ids: string[];
  proof_capability_ids: string[];
  missing_capability_proofs: string[];
  missing_dependency_reads: string[];
  semantic_sufficiency_certified: boolean;
  semantic_sufficiency_failures: string[];
  limitation: string | null;
};

/**
 * Evaluates both structural consumption and the executable semantic-sufficiency
 * contract. Sufficiency here means the declared minimum semantic contract is met;
 * it does not prove mathematical truth, causation, prediction accuracy, or future outcomes.
 */
export function evaluateIrisReportSemanticConsumption(input: {
  dependency: IrisReportDependency;
  capabilityIds: string[];
  proofs: SemanticDependencyProof[];
  capabilityEvidenceStates?: Record<string, CapabilityOperatorResult["evidence_state"]>;
}): IrisReportSemanticConsumption {
  const proofsByCapability = new Map(input.proofs.map((proof) => [proof.capability_id, proof]));
  const missingCapabilityProofs = input.capabilityIds.filter((id) => getSemanticDependencyContract(id)?.proof_required && !proofsByCapability.has(id)).sort();
  const missingDependencyReads: string[] = [];
  const semanticSufficiencyFailures: string[] = [];
  const evidenceStates = input.capabilityEvidenceStates ?? {};

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
      if (contract.sufficiency.require_dependency_evidence) {
        const state = evidenceStates[requirement.dependency_id];
        if (!state) semanticSufficiencyFailures.push(`${capabilityId}->${requirement.dependency_id}:evidence_state_unresolved`);
        else if (contract.sufficiency.disallow_insufficient_dependency_evidence && state === "INSUFFICIENT_EVIDENCE") semanticSufficiencyFailures.push(`${capabilityId}->${requirement.dependency_id}:insufficient_evidence`);
      }
    }

    if (contract.sufficiency.disallow_insufficient_output_evidence && evidenceStates[capabilityId] === "INSUFFICIENT_EVIDENCE") {
      semanticSufficiencyFailures.push(`${capabilityId}:output_insufficient_evidence`);
    }
    if (contract.sufficiency.disallow_insufficient_output_evidence && !evidenceStates[capabilityId]) {
      semanticSufficiencyFailures.push(`${capabilityId}:output_evidence_state_unresolved`);
    }
  }

  const uniqueMissing = [...new Set(missingDependencyReads)].sort();
  const uniqueSufficiencyFailures = [...new Set(semanticSufficiencyFailures)].sort();
  const structuralVerified = missingCapabilityProofs.length === 0 && uniqueMissing.length === 0;
  const semanticSufficiencyCertified = structuralVerified && uniqueSufficiencyFailures.length === 0;
  const state = structuralVerified ? "verified" : input.proofs.length > 0 ? "partial" : "unverified";
  const limitation = semanticSufficiencyCertified
    ? "Declared dependency reads and the executable minimum semantic-sufficiency contract are satisfied. This does not prove mathematical truth, causation, prediction accuracy, or future outcomes."
    : state === "verified"
      ? "Declared runtime dependency reads are evidenced, but the executable minimum semantic-sufficiency contract is not satisfied."
      : state === "partial"
        ? "Only part of the report's declared runtime dependency consumption was evidenced for this execution."
        : "No execution-level semantic dependency proof was resolved for the report's mapped capabilities.";

  return { report_id: input.dependency.report_id, state, capability_ids: [...input.capabilityIds].sort(), proof_capability_ids: [...proofsByCapability.keys()].sort(), missing_capability_proofs: missingCapabilityProofs, missing_dependency_reads: uniqueMissing, semantic_sufficiency_certified: semanticSufficiencyCertified, semantic_sufficiency_failures: uniqueSufficiencyFailures, limitation };
}
