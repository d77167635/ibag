import type { FidelitySeverity } from "./sourceFidelity.js";

/**
 * Iris pre-execution governor.
 *
 * This is intentionally read-only: it cannot alter provider evidence, move
 * money, or silently repair data. It decides whether downstream intelligence
 * is authorized to execute from the currently certified evidence boundary.
 */
export type IrisPreflightDecision = {
  architecture_version: "IRIS_PRE_EXECUTION_GOVERNOR_V1";
  status: "authorized" | "constrained" | "blocked";
  execute_downstream_intelligence: boolean;
  allow_higher_order_intelligence: boolean;
  same_item_required: true;
  selected_item_id: string | null;
  evidence_boundary_status: FidelitySeverity | string | null;
  reasons: string[];
  constraints: string[];
  generated_at: string;
};

export function buildIrisPreflight(sourceFidelity: any, evidenceBoundary: string | null): IrisPreflightDecision {
  const source = sourceFidelity ?? {};
  const reasons: string[] = [];
  const constraints: string[] = [];
  const ready = source.ready_for_higher_order_intelligence === true;
  const hardFailure = source.status === "fail" && Array.isArray(source.checks) && source.checks.some((c: any) => c?.severity === "fail" && c?.id !== "canonical_eight_domain_certification");
  const selectedItemId = Array.isArray(source.eight_domain_items) && source.eight_domain_items.length ? source.eight_domain_items[0] : null;

  if (!evidenceBoundary) reasons.push("No certified evidence boundary is available for this execution.");
  if (hardFailure) reasons.push("Source-fidelity contains a hard integrity failure.");
  if (!ready) constraints.push("Higher-order intelligence, arbitrary cross-domain composition, and unsupported conclusions remain closed until the same-Item evidence gate passes.");
  if (!selectedItemId) constraints.push("No complete same-Item eight-domain evidence set is currently selected.");

  // Basic evidence-bounded intelligence remains executable unless the evidence
  // store itself has failed integrity. Higher-order capabilities are separately
  // gated by the same decision and can never bypass it.
  const execute = !hardFailure && Boolean(evidenceBoundary);
  const status = !execute ? "blocked" : ready ? "authorized" : "constrained";

  return {
    architecture_version: "IRIS_PRE_EXECUTION_GOVERNOR_V1",
    status,
    execute_downstream_intelligence: execute,
    allow_higher_order_intelligence: execute && ready,
    same_item_required: true,
    selected_item_id: selectedItemId,
    evidence_boundary_status: source.status ?? null,
    reasons,
    constraints,
    generated_at: new Date().toISOString(),
  };
}
