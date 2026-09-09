/**
 * Authoritative Iris decision boundary for a Plaid capability.
 *
 * Provider availability, authorization/products, consent, billing,
 * entitlement, commercial terms, and observed evidence are independent
 * dimensions. None may be inferred from another dimension.
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
export type PlaidBilledState = "billed" | "not_billed" | "unknown";
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
  billedState: PlaidBilledState;
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
  billedState: PlaidBilledState;
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
 * capability. Billing is reported independently and is never treated as
 * authorization or evidence.
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

  if (input.consentState !== "consented") {
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

  if (input.billedState === "billed") {
    reasons.push("Plaid reports this product as billed; billing is tracked separately from authorization and evidence.");
  } else if (input.billedState === "unknown") {
    reasons.push("Plaid billing state is unknown; no billing assumption is made.");
  }

  const hardBlockers = blockers.filter((blocker) => blocker !== "evidence_required");
  if (hardBlockers.length > 0) {
    return {
      product: input.productKey,
      decision: "blocked",
      eligibleForIris: false,
      providerState: input.providerState,
      consentState: input.consentState,
      billedState: input.billedState,
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
      billedState: input.billedState,
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
    billedState: input.billedState,
    entitlementState: input.entitlementState,
    commercialState: input.commercialState,
    evidenceState: input.evidenceState,
    intelligenceScore: input.intelligenceScore,
    blockers,
    reasons,
  };
}
