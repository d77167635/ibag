export type SemanticDependencyContract = {
  capability_id: string;
  required_dependency_ids: string[];
  proof_required: boolean;
};

/**
 * This is a contract declaration, not evidence that a dependency was consumed.
 * Runtime proof must be produced from the actual execution context.
 */
export const SEMANTIC_DEPENDENCY_CONTRACTS: SemanticDependencyContract[] = [
  { capability_id: "analysis", required_dependency_ids: ["temporal"], proof_required: true },
  { capability_id: "behavioral", required_dependency_ids: ["analysis"], proof_required: true },
  { capability_id: "pattern", required_dependency_ids: ["analysis", "behavioral"], proof_required: true },
  { capability_id: "relationship", required_dependency_ids: ["pattern", "relational_ontology"], proof_required: true },
  { capability_id: "anomaly", required_dependency_ids: ["analysis", "temporal", "behavioral", "pattern"], proof_required: true },
  { capability_id: "causal", required_dependency_ids: ["relationship"], proof_required: true },
  { capability_id: "predictive", required_dependency_ids: ["causal", "temporal"], proof_required: true },
  { capability_id: "scenario", required_dependency_ids: ["predictive", "risk"], proof_required: true },
  { capability_id: "decision", required_dependency_ids: ["scenario", "risk"], proof_required: true },
  { capability_id: "recommendation", required_dependency_ids: ["decision"], proof_required: true },
  { capability_id: "consequence", required_dependency_ids: ["decision", "risk", "opportunity"], proof_required: true },
  { capability_id: "outcome", required_dependency_ids: ["decision", "recommendation", "consequence"], proof_required: true },
  { capability_id: "learning", required_dependency_ids: ["outcome"], proof_required: true },
  { capability_id: "emergent", required_dependency_ids: ["financial_life_state", "relational_ontology"], proof_required: true },
];

export function getSemanticDependencyContract(capabilityId: string): SemanticDependencyContract | null {
  return SEMANTIC_DEPENDENCY_CONTRACTS.find((contract) => contract.capability_id === capabilityId) ?? null;
}
