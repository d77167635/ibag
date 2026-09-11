# IRIS Financial Life / Results Catalog

## Purpose

This document defines the Priority 1 user-facing Financial Life / Results catalog boundary.

The catalog is **not** the intelligence hierarchy. It is the product/publication layer through which IRIS exposes valid results of the connected financial-life system.

The catalog is also **not** a provider catalog. Plaid products describe provider capabilities and observation sources. IRIS report products describe ways IRIS can present governed intelligence to the user.

## Core model

```text
person's financial reality
        ↓
provider observations
        ↓
governed evidence
        ↓
canonical financial state
        ↓
IRIS intelligence graph
        ↓
qualified user-specific intelligence
        ↓
report / result / explanation / comparison / scenario / decision / outcome
        ↓
Financial Life experience
```

The same system supports reverse traversal:

```text
user result / report
        ↓
intelligence node(s)
        ↓
exact transformations / relationships
        ↓
canonical state
        ↓
governed evidence
        ↓
source field / provider observation
```

## Catalog has no conceptual ceiling

The catalog must not have a hardcoded maximum count.

A finite persisted catalog is simply the set of product definitions currently registered. It is not the number of products IRIS can ultimately produce.

New products may become valid when IRIS gains:

- new governed evidence;
- new intelligence operators;
- new relationships;
- new temporal contexts;
- new cross-domain compositions;
- new recursive intelligence;
- new user questions;
- new scenario/decision structures;
- verified outcomes; or
- other materially useful combinations of governed intelligence.

Runtime resources, user entitlements, evidence sufficiency, certification and publication policy may constrain what can be produced or shown at a particular time. None of those constraints is a semantic ceiling on IRIS.

## Definition is not observation

A product definition may be created and named without any Plaid user data.

That is intentional.

The following are separate states:

```text
product definition
  ≠ provider availability
  ≠ user consent
  ≠ authorization
  ≠ provider response
  ≠ persisted observation
  ≠ evidence certification
  ≠ intelligence execution
  ≠ intelligence result
  ≠ report publication
  ≠ user activation
```

Therefore a newly registered report product must not display invented financial values simply because its definition exists.

## Product state model

A product should be represented through independently governed dimensions rather than one overloaded status:

- **defined** — product definition exists;
- **available** — product is supported by the current product/runtime contract;
- **evidence-qualified** — required evidence boundary is satisfied;
- **intelligence-qualified** — required intelligence dependencies and semantic transformations are proven;
- **runtime-produced** — a real governed execution produced a corresponding result;
- **certified** — applicable validation, lineage and publication gates passed;
- **active** — user has selected the product for publication/attention;
- **published** — a qualified result is actually exposed to the user;
- **limited** — the product exists but cannot currently provide all expected information;
- **unavailable** — a required boundary cannot currently be satisfied;
- **deferred** — intentionally outside the current executable boundary.

These dimensions must not be collapsed into a misleading single “working” state.

## Product lifecycle

### 1. Define

Create a stable product identity, version, purpose, family, output type and declared evidence/intelligence dependencies.

No user financial data is required to define the product.

### 2. Qualify the evidence boundary

Determine exactly which provider-derived observations are required for the product in the current user, Item, execution and temporal context.

Provider availability alone does not qualify the evidence.

### 3. Execute intelligence

Run the governed intelligence operations required to produce the product.

The execution must retain the exact run/execution boundary and must not mix unrelated provider Items or users.

### 4. Prove semantic lineage

The runtime must establish that declared dependencies were actually consumed and transformed, not merely present or readable.

Exact upstream node identity, transformation identity, output identity, evidence lineage and applicable uncertainty/limitations must be retained.

### 5. Validate and certify

The result must pass the applicable evidence, semantic, lineage, validation and publication gates.

A persisted row is not certification.

### 6. Publish

Only a qualified/certified result may be presented as a factual user-specific report.

If qualification fails, the UI must explain the limitation rather than manufacture a result.

### 7. User control

The user may activate or deactivate supported products. Activation is a publication preference. It does not create evidence, enable provider products, or constrain the underlying intelligence graph.

### 8. Explore

Every published result should support progressive disclosure:

```text
human-readable headline
        ↓
what IRIS found
        ↓
why it matters
        ↓
relationships / reasoning
        ↓
exact evidence / provenance
        ↓
limitations / uncertainty
```

Where exact lineage is available, users should be able to traverse backward from the report to its supporting intelligence and evidence.

