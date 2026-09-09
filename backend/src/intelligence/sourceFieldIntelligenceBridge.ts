export const SOURCE_FIELD_INTELLIGENCE_BRIDGE_VERSION = "IRIS_SOURCE_FIELD_INTELLIGENCE_BRIDGE_V3";

export type SourceFieldBinding = {
  sourceFieldId: string;
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
  sourceFieldId: string;
  intelligenceNodeId: string;
  fieldKey: string;
  edgeRole: "source_field_to_intelligence";
  operation: string;
  operationVersion: string;
  evidenceState: "observed" | "limited" | "insufficient_evidence" | "unknown";
  publishable: boolean;
  reason: string | null;
};

/**
 * Resolves observed source-field evidence into explicitly governed intelligence bindings.
 * Binding by persisted source-field identity prevents collisions such as `name` or `amount`
 * appearing in multiple provider products. A lookup index keeps resolution linear in the
 * number of observations and bindings rather than multiplying the two collections.
 */
export function resolveSourceFieldIntelligenceBindings(
  observations: Array<{ id: string; source_field_id: string; evidence_state: string }>,
  bindings: SourceFieldBinding[],
): SourceFieldIntelligenceEdge[] {
  const bindingsBySourceField = new Map<string, SourceFieldBinding[]>();
  for (const binding of bindings) {
    if (!binding.active) continue;
    const current = bindingsBySourceField.get(binding.sourceFieldId);
    if (current) current.push(binding);
    else bindingsBySourceField.set(binding.sourceFieldId, [binding]);
  }

  const edges: SourceFieldIntelligenceEdge[] = [];
  for (const observation of observations) {
    const matching = bindingsBySourceField.get(observation.source_field_id) ?? [];
    const state = normalizeEvidenceState(observation.evidence_state);
    for (const binding of matching) {
      const publishable = binding.evidenceCompatible && state === "observed";
      edges.push({
        sourceFieldObservationId: observation.id,
        sourceFieldId: observation.source_field_id,
        intelligenceNodeId: binding.intelligenceNodeId,
        fieldKey: binding.fieldKey,
        edgeRole: "source_field_to_intelligence",
        operation: binding.operation,
        operationVersion: binding.operationVersion,
        evidenceState: state,
        publishable,
        reason: publishable ? null : !binding.evidenceCompatible ? "binding_evidence_incompatible" : "source_evidence_" + state,
      });
    }
  }
  return edges;
}

function normalizeEvidenceState(value: string): SourceFieldIntelligenceEdge["evidenceState"] {
  if (value === "observed" || value === "limited" || value === "insufficient_evidence" || value === "unknown") return value;
  return "unknown";
}
