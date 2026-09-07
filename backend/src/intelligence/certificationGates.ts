export type CertificationGateStatus = "PASS" | "FAIL" | "UNKNOWN" | "LIMITED";

export type CertificationGate = {
  id: string;
  version: string;
  severity: "critical" | "major" | "advisory";
  status: CertificationGateStatus;
  required: boolean;
  reason: string;
};

export type CertificationGateInput = {
  authenticated: boolean;
  userIsolation: boolean;
  evidenceManifestPresent: boolean;
  evidenceOwned: boolean;
  evidenceHashValid: boolean;
  executionPresent: boolean;
  outputPresent: boolean;
  outputHashValid: boolean;
  lineagePresent: boolean;
  semanticValidationPassed: boolean;
  numericalReconciliationPassed: boolean;
  contradictionsResolved: boolean;
  requiredEvidenceAvailable: boolean;
  staleEvidenceRejected: boolean;
  resourceBudgetRespected: boolean;
  reproducible: boolean;
};

const gate = (id: string, status: CertificationGateStatus, required: boolean, severity: CertificationGate["severity"], reason: string): CertificationGate => ({
  id, version: "IRIS_CERTIFICATION_GATE_V1", severity, status, required, reason,
});

/**
 * Certification is intentionally stricter than runtime success. A result can
 * execute successfully and still be uncertifiable when evidence, lineage,
 * semantics, reconciliation, or reproducibility has not been proven.
 */
export function evaluateCertificationGates(input: CertificationGateInput): {
  certifiable: boolean;
  gates: CertificationGate[];
} {
  const gates: CertificationGate[] = [
    gate("identity.authenticated", input.authenticated ? "PASS" : "FAIL", true, "critical", input.authenticated ? "Request is authenticated." : "No authenticated principal."),
    gate("identity.user_isolation", input.userIsolation ? "PASS" : "FAIL", true, "critical", input.userIsolation ? "All authoritative records remain user-scoped." : "Ownership invariant failed."),
    gate("evidence.manifest", input.evidenceManifestPresent ? "PASS" : "FAIL", true, "critical", input.evidenceManifestPresent ? "Evidence boundary is recorded." : "No evidence boundary."),
    gate("evidence.ownership", input.evidenceOwned ? "PASS" : "FAIL", true, "critical", input.evidenceOwned ? "Evidence belongs to the executing user." : "Evidence ownership is unproven."),
    gate("evidence.hash", input.evidenceHashValid ? "PASS" : "FAIL", true, "major", input.evidenceHashValid ? "Evidence hash is valid." : "Evidence integrity hash failed or is absent."),
    gate("evidence.availability", input.requiredEvidenceAvailable ? "PASS" : "LIMITED", true, "critical", input.requiredEvidenceAvailable ? "Required evidence is available." : "Required evidence is incomplete."),
    gate("evidence.staleness", input.staleEvidenceRejected ? "PASS" : "FAIL", true, "major", input.staleEvidenceRejected ? "Stale evidence cannot masquerade as current." : "Stale evidence protection is not proven."),
    gate("execution.present", input.executionPresent ? "PASS" : "FAIL", true, "critical", input.executionPresent ? "Execution record exists." : "No durable execution record."),
    gate("output.present", input.outputPresent ? "PASS" : "FAIL", true, "critical", input.outputPresent ? "Execution output exists." : "No durable output."),
    gate("output.hash", input.outputHashValid ? "PASS" : "FAIL", true, "major", input.outputHashValid ? "Output hash is valid." : "Output integrity hash failed or is absent."),
    gate("lineage.complete", input.lineagePresent ? "PASS" : "FAIL", true, "critical", input.lineagePresent ? "Output-to-source lineage is present." : "Certification-grade lineage is incomplete."),
    gate("semantic.validation", input.semanticValidationPassed ? "PASS" : "FAIL", true, "critical", input.semanticValidationPassed ? "Financial semantics validated." : "Semantic validation failed or is incomplete."),
    gate("numerical.reconciliation", input.numericalReconciliationPassed ? "PASS" : "FAIL", true, "critical", input.numericalReconciliationPassed ? "Required numerical invariants reconcile." : "Numerical invariants do not reconcile or were not proven."),
    gate("contradictions.resolved", input.contradictionsResolved ? "PASS" : "LIMITED", true, "major", input.contradictionsResolved ? "Critical contradictions are resolved or appropriately bounded." : "Unresolved contradictions affect certification."),
    gate("resources.bounded", input.resourceBudgetRespected ? "PASS" : "FAIL", true, "major", input.resourceBudgetRespected ? "Execution stayed within its resource budget." : "Resource governance was violated."),
    gate("reproducibility", input.reproducible ? "PASS" : "FAIL", true, "major", input.reproducible ? "The result is reproducible from its recorded versions and inputs." : "Reproducibility is not proven."),
  ];
  return { certifiable: gates.every(g => !g.required || g.status === "PASS"), gates };
}
