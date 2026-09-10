# Iris

**Iris is a Relational Financial Intelligence Operating System.**

Iris is not a Plaid dashboard, a finite list of intelligence levels, or a feature checklist. Its internal intelligence hierarchy is recursive and has no artificial semantic depth ceiling. The hierarchy is the reasoning machinery.

**The user products are the reports and analytics that Iris produces from that hierarchy.**

## Product model

```text
Plaid product universe
        ↓
availability / consent / authorization / entitlement / billing
        ↓
real provider observations
        ↓
canonical financial-life state
        ↓
relational + temporal + statistical + behavioral intelligence
        ↓
risk / opportunity / causal / predictive / scenario / decision / recommendation
        ↓
consequence / outcome / learning / cross-domain / higher-order intelligence
        ↓
recursive composition
        ↓
Iris report & analytics product catalog
        ↓
user activates / deactivates reports
        ↓
only evidence-qualified active reports are published
```

Capability families and intelligence operators are internal composition machinery. They are **not** the products sold or selected by users.

## Iris Report Product Catalog

The report catalog is generated from governed analytical definitions and, as the intelligence system expands, from valid higher-order compositions. A report product has stable identity/versioning, a name, purpose, family, output type, evidence requirements, and publication rules.

Users can:

- browse and search the catalog;
- activate a report product;
- deactivate a report product;
- restore the currently defined report set;
- receive only evidence-qualified report outputs;
- inspect limitations, provenance, and evidence behind published reports.

Report activation is a **user publication preference**. It does not activate Plaid products, create observations, manufacture financial values, or constrain the underlying intelligence hierarchy.

Report names and contextual report titles may use only information actually supplied by the runtime. For example, an entity, period, or domain may be added to a title only when that value is present in the real execution context.

## Evidence and anti-fabrication boundary

This repository has a strict no-fabrication rule.

**Never create or present as financial truth:**

- fake AI-generated financial values;
- mock, seeded, synthetic, copied, or manually invented financial observations;
- hardcoded balances, transactions, income, debt, spending, or provider records;
- invented report results;
- invented confidence or probability values;
- catalog metadata represented as observed evidence;
- availability, consent, authorization, entitlement, or product selection represented as observation;
- missing evidence represented as zero.

A missing or insufficient observation must remain missing, unknown, unavailable, limited, or otherwise explicitly qualified. No empty state is converted into a fabricated financial conclusion.

Technical unit tests may use infrastructure mocks to isolate behavior, but synthetic financial fixtures must never become production evidence or a user's financial state.

## Source boundary

**Plaid Dashboard:** provider/source observability only. It describes provider products, connection state, observed evidence, freshness, and source lineage.

**Iris:** interpretation, synthesis, analysis, reports, education, scenarios, decisions, and higher-order intelligence derived from governed evidence.

Plaid remains the provider evidence source. Iris never alters provider observations and never treats provider catalog metadata as financial evidence.

## Current implementation

The repository currently contains foundations for:

- Plaid product/catalog capability intelligence;
- provider observation and source-field lineage;
- canonical financial-life state;
- evidence-bound temporal analysis;
- robust statistics and adaptive baselines;
- governed capability contracts and recursive planning;
- independently executable intelligence operators;
- recursive higher-order synthesis;
- evidence-gated Iris report product catalog;
- per-user report activation/deactivation persistence;
- evidence-qualified report publication boundaries;
- read-only operation with no money movement.

The current connected Supabase project has no `iris_run_evidence` rows. Therefore the system is **not yet end-to-end certified against real provider evidence**, even though substantial runtime/schema foundations are implemented.

## Certification rule

A report is not certified because its UI, schema, endpoint, or operator exists.

Certification requires the complete chain:

`Architecture → Contract → Schema → Runtime → Independent Execution → Evidence → Exact Evidence Boundary → Lineage → Validation → Certification → Active Report Publication → User Interaction → Deployment → End-to-End Verification`

See `docs/ROADMAP.md` for the current certification gap and `docs/MASTER_STATE.md` for authoritative continuity state.

## Repository structure

```text
backend/    Express + TypeScript API and governed intelligence runtime
frontend/   React + Vite Iris experience
supabase/   PostgreSQL migrations and RLS

docs/
  ARCHITECTURE.md
  DECISIONS.md
  MASTER_STATE.md
  ROADMAP.md
  SESSION_HANDOFF.md
```

## Development boundary

Current scope is read-only financial-life intelligence. No ACH, RTP, FedNow, card movement, withdrawals, trades, deposits, or other money movement is part of the current Iris intelligence product.

For the complete architectural rules and unbounded intelligence model, read `docs/ARCHITECTURE.md` and `docs/ROADMAP.md` before making implementation changes.
