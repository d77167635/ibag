# Iris Master Project State

> Authoritative continuity document for future sessions. Update this file whenever implementation state materially changes.

## Project identity
- Product: Iris
- Repository: `d77167635/ibag` (repository identifier only; not the product identity)
- Default branch: `main`
- Latest implementation change: `723c7aea10627eadf68669017ef3a56d4c04f176`
- Latest continuity commit observed before this update: `ad9913c5ae759870e48f3c3a927451e7a8f29834`
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
- Capability operator registry exists and binds the `temporal` capability to a real runtime operator.
- `capabilityDispatcher.ts` executes implemented non-aggregate operators without silently falling back to the aggregate operator and accepts a governed execution context.
- The temporal operator consumes a single explicit `asOf`/evidence boundary and returns evidence-qualified multi-window canonical flow/trajectory results without creating provider observations or financial facts.
- `independentCapabilityExecution.ts` now persists a run, materializes current observed provider evidence once per run, executes the planner's transitive dependency order, passes the governed execution boundary into operators, persists execution inputs/outputs, evaluates the persisted capability contract, and routes eligible certification through the independent atomic database gate.
- `073_atomic_independent_capability_certification.sql` is present in the repository and has been applied to the remote Supabase project. The function is executable only by `service_role`.
- The aggregate `iris.full_intelligence` execution boundary remains the separate existing end-to-end persistence/certification path.

## Current verified gap
The independent-capability bridge is now implemented through persistence and atomic certification, and the deployment is live, but it has **not yet been certified by a real end-to-end independent-capability execution against observed provider evidence**. No financial facts were fabricated for this verification.

The next certification boundary is therefore:

`requested capability → persisted contract → dependency plan → executable operator → governed asOf/evidence boundary → run evidence → execution input/output → contract-driven validation → atomic independent certification → independently queryable certified result`

The first vertical slice remains `temporal`. Its operator is implemented; deeper capability families remain truthful `planned` operators until distinct runtime implementations and verification exist.

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
1. Perform a real end-to-end temporal independent-capability execution using only existing observed evidence, then verify every persisted run/execution/input/output/validation/certification/lineage boundary without fabricating data.
2. Make `iris_capability_contracts` the complete governing contract: operator identity/version, evidence requirements, validation rules, output contract, lineage requirements, recursion/cross-domain behavior, resource limits, and user-control semantics; executable code must not silently weaken persisted policy.
3. Complete authoritative Plaid Dashboard rendering and certify provider/source separation.
4. Make the Iris Feature Registry authoritative for durable user activation/deactivation and entitlements.
5. Complete the canonical financial-life state, historical provider observation lifecycle, economic semantics, and field/evidence lineage.
6. Continue the recursive intelligence graph into statistics, adaptive baselines, forecasting, scenario/counterfactual reasoning, decision intelligence, outcome learning, and higher-order intelligence without an arbitrary depth ceiling.
7. Complete recursive user workspaces and conversational/proactive Iris surfaces.
8. Verify clean builds/tests, RLS/security, Supabase migration/runtime reconciliation, Render deployment, Plaid Sandbox lifecycle, and end-to-end observable user journeys.

## Verification status
- Render deployment for implementation commit `723c7aea10627eadf68669017ef3a56d4c04f176` reached `live`.
- Render build logs for that deployment show `113` tests passed and `0` failed, followed by a successful TypeScript build.
- Render runtime logs show the Iris backend listening successfully in production with Plaid environment `sandbox`; the service reached the Render `live` state.
- The previous startup ciphertext failure is resolved by the token migration guard that skips structurally encrypted legacy ciphertext instead of attempting decryption with the current key during startup.
- Remote Supabase now contains migration `073_atomic_independent_capability_certification` and the independent certification function; `anon` and `authenticated` do not have execute privilege, while `service_role` does.
- Remote Supabase currently contains observed transitional evidence (including provider observations, source-field observations, canonical transactions, and lineage). These observations remain transitional and are not to be treated as the future clean Iris production dataset.
- GitHub combined commit status for the continuity commit returned no status records; this is not equivalent to a passing GitHub CI certification.
- A real end-to-end independent-capability certification run remains outstanding.

## Session protocol
1. Read this file.
2. Read `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
3. Inspect the current `main` commit before modifying anything.
4. Verify GitHub, Render, Supabase, tests, and builds instead of relying on chat claims.
5. Continue the highest-priority unfinished capability; do not recreate completed work.
6. Preserve the distinction between repository history and the intended clean Iris system.
7. Commit meaningful implementation changes and update continuity records.
