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
- Verified the backend deployment for commit `97db35d5188ffa5fa671148f7ef3d9dfce888c2e` reached `live` after the full 113-test prebuild suite and TypeScript build completed successfully.

## 2026-09-09

- Established repository-backed cross-session continuity.
- Verified the durable state documents: `MASTER_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and `SESSION_HANDOFF.md`.
- Verified the expanded Plaid catalog, capability registry, plan entitlement tables, commercial terms, and evidence-gated product selection foundations.
- Added `IRIS_INTELLIGENCE_OUTPUT_RUNTIME_V2` as the final governed publication boundary, preserving explicit evidence state, qualification, provenance, and one-to-many feature/analysis mapping.
- Added backend CI for intelligence tests and TypeScript builds on `main` pushes and pull requests.
- Centralized the Iris Standard ten-capability preference baseline so catalog and intelligence routes cannot drift apart.
- Added a regression test for the standard baseline and its preference-not-ceiling semantics.
- Added `irisPublicationContext.ts` as the shared publication-context builder for intelligence surfaces.
- Integrated the governed feature/output publication runtime into both `/iris/intelligence` and `/dashboard/intelligence`, preventing surface-specific publication semantics from drifting.
- Updated `/iris/catalog` to consume the same canonical standard baseline directly from the catalog module.
- Preserved the boundary that analytical atlas readiness is not raw Plaid observation and that limited intelligence must remain explicitly qualified.
- Updated the master continuity record with the new publication and verification boundary.
- Refactored the Plaid Item-state relationship from a lossy one-to-one map to an explicit one-to-many `PLAID_PRODUCT_STATE_TO_CATALOG_KEYS` relation, preserving all catalog capabilities that share a runtime state.
- Added `plaidCapabilityRegistry.test.ts` to certify that every documented Item product state is mapped, every catalog state reference is valid, and one-to-many state/capability relationships remain supported.
- Added the Plaid capability certification test to the backend CI test command.
- Removed stale product-identity wording from the canonical Plaid Item-state contract; the product identity is Iris and the repository name is implementation metadata only.
- Next: complete authoritative runtime product coverage, strengthen selection/entitlement/cost semantics, complete Plaid Dashboard observability, integrate governed intelligence output into the shared dashboard contract, and continue recursive financial-life intelligence.
