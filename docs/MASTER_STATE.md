# Iris Master Project State

> Authoritative continuity document for future sessions. Update this file whenever implementation state materially changes.

## Project identity
- Product: Iris
- Repository: `d77167635/ibag` (repository identifier only; not the product identity)
- Default branch: `main`
- Latest implementation checkpoint: `4674ff1444eba4b1807c2d9ebd7be7bb9389400c`
- Repository status: active, public, non-archived

## Connected infrastructure boundary
- GitHub: `d77167635/ibag`, default branch `main`, authenticated connector has repository administration/maintain/push/pull/triage access.
- Render workspace: Dwayne's workspace, `tea-da729j95efls738egqh0`.
- Active Iris-related Render services include `Iris`, `iris-backend`, `iris-frontend`, and `iiris`, with the relevant services connected to `d77167635/ibag`.
- Supabase project: `d77167635's Project`, ref `uhcrdehjwaghqvydaqnn`, region `us-west-2`, currently `ACTIVE_HEALTHY`.
- Existing infrastructure/data is transitional evidence for reconciliation; it is not permission to blindly preserve legacy product semantics or names.

## Core product boundary
- **Plaid Dashboard** = provider/source observability. It answers: "What financial information is actually available/received from Plaid?"
- **Iris Dashboard** = synthesized intelligence. It answers: "What can Iris understand from available evidence?"
- **Iris Features** = independently controllable intelligence capabilities. A feature may span many workspaces/views.
- **Iris Product Selection** = selects useful Plaid capabilities subject to availability, institution support, user consent, plan entitlement, product cost, and incremental intelligence value.
- **Iris is the intelligence product.** Round-Ups are an entry feature, not the product boundary.

## Non-negotiable data rules
- No fake, mock, seeded, fabricated, or illustrative financial observations in the implementation.
- Plaid/provider data must remain traceable to canonical records and evidence.
- Unavailable evidence must never be represented as observed.
- Evidence state must remain explicit and must gate downstream intelligence.
- Money movement is outside the current read-only intelligence scope.
- Provider/source observability must not be mixed with Iris interpretation.
- Unsupported causal claims are prohibited.

## Authoritative architecture
`Plaid Product Universe → Product Catalog/Capability Matrix → Availability/Consent/Authorization/Billing/Entitlement/Commercial Policy → Provider Observations → Canonical Financial Life State → Relational Ontology → Iris Intelligence Engine → Recursive Intelligence Graph → Iris Feature Registry → Authoritative Read Model → Iris Dashboard/Workspaces → Interactive Iris → Evidence/Explanation → Scenario/Decision → Outcome/Learning → Higher-order intelligence`

The intelligence hierarchy is recursive and branching. The named capability families are not a maximum depth. Additional depth is permitted when governed evidence can produce meaningful additional intelligence.

## Verified implementation foundations
- Expanded Plaid product catalog and capability registry exist.
- Product selection evaluates authorization, consent, billed state, entitlement, commercial terms, and observed evidence independently and aggregates across multiple Items.
- Plaid source/capability routes and the authoritative selection read model exist.
- Iris capability catalog and feature registry foundations exist.
- `irisIntelligenceOutputRuntime.ts` is the governed publication boundary and keeps analytical readiness separate from raw provider observation.
- `irisPublicationContext.ts` provides shared publication context for Iris intelligence surfaces.
- Source-field observation materialization and source-field → intelligence binding foundations exist.
- Capability planning resolves persisted contracts, dependency order, cycle detection, observed provider-product evidence, and resource estimates.
- Capability operator registry exists and now binds the `temporal` capability to a real runtime operator.
- `capabilityDispatcher.ts` now executes implemented non-aggregate operators rather than silently falling back to the aggregate operator.
- The temporal operator is independently dispatchable through the governed dispatcher and returns evidence-qualified multi-window canonical flow/trajectory results without creating provider observations or financial facts.
- The aggregate `iris.full_intelligence` execution boundary remains the existing end-to-end persistence/certification path.

## Current verified gap
The critical runtime gap is now narrower and explicit:

`capability contract → planner → operator registry → dispatcher` is present for the first independently executable capability, but `executeIrisRun` still treats `iris.full_intelligence` as its persisted execution capability. Independent capability results therefore require a governed bridge into the run/execution/output/validation/certification persistence path before they can be considered end-to-end executable.

This is the next runtime architecture boundary; do not declare independent capability execution complete until that bridge is implemented and verified.

## Plaid capability contract
For every supported product/domain, maintain:
- stable product identity/version
- capability/data domains
- institution/connection availability
- consent requirements
- provider authorization/product state
- billed state
- provider observation/evidence state
- plan entitlement
- Plaid cost classification
- user charge/pass-through configuration where applicable
- intelligence contributions
- lineage and freshness

Product pricing is configuration/data, not intelligence logic.

## Iris Feature contract
Every feature requires:
- stable feature identity/version
- activation state/preference
- prerequisites
- required evidence
- evidence coverage/state
- governed intelligence outputs
- explainability/provenance/freshness/lineage
- dashboard/workspace surfaces
- education and interaction surfaces where appropriate

Feature activation must never manufacture missing evidence.

## Current implementation priorities
1. Complete the independent-capability execution bridge from requested capability → operator → persisted execution/output → validation → certification.
2. Make the capability contract include the complete executable contract: operator identity/version, evidence requirements, validation rules, output contract, lineage requirements, recursion/cross-domain behavior, resource limits, and user-control semantics.
3. Complete authoritative Plaid Dashboard rendering and certify provider/source separation.
4. Make the Iris Feature Registry authoritative for durable user activation/deactivation and entitlements.
5. Complete the canonical financial-life state, historical provider observation lifecycle, economic semantics, and field/evidence lineage.
6. Continue the recursive intelligence graph into statistics, adaptive baselines, forecasting, scenario/counterfactual reasoning, decision intelligence, outcome learning, and higher-order intelligence without an arbitrary depth ceiling.
7. Complete recursive user workspaces and conversational/proactive Iris surfaces.
8. Verify clean builds/tests, RLS/security, Supabase migration/runtime reconciliation, Render deployment, Plaid Sandbox lifecycle, and end-to-end observable user journeys.

## Verification status
- Current GitHub main was verified at the time of this reconciliation.
- The temporal operator change initially exposed TypeScript compatibility errors at the aggregate execution boundary; the result type was corrected in commit `4674ff1444eba4b1807c2d9ebd7be7bb9389400c`.
- Render automatic deployment for `4674ff1444eba4b1807c2d9ebd7be7bb9389400c` was still `build_in_progress` at the last check and must be rechecked before being marked verified.
- Earlier Render deployment failures were traced to the dispatcher result type and are not treated as a passing build.
- GitHub combined commit status returned no status records; this is not equivalent to a passing CI certification.
- Clean dependency-installed backend/frontend build certification remains outstanding.
- Remote Supabase schema/runtime reconciliation remains a required certification gate.

## Session protocol
1. Read this file.
2. Read `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
3. Inspect the current `main` commit before modifying anything.
4. Verify GitHub, Render, Supabase, tests, and builds instead of relying on chat claims.
5. Continue the highest-priority unfinished capability; do not recreate completed work.
6. Preserve the distinction between repository history and the intended clean Iris system.
7. Commit meaningful implementation changes and update continuity records.
