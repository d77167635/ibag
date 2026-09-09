# Iris Architectural Decision Ledger

Decisions recorded here are authoritative unless superseded by a later numbered decision.

## ADR-001 — Separate Plaid and Iris surfaces
**Status:** AUTHORITATIVE

Plaid Dashboard is provider/source observability. Iris Dashboard is synthesized financial-life intelligence. They do not compete for the same responsibility and must not mix provider facts with Iris-derived conclusions.

## ADR-002 — Plaid products are source capabilities
**Status:** AUTHORITATIVE

A Plaid product is a source/provider capability. It is not an Iris feature. One Iris feature may consume multiple Plaid products, and one Plaid product may support many Iris features.

## ADR-003 — Iris Features are first-class capabilities
**Status:** AUTHORITATIVE

Every Iris feature has a stable identity, evidence requirements, activation state, explainability, lineage, and user-facing surfaces. Feature activation is independent from provider-product activation.

## ADR-004 — Evidence gates intelligence
**Status:** AUTHORITATIVE

Iris may calculate, infer, forecast, recommend, or teach only to the extent justified by available evidence. Missing evidence produces an explicit limitation rather than fabricated completeness.

## ADR-005 — Iris selects useful provider capabilities
**Status:** AUTHORITATIVE

Iris may evaluate the Plaid product universe and select capabilities based on incremental intelligence value, availability, institution support, consent, plan entitlement, and cost policy.

## ADR-006 — Product cost is data/configuration
**Status:** AUTHORITATIVE

Plaid pricing must not be embedded in intelligence algorithms. Product cost, billing classification, and user-plan treatment are configuration/data so pricing changes do not require rewriting intelligence logic.

## ADR-007 — No arbitrary artifact-count completion
**Status:** AUTHORITATIVE

Project completion is measured by capability and verification coverage, not by number of files, pages, commits, or artifacts.

## ADR-008 — Repository is the durable implementation source of truth
**Status:** AUTHORITATIVE

Conversation history is context, not the canonical implementation record. Durable project state belongs in version-controlled project-state documents and the repository itself.

## ADR-009 — Session handoff is mandatory for continuity
**Status:** AUTHORITATIVE

Material changes should update the session handoff and changelog so a new chat can recover the current objective, last verified commit, deployment state, completed work, blockers, and next action without copying prior conversation history.
