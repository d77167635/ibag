# Iris

**Iris is a Relational Financial Intelligence Operating System.**

Iris is not a Plaid dashboard, a finite list of intelligence levels, or a feature checklist. Its internal intelligence hierarchy is a recursive graph with no artificial semantic depth ceiling. The hierarchy is the reasoning machinery.

**The user products are the reports and analytics that Iris produces from that hierarchy.**

## Two connected experiences — one IRIS

IRIS has two intentionally distinct user-facing experiences over the same underlying governed system. They must never be confused or treated as separate products.

### Priority 1 — Financial Life / Results / User Journey

This is the primary consumer experience. It is where a person encounters their observed financial reality and the results Iris can validly derive from it. It includes the financial-life journey, evidence, user-specific intelligence results, reports and analytics, explanations, comparisons, scenarios, decisions, outcomes, controls, and the large report/product inventory Iris can offer.

The journey is the primary product surface. Iris should be continuously present throughout it as a ready, contextual helper: available on every Financial Life / Results page to explain what the person is seeing, help them navigate, explain reports, clarify evidence, and help them understand supported results. The assistant must remain grounded in the actual governed user evidence and must never manufacture a financial fact.

### Priority 2 — IRIS Intelligence / Education

This is a read-only educational experience for learning how Iris thinks. It contains **no user financial data and no user-specific financial results**. It explains the intelligence hierarchy, graph structure, evidence states, lineage, recursive composition, uncertainty, causal/predictive/scenario boundaries, and other intelligence concepts.

Iris should also be continuously present throughout the Intelligence experience as a ready educational guide. In this mode the assistant must not load, query, display, or infer user financial data. It explains the intelligence model itself.

The two experiences remain connected through one architecture:

```text
provider evidence
      ↓
governed evidence boundary
      ↓
canonical financial state
      ↓
IRIS intelligence graph
      ↓
user-specific intelligence results
      ↓
Financial Life / Results / Reports

                 ↕

IRIS Intelligence / Education
explains the same reasoning machinery without user data
```

The separation is a **surface/data-boundary distinction**, not an architectural split. The intelligence hierarchy remains the shared reasoning machinery behind the primary Financial Life / Results experience.

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

Capability families and intelligence operators are **internal composition machinery**. They are not user products and are not hierarchy levels. The same operator family may occur at different depths, in different orders, across domains, or as part of a higher-order composition.

## Intelligence hierarchy

Level 1 is **Iris**.

Level 2 contains the eight authoritative financial-life evidence domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

Level 3 and beyond are **not a predefined list**. Intelligence branches according to what can be validly derived from governed evidence and previously derived intelligence. Nodes may have multiple parents, span multiple domains, depend on temporal or semantic relationships, and become inputs to further higher-order intelligence.

There is no final level. Semantic depth is unbounded. Runtime resource/materialization budgets are permitted, but a computational budget is never a semantic hierarchy ceiling.

A conceptual progression may include observed evidence → canonical state → interpretation/classification → temporal/statistical/relational/behavioral intelligence → patterns/baselines/anomalies → causal reasoning where supported → prediction → scenarios/counterfactuals → risk/opportunity → decisions/recommendations → consequences → outcomes → learning → cross-domain synthesis → higher-order intelligence → newly derived intelligence → further recursive reasoning. This is an example of compositional flow, not a finite level list.

The current Sandbox/runtime evidence boundary is **seven executable domains**: Authentication, Transactions, Balance, Identity, Assets, Liabilities, and Investments. **Statements remains architecturally defined but deferred until real banking**; it must not be simulated or presented as current Sandbox evidence.

## Product model versus intelligence hierarchy

The intelligence hierarchy and the report catalog are separate boundaries:

```text
IRIS
├── Evidence governance
├── Unbounded intelligence graph
│   ├── observed evidence
│   ├── canonical state
│   ├── relational / temporal / analytical intelligence
│   ├── behavioral / pattern / anomaly intelligence
│   ├── causal / predictive / scenario intelligence
│   ├── risk / opportunity / decision / recommendation intelligence
│   ├── consequence / outcome / learning
│   └── recursive higher-order composition → …
│
└── User product layer
    └── Reports & Analytics
```

A report product is a governed publication surface over intelligence. Activating a report does not activate a Plaid product, create observations, manufacture financial values, or constrain the underlying intelligence graph.

## Arbitrary derived-intelligence graph

The persisted graph now has a schema/runtime foundation for intelligence nodes whose semantic identity is **not required to exist in the finite capability registry**. A derived node can carry a stable intelligence key/name, derivation operator/version, exact upstream node UUIDs, recursive ancestry, deterministic output hash, graph edges, and execution lineage.

