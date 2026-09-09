# Iris Master Project State

> Authoritative continuity document for future sessions. Update this file whenever the implementation state materially changes.

## Project identity
- Product: Iris
- Repository: `d77167635/ibag`
- Default branch: `main`
- Last verified commit at initialization of this continuity system: `7a94afe13b6bdbfd339829d5dcc0a7492d03627c`
- Repository status: active, public, non-archived

## Core product boundary
- **Plaid Dashboard** = provider/source observability. It answers: "What financial information is iBag actually receiving from Plaid?"
- **Iris Dashboard** = synthesized intelligence. It answers: "What can Iris understand from the available evidence?"
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
`Plaid Product Universe → Product Catalog → Availability/Entitlement/Cost → Provider Observations → Canonical Financial Life State → Relational Ontology → Iris Intelligence Engine → Iris Feature Registry → Iris Dashboard/Workspaces`

## Current known implementation direction
- Ontology-driven Iris workspace architecture exists in the repository.
- Recursive workspace navigation is intended to derive from the ontology rather than a fixed page count.
- Entity intelligence is being expanded toward: entity → observations → relationships → changes → evidence → interpretation.
- Field-level provider-to-intelligence lineage has been implemented in recent work.
- Intelligence aggregation has been moved through a dispatcher in recent work.
- Deployment has recently been standardized around Node 22 for Supabase Realtime compatibility.

## Plaid capability layer — target contract
For every supported Plaid product/domain, maintain:
- product identity and version
- capability/data domains
- institution/connection availability
- consent requirements
- observation/evidence state
- plan entitlement
- Plaid cost classification
- iBag/user charge configuration when applicable
- intelligence contributions
- lineage and freshness

Initial commercial rule: products are included unless Plaid charges iBag for the product. Product pricing must be configuration/data, not hardcoded into intelligence logic.

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
Build the durable continuity system first, then complete the authoritative Plaid Product Catalog + Product Capability Matrix + Plan Entitlement/Cost Matrix + Iris Product Selection Engine + Iris Feature Registry, followed by deep recursive entity intelligence and full user-facing workspaces.

## Completion principle
There is no arbitrary artifact-count target. Completion is capability-based: the system is complete only when the required architecture, evidence contracts, intelligence hierarchy, user controls, explainability, education, and deployed user experience are implemented and verified.

## Session protocol
1. Read this file.
2. Read `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
3. Inspect the current repository/commit before modifying anything.
4. Verify whether claimed deployments or tests are actually current.
5. Continue the highest-priority unfinished capability; do not recreate completed work.
6. Commit implementation and update continuity records.
