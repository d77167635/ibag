# Iris Session Handoff

This file is the compact bridge between chat sessions.

## Last verified repository state
- Repository: `d77167635/ibag`
- Branch: `main`
- Current repository tip before this handoff update: `5fa5069a5287decd25399f4299871edcd2c2dec5`
- The current tip includes the durable continuity documents and the recursive higher-order synthesis implementation/tests.

## Verified implementation state
- `backend/src/config/plaidProductCatalogV2.ts` provides the expanded application Plaid capability catalog.
- `backend/src/config/plaidCapabilityRegistry.ts` distinguishes runtime Item product states from public product surfaces and reports unmapped Item-state coverage.
- `backend/src/services/plaidProductSelectionV4.ts` applies active subscription entitlement, commercial terms, provider runtime state, and persisted observed evidence as separate gates.
- `backend/src/routes/plaidSurface.ts` and `backend/src/routes/plaidCapabilities.ts` provide the provider observability surfaces.
- `backend/src/routes/irisCatalog.ts`, `backend/src/intelligence/irisCatalog.ts`, and `backend/src/intelligence/irisCatalogExpansion.ts` provide the existing Iris feature/capability catalog foundation.
- `frontend/src/components/PlaidDashboard.tsx` provides the Plaid-facing dashboard surface.
- `frontend/src/components/IrisCatalog.tsx` and `IrisIntelligenceWorkspace.tsx` provide the existing Iris feature/workspace foundation.
- `backend/src/intelligence/independentCapabilityExecution.ts` persists governed run evidence, dependency outputs, execution inputs/outputs, validation, and certification state.
- `backend/src/intelligence/runBoundProjection.ts` and `runBoundState.ts` provide exact-run financial-state derivation foundations.
- `backend/src/intelligence/statisticalPrimitives.ts` provides reusable robust statistical/adaptive-baseline primitives with regression coverage.
- `backend/src/intelligence/maxIntelligence.ts` consumes observed activity-day outflow history for a user-specific adaptive baseline without zero-filling missing days.
- `backend/src/intelligence/recursiveIntelligenceSynthesis.ts` reconstructs recursive dependency relationships from persisted capability outputs, preserves output hashes/evidence states, identifies supported cross-capability chains/interactions, and surfaces evidence gaps without manufacturing financial evidence.
- The governed `emergent` operator is routed through that recursive synthesis layer. This is a higher-order composition foundation, not the endpoint of Iris intelligence.

## Architectural priorities
1. Finish exact evidence-bound canonical financial-life state and field-level lineage before treating analytical results as fully certified.
2. Unify the named recursive operator surfaces with the richer Iris orchestration/composition/financial-state engine instead of allowing a second simplistic intelligence engine to become authoritative.
3. Expand statistical intelligence and adaptive baselines across additional financial-life metrics, entities, and domains.
4. Deepen risk, opportunity, consequence, scenario, optimization, decision, and recommendation intelligence while preserving evidence and uncertainty semantics.
5. Build continuous/proactive intelligence, verified outcome learning, and recursively composable higher-order intelligence without an artificial semantic depth ceiling.
6. Make the Iris experience expose the evidence → reasoning → explanation → scenario → decision → outcome chain in a user-controllable and educational form.
7. Complete Plaid source observability and provider lifecycle certification without collapsing provider state into Iris interpretation.
8. Complete production certification across provider/database reconciliation, lineage, RLS/security, sync/webhook durability, Sandbox lifecycle, regression sufficiency, and the observable user journey.

## Rules for the next session
- Read `MASTER_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and `ROADMAP.md` before changing code.
- Inspect the current `main` commit; never assume this handoff's commit is still current.
- Verify deployment and tests instead of relying on chat claims.
- Reuse existing foundations; do not create duplicate registries or parallel semantic intelligence engines merely because an earlier version exists.
- Do not fabricate provider or financial data.
- Keep Plaid observability separate from Iris intelligence.
- Treat available, consented, authorized, billed, or cataloged as distinct from observed evidence.
- Treat the roadmap as capability-based, not artifact-count-based.
- After meaningful implementation, update this handoff and changelog and commit the result.

## Next action
Read the richer intelligence modules and exact-run execution/certification path together, then implement the next dependency-complete unification block: make richer Iris analytical outputs consume the same governed dependency/evidence context as the executable capability graph, beginning with the highest-value statistical, state, risk/opportunity, and cross-domain synthesis paths. Preserve the rule that no real provider-evidence certification can be claimed while the connected project has no `iris_run_evidence` rows.
