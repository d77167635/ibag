# Iris Session Handoff

This file is the compact bridge between chat sessions.

## Last verified repository state
- Repository: `d77167635/ibag`
- Branch: `main`
- Current verified tip before this handoff update: 9131b6259804cb718ed8af6060591320e608b153
- The current tip includes the durable continuity documents and `docs/CHANGELOG.md`.

## Verified implementation state
- `backend/src/config/plaidProductCatalogV2.ts` provides the expanded application Plaid capability catalog.
- `backend/src/config/plaidCapabilityRegistry.ts` distinguishes runtime Item product states from public product surfaces and reports unmapped Item-state coverage.
- `backend/src/services/plaidProductSelectionV4.ts` applies active subscription entitlement, commercial terms, provider runtime state, and persisted observed evidence as separate gates.
- `backend/src/routes/plaidSurface.ts` and `backend/src/routes/plaidCapabilities.ts` provide the provider observability surfaces.
- `backend/src/routes/irisCatalog.ts`, `backend/src/intelligence/irisCatalog.ts`, and `backend/src/intelligence/irisCatalogExpansion.ts` provide the existing Iris feature/capability catalog foundation.
- `frontend/src/components/PlaidDashboard.tsx` provides the Plaid-facing dashboard surface.
- `frontend/src/components/IrisCatalog.tsx` and `IrisIntelligenceWorkspace.tsx` provide the existing Iris feature/workspace foundation.

## Architectural priorities
1. Complete authoritative Plaid Product Catalog and Capability Matrix coverage.
2. Complete plan entitlement, consent, availability, and commercial-cost semantics.
3. Strengthen Iris Product Selection as a first-class decision layer; selection must never imply observation.
4. Make the Plaid Dashboard render the complete source/product universe and its actual runtime evidence state cleanly.
5. Make the Iris Feature Registry the authoritative source for independently enabled/disabled intelligence capabilities.
6. Continue recursive financial-life entity intelligence: entity → observations → relationships → changes → evidence → interpretation.
7. Expand deep Iris workspaces for explanation, education, forecasting, scenarios, decisions, and user interaction.

## Rules for the next session
- Read `MASTER_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and `ROADMAP.md` before changing code.
- Inspect the current `main` commit; never assume this handoff's commit is still current.
- Verify deployment and tests instead of relying on chat claims.
- Reuse existing foundations; do not create duplicate V2/V3/V4 registries merely because an earlier version exists.
- Do not fabricate provider or financial data.
- Keep Plaid observability separate from Iris intelligence.
- Treat available, consented, authorized, billed, or cataloged as distinct from observed evidence.
- Treat the roadmap as capability-based, not artifact-count-based.
- After meaningful implementation, update this handoff and changelog and commit the result.

## Next action
Inspect the existing catalog/registry/selection and Iris feature contracts together, identify the single authoritative contract still missing, then implement the smallest non-duplicative slice. Prioritize runtime correctness and source/evidence boundaries over cosmetic expansion.
