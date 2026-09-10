import type { CapabilityDependencyOutput } from "./capabilityExecutionContext.js";

const EVIDENCE_RANK: Record<string, number> = {
  INSUFFICIENT_EVIDENCE: 0,
  CALCULATED: 3,
  INFERRED: 2,
  PREDICTED: 1,
  SCENARIO: 1,
};

export type SupervisorySynthesis = {
  synthesis_version: "1.0.0";
  graph_complete: boolean;
  dependency_count: number;
  consumed_capabilities: string[];
  missing_capabilities: string[];
  evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE";
  strongest_evidence_state: string | null;
  evidence_state_distribution: Record<string, number>;
  uncertainty_present: boolean;
  output_hashes: Record<string, string>;
  dependency_lineage: Array<{ capability_id: string; execution_id: string; output_hash: string; evidence_state: string | null }>;
  synthesis_basis: string[];
};

export function synthesizeCapabilityGraph(
  dependencyIds: readonly string[],
  dependencyOutputs: Readonly<Record<string, CapabilityDependencyOutput>>,
): SupervisorySynthesis {
  const consumed = dependencyIds.filter(id => dependencyOutputs[id] != null);
  const missing = dependencyIds.filter(id => dependencyOutputs[id] == null);
  const states = consumed.map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE");
  const distribution: Record<string, number> = {};
  for (const state of states) distribution[state] = (distribution[state] ?? 0) + 1;

  const strongest = consumed.map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE")
    .sort((a, b) => (EVIDENCE_RANK[b] ?? 0) - (EVIDENCE_RANK[a] ?? 0))[0] ?? null;
  const weakest = consumed.length
    ? consumed.map(id => dependencyOutputs[id].evidence_state ?? "INSUFFICIENT_EVIDENCE")
      .sort((a, b) => (EVIDENCE_RANK[a] ?? 0) - (EVIDENCE_RANK[b] ?? 0))[0]
    : "INSUFFICIENT_EVIDENCE";
  const evidenceState = missing.length
    ? "INSUFFICIENT_EVIDENCE"
    : (weakest === "CALCULATED" || weakest === "INFERRED" || weakest === "PREDICTED" || weakest === "SCENARIO" ? weakest : "INSUFFICIENT_EVIDENCE");

  return {
    synthesis_version: "1.0.0",
    graph_complete: missing.length === 0,
    dependency_count: dependencyIds.length,
    consumed_capabilities: consumed,
    missing_capabilities: missing,
    evidence_state: evidenceState,
    strongest_evidence_state: strongest,
    evidence_state_distribution: distribution,
    uncertainty_present: consumed.some(id => dependencyOutputs[id].uncertainty != null),
    output_hashes: Object.fromEntries(consumed.map(id => [id, dependencyOutputs[id].output_hash])),
    dependency_lineage: consumed.map(id => ({
      capability_id: id,
      execution_id: dependencyOutputs[id].execution_id,
      output_hash: dependencyOutputs[id].output_hash,
      evidence_state: dependencyOutputs[id].evidence_state,
    })),
    synthesis_basis: [
      "Persisted child capability outputs are the primary supervisory inputs.",
      "Dependency output hashes are preserved as lineage identity.",
      "Missing child outputs force an explicitly incomplete supervisory state.",
      "Aggregate evidence state cannot exceed the weakest consumed child evidence state.",
      "Uncertainty is propagated when present in child outputs.",
    ],
  };
}

function childResult(outputs: Readonly<Record<string, CapabilityDependencyOutput>>, capabilityId: string): any {
  const value = outputs[capabilityId]?.value as any;
  return value && typeof value === "object" ? value.result ?? value : null;
}

