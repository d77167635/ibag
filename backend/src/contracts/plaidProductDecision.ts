/**
 * Authoritative Iris decision boundary for a Plaid product.
 *
 * These dimensions are intentionally independent. Catalog existence does not
 * mean availability; availability does not mean consent; consent does not
 * mean entitlement; entitlement does not mean evidence; and evidence does not
 * by itself mean Iris should use a capability.
 */
export type PlaidProductState =
  | "cataloged"
  | "unsupported"
  | "available"
  | "consented"
  | "active"
  | "not_available";

export type PlaidDecisionState =
  | "selected"
  | "eligible_awaiting_evidence"
  | "blocked"
  | "not_eligible";

export type PlaidEvidenceState = "observed" | "not_observed" | "not_available";
export type PlaidConsentState = "consented" | "not_consented" | "unknown";
export type PlaidEntitlementState = "entitled" | "not_entitled" | "unknown";
export type PlaidCommercialState = "included" | "pass_through" | "unknown";
export type PlaidSelectionBlocker =
  | "no_active_plan"
  | "not_entitled"
  | "provider_unavailable"
  | "consent_required"
  | "commercial_terms_unknown"
  | "evidence_required";

export interface PlaidProductDecisionInput {
  productKey: string;
  providerState: PlaidProductState;
  consentState: PlaidConsentState;
  entitlementState: PlaidEntitlementState;
  commercialState: PlaidCommercialState;
  evidenceState: PlaidEvidenceState;
  intelligenceScore: number;
}

export interface PlaidProductDecision {
  product: string;
  decision: PlaidDecisionState;
  eligibleForIris: boolean;
  providerState: PlaidProductState;
  consentState: PlaidConsentState;
  entitlementState: PlaidEntitlementState;
  commercialState: PlaidCommercialState;
  evidenceState: PlaidEvidenceState;
  intelligenceScore: number;
  blockers: PlaidSelectionBlocker[];
  reasons: string[];
}

/**
 * Deterministic policy evaluation. This function performs no I/O and never
 * promotes an unobserved provider capability to an observed intelligence
 * capability.
 */
export function evaluatePlaidProductDecision(
  input: PlaidProductDecisionInput,
): PlaidProductDecision {
  const blockers: PlaidSelectionBlocker[] = [];
  const reasons: string[] = [];

  if (input.entitlementState !== "entitled") {
    blockers.push("not_entitled");
    reasons.push("The active Iris plan does not authorize this Plaid product.");
  }

  if (input.providerState === "not_available" || input.providerState === "unsupported") {
    blockers.push("provider_unavailable");
    reasons.push("Plaid does not currently make this product available for this connection.");
  }

  if (input.consentState !== "consented" && input.providerState !== "active") {
    blockers.push("consent_required");
    reasons.push("User authorization is required before Iris can use this product.");
  }

  if (input.commercialState === "unknown") {
    blockers.push("commercial_terms_unknown");
    reasons.push("Commercial terms are unknown, so Iris will not assume the product is free.");
  }

  if (input.evidenceState === "not_available") {
    blockers.push("provider_unavailable");
    reasons.push("Required provider evidence is unavailable.");
  } else if (input.evidenceState !== "observed") {
    blockers.push("evidence_required");
    reasons.push("The product is eligible for consideration but has not been observed as evidence yet.");
  }

  const hardBlockers = blockers.filter((blocker) => blocker !== "evidence_required");
  if (hardBlockers.length > 0) {
    return {
      product: input.productKey,
      decision: "blocked",
      eligibleForIris: false,
      providerState: input.providerState,
      consentState: input.consentState,
      entitlementState: input.entitlementState,
      commercialState: input.commercialState,
      evidenceState: input.evidenceState,
      intelligenceScore: input.intelligenceScore,
      blockers,
      reasons,
    };
  }

  if (input.evidenceState !== "observed") {
    return {
      product: input.productKey,
      decision: "eligible_awaiting_evidence",
      eligibleForIris: true,
      providerState: input.providerState,
      consentState: input.consentState,
      entitlementState: input.entitlementState,
      commercialState: input.commercialState,
      evidenceState: input.evidenceState,
      intelligenceScore: input.intelligenceScore,
      blockers,
      reasons,
    };
  }

  reasons.push("All hard gates passed and provider evidence is observed.");
  return {
    product: input.productKey,
    decision: "selected",
    eligibleForIris: true,
    providerState: input.providerState,
    consentState: input.consentState,
    entitlementState: input.entitlementState,
    commercialState: input.commercialState,
    evidenceState: input.evidenceState,
    intelligenceScore: input.intelligenceScore,
    blockers,
    reasons,
  };
}
