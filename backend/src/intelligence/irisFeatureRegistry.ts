export type IrisFeatureStatus = "candidate" | "testing" | "validated" | "promoted" | "rejected" | "rolled_back";

export type IrisFeatureCandidate = {
  id: string;
  version: string;
  name: string;
  source_operation_id: string;
  product_domains: string[];
  layer_ids: string[];
  lineage_ids: string[];
  evidence_ready: boolean;
  validation_required: boolean;
  validation_passed: boolean;
  admin_approval_required: boolean;
  status: IrisFeatureStatus;
  created_at: string;
  promoted_at: string | null;
  rolled_back_at: string | null;
};

export type IrisFeatureRegistry = {
  architecture_version: "IRIS_FEATURE_REGISTRY_V1";
  production_mutation: false;
  automatic_promotion: false;
  features: IrisFeatureCandidate[];
  lifecycle: string[];
  invariants: string[];
};

export function buildIrisFeatureRegistry(candidates: Array<{ id: string; layer_ids: string[]; evidence_ready: boolean; creates_new_analysis: boolean }>, productDomains: string[] = []): IrisFeatureRegistry {
  const now = new Date().toISOString();
  const features = candidates.filter(c => c.creates_new_analysis).slice(0, 48).map((c, index) => ({
    id: `iris-feature:${c.id}`,
    version: `0.1.${index + 1}`,
    name: `Iris ${c.id.replace(/^path:/, "")}`,
    source_operation_id: c.id,
    product_domains: [...new Set(productDomains)],
    layer_ids: [...new Set(c.layer_ids)],
    lineage_ids: [c.id],
    evidence_ready: c.evidence_ready,
    validation_required: true,
    validation_passed: false,
    admin_approval_required: true,
    status: "candidate" as const,
    created_at: now,
    promoted_at: null,
    rolled_back_at: null,
  }));
  return {
    architecture_version: "IRIS_FEATURE_REGISTRY_V1",
    production_mutation: false,
    automatic_promotion: false,
    features,
    lifecycle: ["candidate", "testing", "validated", "promoted", "rejected", "rolled_back"],
    invariants: [
      "Every feature retains source operation and lineage.",
      "Evidence readiness is never inferred from catalog membership.",
      "Validation is required before production eligibility.",
      "Administrator approval is required before production promotion.",
      "The registry cannot mutate production by itself.",
      "Rollback is an explicit governed state, not silent deletion.",
      "Features never create provider observations or financial facts.",
    ],
  };
}
