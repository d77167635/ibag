export const SOURCE_FIELD_INTELLIGENCE_BRIDGE_VERSION = "IRIS_SOURCE_FIELD_INTELLIGENCE_BRIDGE_V1";

export type SourceFieldBinding = {
  sourceFieldPath: string;
  intelligenceNodeId: string;
  fieldKey: string;
  fieldRole: string;
  operation: string;
  operationVersion: string;
  evidenceCompatible: boolean;
  active: boolean;
};

export type SourceFieldIntelligenceEdge = {
  sourceFieldObservationId: string;
  intelligenceNodeId: string;
  fieldKey: string;
  edgeRole: "source_field_to_intelligence";
  operation: string;
  operationVersion: string;
  evidenceState: "observed" | "limited" | "insufficient_evidence" | "unknown";
  publishable: boolean;
  reason: string | null;
};

/** Resolves observed source-field evidence into explicitly governed intelligence bindings. */
export function resolveSourceFieldIntelligenceBindings(
  observations: Array<{ id: string; field_path: string; evidence_state: string }>,
  bindings: SourceFieldBinding[],
): SourceFieldIntelligenceEdge[] {
  const activeBindings = bindings.filter((binding) => binding.active);
  const edges: SourceFieldIntelligenceEdge[] = [];

  for (const observation of observations) {
    const matching = activeBindings.filter((binding) => binding.sourceFieldPath === observation.field_path);
    for (const binding of matching) {
      const state = normalizeEvidenceState(observation.evidence_state);
      const publishable = binding.evidenceCompatible && state === "observed";
      edges.push({
        sourceFieldObservationId: observation.id,
        intelligenceNodeId: binding.intelligenceNodeId,
        fieldKey: binding.fieldKey,
        edgeRole: "source_field_to_intelligence",
        operation: binding.operation,
        operationVersion: binding.operationVersion,
        evidenceState: state,
        publishable,
        reason: publishable ? null : !binding.evidenceCompatible ? "binding_evidence_incompatible" : `source_evidence_${state}`,
      });
    }
  }
  return edges;
}

function normalizeEvidenceState(value: string): SourceFieldIntelligenceEdge["evidenceState"] {
  if (value === "observed" || value === "limited" || value === "insufficient_evidence" || value === "unknown") return value;
  return "unknown";
}
