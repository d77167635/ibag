# Iris Master Project State

> Authoritative continuity document for future sessions. Update this file whenever the implementation state materially changes.

## Project identity
- Product: Iris
- Repository: `d77167635/ibag` (repository identifier only; not the product identity)
- Default branch: `main`
- Latest implementation checkpoint: `9f039e5fc27981daffcecad369492634777b2b37`
- Current Plaid catalog/selection slice includes commits `09aa1280024cf322f9b63fb364e5f01b4bfb6b1e`, `a2fdd51233e4562cd3f4b1322c3e88dcd3f0e480`, `c08c14b4cdb9e5c388e84dda5beca94e17854213`, and `b43ad3b2a7a4105735b42847c40bb6732a4024a`
- Repository status: active, public, non-archived

## Core product boundary
- **Plaid Dashboard** = provider/source observability. It answers: "What financial information is actually available/received from Plaid?"
- **Iris Dashboard** = synthesized intelligence. It answers: "What can Iris understand from available evidence?"
- **Iris Features** = independently controllable intelligence capabilities. A feature may span many workspaces/views.
- **Iris Product Selection** = selects useful Plaid capabilities subject to availability, institution support, user consent, plan entitlement, product cost, and intelligence value.

## Non-negotiable data rules
- No fake, mock, seeded, or fabricated financial observations.
- Plaid/provider data must remain traceable to canonical records and evidence.
- Unavailable evidence must never be represented as observed.
- Evidence states remain explicit and gate downstream intelligence.
- Money movement is outside the current read-only intelligence scope.
- Provider/source observability must not be mixed with Iris interpretation.

## Architecture
`Plaid Product Universe → Product Catalog/Capability Matrix → Availability/Consent/Authorization/Billing/Entitlement/Commercial Policy → Provider Observations → Canonical Financial Life State → Relational Ontology → Iris Intelligence Engine → Iris Feature Registry → Iris Dashboard/Workspaces`

## Verified implementation foundations
- `backend/src/config/plaidProductCatalogV2.ts` contains the expanded Plaid capability catalog, including Europe Virtual Accounts, Payouts, and Variable Recurring Payments as public capabilities without fabricated Item-state evidence.
- `backend/src/config/plaidCapabilityRegistry.ts` separates public product surfaces from runtime Item product states and exposes Item-state coverage.
- `backend/src/services/plaidProductSelectionV4.ts` evaluates provider authorization, consent, billed state, active-plan entitlement, commercial terms, and persisted observed evidence as independent dimensions.
- Product selection aggregates independently across multiple Plaid Items rather than allowing the last Item processed to overwrite the user's aggregate state.
- `backend/src/contracts/plaidProductDecision.ts` is the deterministic selection boundary; billed state can never masquerade as authorization or evidence.
- `backend/src/routes/plaidSurface.ts` and `backend/src/routes/plaidCapabilities.ts` expose Plaid source/capability observability.
- `backend/src/routes/plaidSelection.ts` exposes the authoritative selection read model.
- `frontend/src/api/backend.ts` and `frontend/src/components/IrisShell.tsx` consume the selection read model.
- `supabase/migrations/033_sync_plaid_catalog_entitlements.sql` aligns the all-access configuration with the authoritative application catalog.
- `backend/src/config/plaidProductCatalogV2.test.ts` certifies catalog uniqueness and the public payment capability boundary.
- `backend/src/intelligence/irisCatalog.ts` and `irisCatalogExpansion.ts` provide the Iris capability catalog foundation and one canonical Iris Standard preference baseline.
- `backend/src/routes/irisCatalog.ts` and `backend/src/routes/irisIntelligence.ts` consume that same canonical baseline rather than maintaining duplicate lists.
- `backend/src/intelligence/irisIntelligenceOutputRuntime.ts` is the final governed publication boundary: it preserves feature readiness, explicit evidence qualification, one-to-many feature/analysis mapping, and provenance integrity without creating provider observations or financial facts.
- `backend/src/intelligence/irisPublicationContext.ts` is the shared publication-context builder used by Iris intelligence surfaces and exposes a pure adapter for deterministic testing.
- `/iris/intelligence` and `/dashboard/intelligence` consume the same feature/output publication boundary.
- `.github/workflows/iris-backend-ci.yml` runs backend dependency installation, intelligence tests, and TypeScript build on pushes/PRs to `main`.

## Plaid capability contract
For every supported product/domain, maintain:
- stable product identity and version
- capability/data domains
- institution/connection availability
- consent requirements
- provider authorization/product state
- billed state
- provider observation/evidence state
- plan entitlement
- Plaid cost classification
- user charge/pass-through configuration when applicable
- intelligence contributions
- lineage and freshness

Initial commercial rule: products are included unless Plaid charges the platform for the product. Product pricing must be configuration/data, not hardcoded into intelligence logic.

## Iris Feature contract
Every feature should have:
- stable feature ID
- name, description, version
- activation state/preference
- prerequisites
- required evidence
- evidence coverage/state
- intelligence outputs
- explainability/provenance/freshness/lineage
- dashboard/workspace surfaces
- education and interaction surfaces where appropriate

Feature activation must never manufacture missing evidence.

## Current priority
1. Verify the accumulated catalog/selection test and TypeScript build result.
2. Complete authoritative Plaid Dashboard rendering of catalog, runtime state, evidence state, commercial state, and selection rationale without mixing interpretation into provider observability.
3. Make the Iris Feature Registry authoritative for independently enabled/disabled intelligence capabilities.
4. Complete governed publication into the shared dashboard/read-model contract and expose provenance, freshness, evidence gaps, and next-best investigation paths in the UI.
5. Continue recursive financial-life entity intelligence and deep workspaces.

## Completion principle
There is no arbitrary artifact-count target. Completion is capability-based: the system is complete only when the required architecture, evidence contracts, intelligence hierarchy, user controls, explainability, education, and deployed user experience are implemented and verified.

## Session protocol
1. Read this file.
2. Read `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
3. Inspect the current `main` commit before modifying anything.
4. Verify deployment/test status instead of relying on chat claims.
5. Continue the highest-priority unfinished capability; do not recreate completed work.
6. Commit meaningful implementation changes and update continuity records.
