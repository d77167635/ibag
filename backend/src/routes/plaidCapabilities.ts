import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { PLAID_CAPABILITY_REGISTRY, PLAID_ITEM_STATE_COVERAGE, PLAID_UNMAPPED_ITEM_STATES } from "../config/plaidCapabilityRegistry.js";

export const plaidCapabilitiesRouter = Router();

/**
 * Catalog-only control-plane endpoint. It deliberately does not claim that
 * any capability is available to, consented by, or observed for the caller.
 */
plaidCapabilitiesRouter.get("/dashboard/plaid/capabilities", requireAuth, (_req: AuthedRequest, res) => {
  res.json({
    catalog_version: "2026-09-04-v3",
    source: "plaid_public_product_surface_and_item_api_contract",
    capabilities: PLAID_CAPABILITY_REGISTRY,
    item_state_coverage: PLAID_ITEM_STATE_COVERAGE,
    unmapped_item_states: PLAID_UNMAPPED_ITEM_STATES,
    state_model: [
      "cataloged",
      "region_supported",
      "production_entitled",
      "available",
      "consented",
      "active",
      "observed",
    ],
    phase1_boundary: "Iris may observe and reason over authorized read-only financial data. Money movement and other action-taking products remain non-actionable in Phase 1.",
    evidence_rule: "Catalog membership is not evidence of availability or observation. Runtime Plaid Item state, consent, entitlement and actual domain observations are authoritative.",
  });
});