This foundation is intentionally **not** treated as proof that arbitrary recursive intelligence is already certified. Persistence of upstream references proves that references were recorded and ownership was checked; it does not by itself prove that an operator semantically transformed those upstream values. Recursive composition certification therefore remains gated on actual dependency consumption, reproducible transformation, exact lineage, validation, and real evidence.

No artificial graph-depth column or maximum semantic depth is introduced. Materialization/resource limits may exist operationally, but they must never be interpreted as an intelligence-depth ceiling.

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

Report names and contextual report titles may use only information actually supplied by the runtime. An entity, period, domain, or other contextual value may be included only when that value is present in the real execution context.

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
- missing evidence represented as zero;
- a capability definition represented as a user-specific intelligence result;
- dependency availability represented as proof that a downstream operator actually used the dependency.

A missing or insufficient observation must remain missing, unknown, unavailable, limited, or otherwise explicitly qualified. No empty state is converted into a fabricated financial conclusion.

Technical unit tests may use infrastructure mocks to isolate behavior, but synthetic financial fixtures must never become production evidence or a user's financial state.

## Intelligence integrity boundary

A capability being defined, registered, executable, or present in a dependency graph does **not** by itself establish that a user-specific intelligence result exists.

For an intelligence result to become a factual or user-specific claim, Iris must be able to establish, as applicable:

1. the required evidence exists and is authorized for the relevant user/Item/context;
2. the execution read exactly the governed evidence boundary;
3. the operator actually consumed the declared upstream outputs it claims to depend on;
4. the transformation from inputs to outputs is reproducible and semantically represented;
5. exact input/output lineage is preserved;
6. validation and certification state are known rather than implied;
7. uncertainty, assumptions, limitations, freshness, and applicability are retained.

This distinction is critical to recursive intelligence. Recording that dependency outputs were available is not equivalent to proving that the downstream result was derived from those outputs.

## Persistent Iris assistance boundary

The IRIS assistant is part of the experience shell rather than a page-specific feature. It must be available on **every authenticated Financial Life / Results page and every Intelligence / Education page**, so the person can always ask for help without losing their place in the journey.

Its mode is determined by the surface:

- **Financial Life / Results mode:** may answer user-specific questions through governed IRIS APIs and actual evidence; it must preserve evidence state, uncertainty, provenance, and anti-fabrication rules.
- **Intelligence / Education mode:** is read-only and educational; it must not load or expose user financial data or user-specific results.

The assistant's presence must not blur the product boundary. On the primary journey it helps the user understand their reality/results. On the educational side it helps the user understand IRIS itself.

## Source boundary

**Plaid Dashboard:** provider/source observability only. It describes provider products, connection state, observed evidence, freshness, and source lineage.

**Iris:** interpretation, synthesis, analysis, reports, education, scenarios, decisions, and higher-order intelligence derived from governed evidence.

Plaid remains the provider evidence source. Iris never alters provider observations and never treats provider catalog metadata as financial evidence.

## Current implementation status

The repository contains substantial foundations for:

- Plaid product/catalog capability intelligence;
- provider observation and source-field lineage;
- canonical financial-life state;
- evidence-bound temporal analysis;
- robust statistics and adaptive baselines;
- governed capability contracts and recursive planning;
- independently executable intelligence operators;
- persisted arbitrary derived-intelligence graph nodes and recursive ancestry metadata;
- recursive higher-order synthesis foundations;
- evidence-gated Iris report product catalog;
- per-user report activation/deactivation persistence;
- evidence-qualified report publication boundaries;
- read-only operation with no money movement;
- a shared persistent IRIS assistant surface with separate Financial Life and Intelligence/Education behavior.

The current backend audit identified remaining integrity gaps before the intelligence engine can be called complete. In particular, some declared capability dependencies are not yet proven to be semantically consumed by the corresponding operators; provenance can record dependency context without proving dependency use; and the persisted arbitrary graph is a composition/persistence foundation, not proof of certified unbounded recursive discovery.

The connected Supabase project currently has **zero `iris_run_evidence` rows**. Therefore no real provider-evidence intelligence result is currently end-to-end certified from that project. This is a live database observation and must be rechecked after material runtime/evidence changes.

The current Render migration is also not treated as certified merely because a prior deployment candidate existed. Deployment status must be reverified against the current repository commit and the current Render environment before certification.

## Certification rule

A report is not certified because its UI, schema, endpoint, capability, or operator exists.

Certification requires the complete chain:

`Architecture → Contract → Schema → Runtime → Independent Execution → Evidence → Exact Evidence Boundary → Semantic Lineage → Validation → Certification → Active Report Publication → User Interaction → Deployment → End-to-End Verification`

A later state never implies an earlier state is certified.

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
