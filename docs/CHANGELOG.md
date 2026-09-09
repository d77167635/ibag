# Iris Changelog

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
