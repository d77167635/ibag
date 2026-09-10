# Iris Architecture

## Authoritative product and system boundary

```text
                           IRIS
                            │
                  determines information needs
                            ↓
                 PLAID PRODUCT UNIVERSE
                            │
          availability / consent / authorization
          entitlement / billing / commercial policy
                            ↓
                 PROVIDER OBSERVATIONS
                            │
                   canonical financial state
                            ↓
                  RELATIONAL ONTOLOGY
                            ↓
                IRIS INTELLIGENCE HIERARCHY
                            │
          recursive composition / higher-order reasoning
                            ↓
              IRIS REPORT PRODUCT CATALOG
                            │
             user activates / deactivates
                            ↓
              EVIDENCE-QUALIFIED REPORTS
                            │
             reports / analytics / education
             explanations / scenarios / decisions
```

### Critical distinction

The **intelligence hierarchy is not the user product catalog**.

The hierarchy is Iris's internal reasoning system. Capability families, operators, dependencies, nodes, edges, and recursive compositions are implementation/semantic machinery.

The **user products are the reports and analytics returned by that intelligence**. Their number is not artificially bounded. As the hierarchy derives additional valid intelligence from real evidence, governed new report products may be defined and surfaced.

A report product must have a stable identity/version, name, purpose, analytical basis, evidence requirements, provenance/lineage requirements, publication state, and user activation state.

## Source separation

### Plaid Dashboard
Provider observability only. It maps the supported Plaid product universe and shows what is available, consented, authorized, billed, entitled, observed, unavailable, limited, or otherwise evidenced for the user's connections. It must not present Iris interpretation as provider data.

### Iris Report Catalog
The user-facing product catalog. It contains reports and analytics that Iris can produce from governed intelligence. Users can activate or deactivate individual report products. Catalog metadata itself is not financial evidence.

### Iris Dashboard / Workspaces
Surfaces active, evidence-qualified reports and their supporting explanations, evidence, lineage, relationships, scenarios, decisions, education, and other interaction paths.

## Evidence pipeline

```text
Plaid product universe
        ↓
provider capability selection
        ↓
real authorized provider observations
        ↓
raw/source evidence
        ↓
canonical financial-life state
        ↓
relational ontology
        ↓
recursive Iris intelligence
        ↓
analytical outputs
        ↓
report product definitions
        ↓
user report activation
        ↓
evidence-qualified report publication
```

Availability, consent, authorization, entitlement, billing, and report activation are control-plane state. None is itself a financial observation.

## Recursive intelligence

Level 1 is Iris. Level 2 contains the eight authoritative financial-life domains. From Level 3 onward, intelligence branches according to what can be technically and evidentially derived. There is no semantic depth ceiling.

Capability families such as observation, classification, temporal analysis, statistics, baselines, anomaly detection, behavioral analysis, relationship analysis, causal analysis, prediction, scenarios, risk, opportunity, decisions, recommendations, consequences, outcomes, learning, synthesis, and emergence are operators. They may recur at different depths and in different combinations.

The graph supports:

- parent/child dependencies;
- multiple parents producing synthesized intelligence;
- cross-domain relationships;
- temporal relationships;
- evidence and derivation relationships;
- recursive ancestry;
- uncertainty and limitations;
- further derived intelligence from prior intelligence.

A materialization/resource budget is an execution constraint, not a semantic maximum.

## Report-product generation

The current report catalog is derived from the authoritative analytical atlas. This is a foundation, not the final catalog size.

Future governed report discovery may derive products from:

- actual user entities;
- domains and subdomains;
- temporal windows;
- observed relationships;
- supported patterns;
- statistical comparisons;
- risk/opportunity relationships;
- scenarios and counterfactuals;
- decisions and consequences;
- observed outcomes;
- verified learning;
- valid higher-order compositions.

Contextual report names may incorporate only information present in the actual execution context. No entity, amount, period, confidence, probability, or outcome may be invented merely to make a report look complete.

Equivalent compositions should be deduplicated. Report materiality and usefulness must be evidence-based.

## User control

Report activation/deactivation is a publication preference. It must:

- persist per authenticated user;
- apply to report products, not intelligence operators;
- never activate or deactivate Plaid products;
- never create evidence;
- never alter provider observations;
- never change the semantic depth of Iris;
- prevent deactivated reports from normal publication;
- preserve explicit empty selections as all reports disabled;
- allow the user to restore the currently defined default active set.

## Anti-fabrication boundary

No production financial state, report result, or analytical claim may be fabricated.

Prohibited:

- fake AI-generated financial values;
- mock/seeded/synthetic financial observations presented as user truth;
- hardcoded financial balances, transactions, income, debt, spending, or provider records;
- invented report results;
- invented confidence/probability values;
- provider observations inferred from catalog metadata;
- missing evidence converted to zero;
- suppressed or insufficient-evidence outputs presented as complete conclusions.

Technical unit-test mocks may isolate infrastructure behavior, but cannot become production financial evidence.

## Certification

A report product is not certified because a definition, schema, operator, endpoint, or UI exists.

Certification requires evidence, exact run boundaries, independent execution, complete lineage, artifact validation, atomic certification, active publication, user-control enforcement, frontend/backend contract agreement, deployment verification, and end-to-end user-journey verification against real provider evidence.

The connected Supabase project currently has zero `iris_run_evidence` rows, so real provider-evidence certification remains pending.
