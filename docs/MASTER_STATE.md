# Iris Master Project State

> Authoritative continuity document for future sessions. Update this file whenever the implementation state materially changes.

## Project identity
- Product: Iris
- Repository: `d77167635/ibag`
- Default branch: `main`
- Latest verified continuity checkpoint: `e14b3c24d0179a16c787810f2fa8f0f3fa6e9f8c`
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
`Plaid Product Universe → Product Catalog → Availability/Consent/Entitlement/Cost → Provider Observations → Canonical Financial Life State → Relational Ontology → Iris Intelligence Engine → Iris Feature Registry → Iris Dashboard/Workspaces`

## Verified implementation foundations
- `backend/src/config/plaidProductCatalogV2.ts` contains the expanded application product/capability catalog.
- `backend/src/config/plaidCapabilityRegistry.ts` separates public product surfaces from runtime Item product states and exposes Item-state coverage.
- `backend/src/services/plaidProductSelectionV4.ts` evaluates active-plan entitlement, commercial terms, provider runtime state, and persisted observed evidence as distinct facts.
- `backend/src/routes/plaidSurface.ts` and `backend/src/routes/plaidCapabilities.ts` expose Plaid source/capability observability.
- `backend/src/intelligence/irisCatalog.ts` and `irisCatalogExpansion.ts` provide the Iris capability catalog foundation and one canonical Iris Standard preference baseline.
- `backend/src/routes/irisCatalog.ts` and `backend/src/routes/irisIntelligence.ts` consume that same canonical baseline rather than maintaining duplicate lists.
- `backend/src/intelligence/irisCatalog.test.ts` certifies the ten-item standard baseline and its preference-not-ceiling semantics.
- `backend/src/intelligence/irisIntelligenceOutputRuntime.ts` is the final governed publication boundary: it preserves feature readiness, explicit evidence qualification, one-to-many feature/analysis mapping, and provenance integrity without creating provider observations or financial facts.
- `backend/src/intelligence/irisPublicationContext.ts` is the shared publication-context builder used by Iris intelligence surfaces and exposes a pure adapter for deterministic testing.
- `/iris/intelligence` and `/dashboard/intelligence` now consume the same feature/output publication boundary.
- `backend/src/intelligence/irisPublicationContext.test.ts` verifies ready/limited/suppressed publication behavior and the provider/analysis boundary.
- `.github/workflows/iris-backend-ci.yml` runs backend dependency installation, intelligence tests, and TypeScript build on pushes/PRs to `main`.

## Plaid capability contract
For every supported product/domain, maintain:
- stable product identity and version
- capability/data domains
- institution/connection availability
- consent requirements
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
1. Finish authoritative Plaid catalog/capability coverage and runtime-state verification.
2. Complete plan entitlement, consent, availability, and commercial-cost semantics without conflating them with evidence.
3. Strengthen Iris Product Selection as a first-class decision layer.
4. Make Plaid Dashboard consume the authoritative product catalog and runtime evidence cleanly.
5. Make Iris Feature Registry authoritative for independently enabled/disabled intelligence capabilities.
6. Complete governed publication into the shared dashboard/read-model contract and expose provenance, freshness, evidence gaps, and next-best investigation paths in the UI.
7. Continue recursive financial-life entity intelligence and deep workspaces.

## Completion principle
There is no arbitrary artifact-count target. Completion is capability-based: the system is complete only when the required architecture, evidence contracts, intelligence hierarchy, user controls, explainability, education, and deployed user experience are implemented and verified.

## Session protocol
1. Read this file.
2. Read `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
3. Inspect the current `main` commit before modifying anything.
4. Verify deployment/test status instead of relying on chat claims.
5. Continue the highest-priority unfinished capability; do not recreate completed work.
6. Commit meaningful implementation changes and update continuity records.