## Report families

Families are organizational/product metadata. They are not intelligence levels.

A family may contain many products and a product may participate in many conceptual relationships without changing its stable identity.

The UI should support family browsing, search, filtering, related-product discovery and question-driven discovery without treating the current family list as exhaustive.

## Dynamic and higher-order products

The architecture must permit a report product to emerge from an arbitrary valid intelligence composition rather than requiring every future report to be added to a finite hardcoded registry first.

A dynamic product still requires:

1. a stable product identity for the publication instance;
2. exact upstream intelligence identities;
3. evidence lineage resolving to governed observations;
4. a reproducible transformation/derivation contract;
5. semantic validation;
6. uncertainty and applicability state;
7. publication qualification; and
8. user-facing provenance when presented as factual.

Dynamic generation must never become a loophole around certification.

## Naming

Product names should describe the strongest defensible user-facing meaning of the product.

Contextual titles may include only runtime-supplied facts such as an actual period, entity, domain or other verified context.

Names must preserve epistemic state. For example, a prediction cannot be titled as a certainty, and a possible causal explanation cannot be presented as proven causation.

## Financial Life experience architecture

Priority 1 should expose a coherent journey rather than a collection of disconnected screens:

```text
Arrival
  ↓
Evidence Connection
  ↓
Evidence Formation
  ↓
First Understanding
  ↓
Ask
  ↓
Explore Relationships
  ↓
Understand Reasoning
  ↓
Compare Change
  ↓
Explore Scenarios
  ↓
Decide
  ↓
Observe Outcomes
  ↓
Learn
  ↓
Return
```

The current primary navigation expresses the core journey as:

`Life → Change → Understand → Verify → Reports → Scenario → Decide → Action → Outcome`

`Connect` is the evidence-building control surface.

The navigation is intentionally much smaller than the potential catalog. Reports, results, relationships, questions and evidence can expand deeply inside those surfaces without requiring a permanent top-level navigation entry for every possible product.

## Required report interactions

The Financial Life report experience should eventually support:

- browse the catalog;
- search the catalog;
- filter by family and output type;
- inspect product purpose and dependencies;
- see whether a product is defined, qualified, produced, certified, active or published;
- activate/deactivate products;
- inspect evidence limitations;
- inspect runtime lineage when available;
- move report → intelligence → evidence;
- move evidence → intelligence → eligible reports where exact mappings exist;
- discover related reports;
- ask IRIS about the current report/result;
- compare supported periods/entities;
- distinguish observed, calculated, inferred, predicted, hypothetical and unavailable information; and
- never substitute missing evidence with zero or fabricated values.

## Relationship to the Intelligence / Education side

Reports and user-specific results belong to Priority 1.

The Intelligence / Education side is Priority 2 and contains no user financial data or user-specific results.

The two surfaces remain connected through the same architecture. A Financial Life report may expose a user-specific reasoning explanation and evidence lineage; the educational Intelligence surface explains the general machinery without exposing that user's data.

## Current Sandbox boundary

The current executable provider evidence boundary contains seven domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments

Statements is the eighth architectural domain but is deferred until real banking. No report product may imply current Sandbox Statements evidence.

## Anti-fabrication rules

Never create a user report merely to fill a UI state.

Never use:

- fake balances;
- fake transactions;
- synthetic production observations;
- invented intelligence values;
- invented confidence/probability;
- catalog metadata as financial evidence;
- provider product availability as proof of observation;
- missing evidence represented as zero; or
- dependency availability as proof of semantic consumption.

When evidence is insufficient, the product remains visible as a defined/limited/unavailable product as appropriate, while its factual result remains absent.

## Certification boundary

The report product chain is:

`Definition → Evidence Qualification → Intelligence Execution → Semantic Lineage → Validation → Certification → Publication → User Interaction → Deployment → End-to-End Verification`

A later state never implies an earlier state.

## Current implementation interpretation

The existing persisted catalog is a **registered product-definition inventory**. Its count is a database observation, not a theoretical capacity and not a count of user-specific reports produced.

The next Financial Life work must therefore improve the product experience around the catalog while preserving the distinction between:

```text
what IRIS could offer
        vs.
what this user has evidence to receive
        vs.
what IRIS actually produced
        vs.
what has been certified
        vs.
what the user chose to see
```

That distinction is the foundation of a trustworthy, expandable IRIS user journey.