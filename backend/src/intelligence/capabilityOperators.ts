/**
 * Governed capability/operator registry.
 *
 * A persisted capability contract describes the governed graph, but a capability
 * is not executable until this registry binds it to an actual runtime operator.
 * Planned entries remain visible and truthful without being dispatchable.
 */
import { computeMultiWindowFlow, assessTrajectory } from "./temporal.js";

export type CapabilityOperatorStatus = "implemented" | "planned";

export type CapabilityOperatorResult = {
  capability_id: string;
  operator_id: string;
  operator_version: string;
  evidence_state: "CALCULATED" | "INFERRED" | "PREDICTED" | "SCENARIO" | "INSUFFICIENT_EVIDENCE";
  result: Record<string, unknown>;
};

export type CapabilityOperator = {
  capability_id: string;
  operator_id: string;
  version: string;
  status: CapabilityOperatorStatus;
  execution_stage: string;
  evidence_state: CapabilityOperatorResult["evidence_state"];
  execute?: (userId: string) => Promise<CapabilityOperatorResult>;
};

const temporalOperator: CapabilityOperator = {
  capability_id: "temporal",
  operator_id: "temporal",
  version: "1.0.0",
  status: "implemented",
  execution_stage: "multi_window_flow",
  evidence_state: "CALCULATED",
  execute: async (userId) => {
    const windows = await computeMultiWindowFlow(userId);
    const trajectory = assessTrajectory(windows);
    const hasEvidence = windows.some((window) => window.economicTxCount > 0);
    return {
      capability_id: "temporal",
      operator_id: "temporal",
      operator_version: "1.0.0",
      evidence_state: hasEvidence ? "CALCULATED" : "INSUFFICIENT_EVIDENCE",
      result: {
        windows,
        trajectory,
        evidence: {
          state: hasEvidence ? "observed" : "insufficient_evidence",
          source: "canonical_financial_transactions",
          provider_observations_created: false,
          financial_values_created: false,
          money_movement_executed: false,
        },
      },
    };
  },
};

/**
 * These entries describe governed implementation surfaces. They are deliberately
 * not marked implemented until a distinct runtime operator exists and is tested.
 */
export const EXECUTABLE_CAPABILITY_OPERATORS: CapabilityOperator[] = [
  temporalOperator,
  { capability_id: "analysis", operator_id: "analysis", version: "1.0.0", status: "planned", execution_stage: "canonical_semantic_analysis", evidence_state: "CALCULATED" },
  { capability_id: "behavioral", operator_id: "behavioral", version: "1.0.0", status: "planned", execution_stage: "category_behavior", evidence_state: "CALCULATED" },
  { capability_id: "pattern", operator_id: "pattern", version: "1.0.0", status: "planned", execution_stage: "pattern_composition", evidence_state: "CALCULATED" },
  { capability_id: "relationship", operator_id: "relationship", version: "1.0.0", status: "planned", execution_stage: "financial_reasoning", evidence_state: "INFERRED" },
  { capability_id: "anomaly", operator_id: "anomaly", version: "1.0.0", status: "planned", execution_stage: "canonical_anomalies", evidence_state: "CALCULATED" },
  { capability_id: "causal", operator_id: "causal", version: "1.0.0", status: "planned", execution_stage: "causal_analysis", evidence_state: "INFERRED" },
  { capability_id: "predictive", operator_id: "predictive", version: "1.0.0", status: "planned", execution_stage: "forward_projection", evidence_state: "PREDICTED" },
  { capability_id: "scenario", operator_id: "scenario", version: "1.0.0", status: "planned", execution_stage: "counterfactual_analysis", evidence_state: "SCENARIO" },
  { capability_id: "decision", operator_id: "decision", version: "1.0.0", status: "planned", execution_stage: "decision_intelligence", evidence_state: "INFERRED" },
  { capability_id: "recommendation", operator_id: "recommendation", version: "1.0.0", status: "planned", execution_stage: "optimization_and_goals", evidence_state: "INFERRED" },
  { capability_id: "outcome", operator_id: "outcome", version: "1.0.0", status: "planned", execution_stage: "durable_outcome_loop", evidence_state: "CALCULATED" },
  { capability_id: "learning", operator_id: "learning", version: "1.0.0", status: "planned", execution_stage: "validated_outcome_learning", evidence_state: "INFERRED" },
  { capability_id: "emergent", operator_id: "emergent", version: "1.0.0", status: "planned", execution_stage: "higher_order_discovery", evidence_state: "INFERRED" },
];

export function getCapabilityOperator(capabilityId: string): CapabilityOperator | null {
  return EXECUTABLE_CAPABILITY_OPERATORS.find((operator) => operator.capability_id === capabilityId) ?? null;
}