/** Builds the aggregate exclusively from persisted child outputs. It performs no fresh financial queries or fallback calculations. */
export function buildSupervisoryAggregate(
  dependencyIds: readonly string[],
  dependencyOutputs: Readonly<Record<string, CapabilityDependencyOutput>>,
  graphSynthesis: SupervisorySynthesis,
  evidenceBoundary: string | null,
  selectedItemId: string | null,
): Record<string, unknown> {
  const temporal = childResult(dependencyOutputs, "temporal");
  const analysis = childResult(dependencyOutputs, "analysis");
  const behavioral = childResult(dependencyOutputs, "behavioral");
  const anomaly = childResult(dependencyOutputs, "anomaly");
  const predictive = childResult(dependencyOutputs, "predictive");
  const relationship = childResult(dependencyOutputs, "relationship");
  const causal = childResult(dependencyOutputs, "causal");
  const scenario = childResult(dependencyOutputs, "scenario");
  const decision = childResult(dependencyOutputs, "decision");
  const recommendation = childResult(dependencyOutputs, "recommendation");
  const outcome = childResult(dependencyOutputs, "outcome");
  const learning = childResult(dependencyOutputs, "learning");
  const emergent = childResult(dependencyOutputs, "emergent");
  const analysisState = analysis ?? {};

  return {
    evidence_state: graphSynthesis.evidence_state,
    evidence_boundary: evidenceBoundary,
    generated_at: new Date().toISOString(),
    narrative: null,
    feature_flags: null,
    integrity: { status: graphSynthesis.graph_complete ? "GRAPH_COMPLETE" : "INSUFFICIENT_EVIDENCE" },
    layer_metrics: {
      net_worth: analysisState.net_worth ?? null,
      debt_health: analysisState.debt_health ?? null,
      cash_flow_safety: analysisState.cash_flow_safety ?? null,
      cash_flow: analysisState.economic_cash_flow ?? null,
      spending_hierarchy: analysisState.spending_hierarchy ?? null,
      balance_history: null,
      roundup_projection: null,
      forward_projection: predictive,
      anomalies: anomaly?.anomalies ?? null,
      provider_domains: selectedItemId ? { selected_item_id: selectedItemId } : null,
    },
    layer_temporal: temporal,
    layer_behavioral: behavioral,
    layer_reasoning: relationship,
    layer_max_intelligence: null,
    source_fidelity: null,
    intelligence_gate: {
      higher_order_conclusions_enabled: graphSynthesis.evidence_state !== "INSUFFICIENT_EVIDENCE",
      limitation: graphSynthesis.evidence_state === "INSUFFICIENT_EVIDENCE" ? "The supervisory graph is not fully evidenced." : null,
    },
    evidence_graph: null,
    intelligence_graph: null,
    investigations: null,
    uncertainty: { present: graphSynthesis.uncertainty_present },
    financial_state: null,
    causal_analysis: causal,
    decision_graph: null,
    decision_intelligence: decision,
    consequence_model: null,
    optimization_intelligence: null,
    goal_intelligence: null,
    intelligence_atlas: null,
    intelligence_composition: null,
    layer_composition: null,
    higher_order_synthesis: null,
    adversarial_reasoning: null,
    counterfactual_intelligence: null,
    meta_intelligence: null,
    capability_outputs: Object.fromEntries(dependencyIds.map(id => [id, {
      evidence_state: dependencyOutputs[id]?.evidence_state ?? "INSUFFICIENT_EVIDENCE",
      output_hash: dependencyOutputs[id]?.output_hash ?? null,
      execution_id: dependencyOutputs[id]?.execution_id ?? null,
      value: childResult(dependencyOutputs, id),
    }])),
    outcome_intelligence: outcome,
    learning_intelligence: learning,
    emergent_intelligence: emergent,
    scenario_intelligence: scenario,
    recommendation_intelligence: recommendation,
    predictive_intelligence: predictive,
    supervisory_composition: {
      dependency_capabilities: dependencyIds,
      dependency_output_hashes: graphSynthesis.output_hashes,
      dependency_outputs_consumed: true,
      dependency_evidence_state: graphSynthesis.evidence_state,
      dependency_evidence_distribution: graphSynthesis.evidence_state_distribution,
      dependency_uncertainty_present: graphSynthesis.uncertainty_present,
      dependency_lineage: graphSynthesis.dependency_lineage,
      graph_synthesis: graphSynthesis,
    },
  };
}
