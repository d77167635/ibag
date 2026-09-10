# Iris Changelog

## 2026-09-10

- Corrected the durable Iris architecture so the deleted historical project is not treated as a product, foundation, or architectural source; the current product boundary is Iris, with Round-Ups remaining one feature within Iris.
- Explicitly documented recursive Iris intelligence as an unbounded governed graph: defined top-level domains and capability families are not a maximum depth, and further evidence-supported reasoning may continue wherever it produces meaningful intelligence.
- Added `074_complete_iris_capability_contract.sql`, extending the persisted capability contract with output contracts, lineage requirements, resource limits, and user-control semantics.
- Applied migration `074_complete_iris_capability_contract` to the connected Supabase project and verified active capability contracts now contain all four governing dimensions.
- Updated the capability planner to load and require the complete persisted contract rather than relying only on executable-code assumptions.
- Updated independent capability certification to validate persisted output type/evidence-state policy, lineage requirements, resource limits, and user-control semantics in addition to existing evidence and integrity checks.
- Preserved the rule that independent execution remains uncertified until a real end-to-end run against existing observed evidence verifies the complete persistence, validation, lineage, and certification boundary.
- Wired all currently registered recursive capability surfaces to executable operators and preserved explicit evidence-state/provenance semantics without fabricating financial values.
- Added runtime dependency-result propagation to independent capability execution: declared upstream outputs are passed into downstream operators, persisted as execution inputs with upstream execution references and hashes, and included in downstream execution manifests.
- Extended recursive operators so scenario, decision, recommendation, outcome, learning, and emergent reasoning can consume available upstream capability results while retaining explicit insufficient-evidence states where validated outcomes are absent.
- Added governed recursive higher-order synthesis that reconstructs the dependency graph from persisted capability outputs, preserves output hashes and evidence states, identifies supported cross-capability chains and interactions, and exposes missing-evidence gaps without creating provider observations or financial values.
- Routed the governed emergent capability through the recursive higher-order synthesis layer instead of treating the earlier isolated emergent calculation as the endpoint of recursion.
- Expanded emergent intelligence to include a canonical financial-life state derived from the exact evidence-gated transaction set, preserving run IDs, evidence manifests, evidence boundaries, and explicit limitations.
- Expanded the canonical financial-life state from basic entity/relationship topology into production analytical state: observation span/activity density, economic inflow/outflow/net flow, transaction-class distribution, account activity, merchant concentration, domain concentration, and explicit evidence/limitation semantics.
- Strengthened the canonical ontology so transaction classifications are first-class entities and account-to-class relationships, rather than incorrectly representing classifications as generic categories.
- Hardened the canonical life-state flow contract so a transaction set containing no economically classified inflows/outflows returns `insufficient_evidence`, rather than exposing zero as a substitute for unknown evidence; regression coverage enforces this for both empty and unknown-classification inputs.
- Hardened relational composition so absent/non-numeric amounts are not silently converted into observed zero values before higher-order findings are calculated.
- Bound canonical temporal window calculations to the explicit evidence boundary so supplied transaction sets cannot leak later observations into a historical run.
- Bound orchestrated cash-flow safety to the exact run state when a governed execution run is present, preventing the prior unscoped `computeCashFlowSafety(userId)` path from leaking current provider state into historical/run-bound intelligence.
- Added exact-run financial-state derivation for balance, liquidity-history, debt-history, and run-bound forward projection paths while withholding safe-to-spend when recurrence evidence is not sufficient to establish contractual/essential obligations.
- Added user-specific observed activity-day outflow baselines to maximum intelligence, with median/MAD dispersion, adaptive references, explicit limited/insufficient states, and no conversion of missing days into zero observations.
- Added reusable robust statistical/adaptive-baseline primitives and regression tests.
- Added regression coverage for the canonical financial-life ontology, including calculated flow state, activity density, concentration, relationships, transaction-class entities, and empty-evidence behavior.
- Added regression coverage proving evidence-bound temporal aggregation excludes transactions outside the explicit boundary.
- Hardened backend test imports so production-required secrets are not required merely to load pure intelligence tests in the CI test environment; production configuration remains fail-fast when required variables are absent.
- Reconciled the connected Supabase schema: `iris_run_evidence`, `iris_capability_contracts`, `iris_execution_lineage`, `iris_field_lineage_edges`, and `iris_source_field_observations` exist; the previously discussed `iris_intelligence_state_nodes`, `iris_intelligence_state_edges`, and `iris_execution_lineage_links` are not present in the connected project and are not treated as authoritative until introduced through governed migration history.
- Reconciled the connected capability registry against executable code: the stale active `iris.full_intelligence` contract referenced `computeFullIntelligence` operator version `1`, while the governed executable registry does not expose that capability; migration `076_deactivate_stale_full_intelligence_contract.sql` now preserves the historical row but deactivates that stale contract.
- Verified the stale `iris.full_intelligence` contract is inactive in the connected Supabase project after migration `076`.
- Added a production-safe run boundary to provider-domain synthesis: run-bound executions no longer consume the current unscoped provider-domain observation set; provider-domain synthesis is withheld until its source observations can be resolved from the exact run evidence manifest.
- Bound category-drift analysis to the supplied `asOf` boundary and optional run ID instead of using wall-clock time and unscoped canonical transactions.
- Bound relational financial reasoning to the exact run transaction manifest and run-bound state when a run is present; debt-cost provider observations remain explicitly insufficient in run context until liability evidence is manifest-bound.
- Propagated the run ID/evidence boundary through the orchestrator into category drift and relational reasoning.
- Verified the last known production Render deployment before the current queued changes remains `dep-dahagci01d6s739gk76g`; newer commits are not marked live until Render reports them live.

## 2026-09-09

- Established repository-backed cross-session continuity.
- Verified the durable state documents: `MASTER_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
- Verified the expanded Plaid catalog, capability registry, plan entitlement tables, commercial terms, and evidence-gated product selection foundations.
- Added `IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V2` as the final governed publication boundary, preserving explicit evidence state, qualification, provenance, and one-to-many feature/analysis mapping.
- Added backend CI for intelligence tests and TypeScript builds on `main` pushes and pull requests.
- Centralized the Iris Standard ten-capability preference baseline so catalog and intelligence routes cannot drift apart.
- Added a regression test for the standard baseline and its preference-not-ceiling semantics.
