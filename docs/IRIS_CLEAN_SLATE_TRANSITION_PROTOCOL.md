# Iris Clean-Slate Transition Protocol

## Purpose

The current repository and connected development data are engineering material used to build, test, reconcile, and validate Iris. They are not the final financial state of Iris.

The eventual production Iris must begin its real-user financial operation from a clean provider/database state. Existing development financial records must never be silently promoted into that state.

## Boundary

Development evidence may be used to:

- discover schema and lineage defects;
- validate provider ingestion and reconciliation logic;
- exercise evidence-gated intelligence;
- test explanations, education, forecasting, composition, and decision logic;
- identify missing provider domains and unsupported conclusions.

Development evidence must not be used to:

- fabricate a first-user financial history;
- pre-populate a real user's financial state;
- satisfy an observation requirement merely because a development record exists;
- bypass provider authorization or current evidence requirements;
- establish production intelligence readiness after the clean-slate transition.

## Required transition sequence

1. Freeze development financial state for final audit.
2. Record the exact repository commit and schema migration state.
3. Verify all required intelligence and evidence gates against the engineering environment.
4. Create the final production database/provider environment.
5. Apply only the authoritative production schema, RLS, constraints, indexes, contracts, and runtime configuration.
6. Verify that no development financial rows, provider tokens, observations, transactions, balances, holdings, liabilities, statements, sync records, or intelligence snapshots exist in the production state.
7. Verify provider authorization starts from the real user's authorization event.
8. Verify first ingestion creates evidence only from that authorization and current provider responses.
9. Verify every financial claim has current lineage to the user's provider evidence.
10. Enable higher-order intelligence only after the same evidence and reconciliation gates pass in the clean production state.

## Destructive reset rule

This document does **not** authorize deletion of current development data.

A destructive reset is a separate operational action requiring explicit authorization at the transition point. Until then, development data remains available solely as engineering evidence.

## Production invariants

- No fake, mock, seeded, synthetic, or manually invented financial observations.
- No financial observation is inferred from catalog metadata, consent, entitlement, availability, or product selection.
- No provider product is considered observed without persisted provider evidence.
- No canonical transaction is certified without provider identity and account/Item lineage reconciliation.
- No overlapping provider value is added to net worth without explicit identity and valuation reconciliation.
- Mixed-currency monetary aggregation is withheld unless a safe conversion policy exists.
- Higher-order intelligence remains gated by source fidelity, reconciliation, evidence coverage, and governed execution.
- The first real user starts with no inherited development financial state.
- Read-only intelligence remains separate from money movement.

## Certification meaning

Passing development CI proves code and tests satisfy the repository's automated checks. It does not prove production readiness, provider completeness, or a clean production database.

Production certification requires a separate clean-slate verification of repository, deployment, database, provider evidence, lineage, reconciliation, RLS, and user-facing publication boundaries.
