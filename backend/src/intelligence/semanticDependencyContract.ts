export type SemanticDependencyRequirement = {
  dependency_id: string;
  required_paths: string[];
  rationale: string;
};
export type SemanticDependencyContract = {
  capability_id: string;
  requirements: SemanticDependencyRequirement[];
  proof_required: boolean;
};

/**
 * Declares the minimum dependency output paths an operator must actually read.
 * Passing this validator proves the declared fields were accessed at runtime;
 * it does not prove that the transformation is mathematically sufficient.
 */
export const SEMANTIC_DEPENDENCY_CONTRACTS: SemanticDependencyContract[] = [
  { capability_id: "analysis", requirements: [{ dependency_id: "temporal", required_paths: ["root.result"], rationale: "Analysis must incorporate the temporal output rather than merely receive it." }], proof_required: true },
  { capability_id: "behavioral", requirements: [{ dependency_id: "analysis", required_paths: ["root.result"], rationale: "Behavioral derivation must consume analysis output." }], proof_required: true },
  { capability_id: "pattern", requirements: [{ dependency_id: "analysis", required_paths: ["root.result.spending"], rationale: "Pattern derivation must consume an analysis field." }, { dependency_id: "behavioral", required_paths: ["root.result.merchant_frequency"], rationale: "Pattern derivation must consume behavioral frequency evidence." }], proof_required: true },
  { capability_id: "relationship", requirements: [{ dependency_id: "pattern", required_paths: ["root.result.pattern_count"], rationale: "Relationship derivation must consume pattern output." }, { dependency_id: "relational_ontology", required_paths: ["root.result.relationships"], rationale: "Relationship derivation must consume relational ontology output." }], proof_required: true },
  { capability_id: "anomaly", requirements: [{ dependency_id: "analysis", required_paths: ["root.result"], rationale: "Anomaly derivation must consume analysis output." }, { dependency_id: "temporal", required_paths: ["root.result"], rationale: "Anomaly derivation must consume temporal context." }, { dependency_id: "behavioral", required_paths: ["root.result"], rationale: "Anomaly derivation must consume behavioral context." }, { dependency_id: "pattern", required_paths: ["root.result"], rationale: "Anomaly derivation must consume pattern context." }], proof_required: true },
  { capability_id: "causal", requirements: [{ dependency_id: "relationship", required_paths: ["root.result.relationships"], rationale: "Causal candidate analysis must consume relationship observations." }], proof_required: true },
  { capability_id: "predictive", requirements: [{ dependency_id: "causal", required_paths: ["root.result"], rationale: "Prediction must consume causal candidate context." }, { dependency_id: "temporal", required_paths: ["root.result"], rationale: "Prediction must consume temporal context." }], proof_required: true },
  { capability_id: "scenario", requirements: [{ dependency_id: "predictive", required_paths: ["root.result.projection"], rationale: "Scenario composition must consume the predictive projection." }, { dependency_id: "risk", required_paths: ["root.result.risk_signals"], rationale: "Scenario composition must consume risk signals." }], proof_required: true },
  { capability_id: "decision", requirements: [{ dependency_id: "scenario", required_paths: ["root.result.scenarios"], rationale: "Decision intelligence must consume scenario output." }, { dependency_id: "risk", required_paths: ["root.result.risk_signals"], rationale: "Decision intelligence must consume risk output." }], proof_required: true },
  { capability_id: "recommendation", requirements: [{ dependency_id: "decision", required_paths: ["root.result.options"], rationale: "Recommendations must consume decision options." }], proof_required: true },
  { capability_id: "consequence", requirements: [{ dependency_id: "decision", required_paths: ["root.result"], rationale: "Consequence propagation must consume decision context." }, { dependency_id: "risk", required_paths: ["root.result.risk_signals"], rationale: "Consequence propagation must consume risk signals." }, { dependency_id: "opportunity", required_paths: ["root.result.opportunities"], rationale: "Consequence propagation must consume opportunity output." }], proof_required: true },
  { capability_id: "outcome", requirements: [{ dependency_id: "decision", required_paths: ["root.result"], rationale: "Outcome loop must consume decision context." }, { dependency_id: "recommendation", required_paths: ["root.result.recommendations"], rationale: "Outcome loop must consume recommendation output." }, { dependency_id: "consequence", required_paths: ["root.result.consequences"], rationale: "Outcome loop must consume consequence output." }], proof_required: true },
  { capability_id: "learning", requirements: [{ dependency_id: "outcome", required_paths: ["root.result"], rationale: "Learning must consume outcome evidence." }], proof_required: true },
  { capability_id: "emergent", requirements: [{ dependency_id: "financial_life_state", required_paths: ["root.result.canonical_life_state"], rationale: "Higher-order synthesis must consume canonical life state." }, { dependency_id: "relational_ontology", required_paths: ["root.result.relationships"], rationale: "Higher-order synthesis must consume relational ontology." }], proof_required: true },
];

export function getSemanticDependencyContract(capabilityId: string): SemanticDependencyContract | null { return SEMANTIC_DEPENDENCY_CONTRACTS.find((contract) => contract.capability_id === capabilityId) ?? null; }
export function validateSemanticDependencyPaths(capabilityId: string, consumedPaths: Record<string, Set<string>>): string[] {
  const contract = getSemanticDependencyContract(capabilityId);
  if (!contract) return [];
  const missing: string[] = [];
  for (const requirement of contract.requirements) {
    const actual = consumedPaths[requirement.dependency_id] ?? new Set<string>();
    for (const path of requirement.required_paths) if (!actual.has(path)) missing.push(`${requirement.dependency_id}:${path}`);
  }
  return missing;
}
