# IRIS

**IRIS is a Relational Financial Intelligence Operating System.**

IRIS is one connected system. The person's financial life is the reality IRIS observes; the intelligence hierarchy is how IRIS understands that reality; the Financial Life / Results experience is how IRIS exposes what it can validly know and derive; and the Intelligence / Education experience explains the reasoning machinery without user data.

## Product priorities

### Priority 1 — Financial Life / Results / User Journey

This is the primary consumer product. It is the user's journey through observed financial reality and the results IRIS can validly derive from it.

The journey is intentionally larger than a dashboard. It includes:

- arrival and financial-life orientation;
- evidence connection and evidence formation;
- observed financial state;
- change and behavioral understanding;
- explanations and relationships;
- evidence inspection and provenance;
- the report and analytics product library;
- user-specific intelligence results;
- comparisons;
- scenarios and counterfactuals;
- decisions and recommendations;
- action-oriented results;
- outcomes and learning;
- controls, activation/deactivation, search and exploration; and
- persistent IRIS assistance.

The report library is a product universe, not a fixed screen count or a promise that every defined product currently has a produced result.

### Priority 2 — IRIS Intelligence / Education

This is read-only education about how IRIS thinks. It contains no user financial data, no user-specific financial results, and no user-specific reports. It teaches the hierarchy, graph, evidence states, recursive composition, lineage, uncertainty, causality boundaries, prediction, scenarios, and higher-order reasoning.

The two experiences are not two products or two architectures. They are two user/data surfaces over the same governed system.

```text
financial reality
  ↓
provider observation
  ↓
governed evidence
  ↓
canonical financial state
  ↓
IRIS intelligence graph
  ↓
user-specific intelligence
  ↓
results / reports / scenarios / decisions / outcomes
  ↓
Financial Life user journey

IRIS Intelligence / Education
  ↕
explains the same reasoning machinery without user data
```

## Eight authoritative domains; seven current Sandbox domains

Architecturally, IRIS has eight authoritative financial-life evidence domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

The current executable/certifiable Sandbox boundary is **seven domains**: Authentication, Transactions, Balance, Identity, Assets, Liabilities, and Investments. **Statements is architecturally defined but deferred until real banking.** Statements must not be requested, simulated, fabricated, or presented as current Sandbox evidence.

## Intelligence hierarchy

Level 1 is IRIS. Level 2 is the eight authoritative domains. Level 3 and beyond is recursively generated intelligence.

There is no artificial semantic depth ceiling. The hierarchy is a graph rather than a fixed tree: nodes may have multiple parents, cross domains, depend on temporal relationships, and become inputs to further intelligence. Runtime/materialization budgets are operational constraints only and never define intelligence depth.

The finite capability registry is composition machinery, not the intelligence boundary. IRIS must support arbitrary derived-intelligence graph nodes with exact upstream identities, recursive ancestry, transformation identity, evidence binding, provenance, uncertainty and certification state. Persistence of a graph node is not semantic proof.

## Financial Life catalog

The **IRIS Report Product Catalog** is the user-facing publication inventory over the intelligence graph.

A catalog definition can exist before user-specific Plaid evidence exists. A catalog definition is therefore **not** a financial observation and **not** a produced report.

The current persisted catalog count is a runtime/database fact and must always be read from the governed catalog rather than hardcoded. The current count must never be interpreted as the number of reports IRIS can ultimately produce.

The catalog has no conceptual ceiling. Valid products may emerge from new intelligence, relationships, temporal contexts, user questions, scenarios, verified outcomes, recursive compositions, and materially useful combinations of existing intelligence.

Each product should retain, at minimum:

- stable product identity and version;
- human-readable name and purpose;
- product family;
- output type;
- declared evidence requirements;
- intelligence dependencies;
- publication/qualification state;
- user activation state; and
- runtime lineage when a real execution has produced the product.

### Definition versus result

These states must remain separate:

```text
catalog definition
≠ evidence availability
≠ user authorization
≠ intelligence execution
≠ intelligence result
≠ report publication
≠ user activation
≠ certification
```

A catalog product may be named and registered without Plaid user data. It may not be presented as a user-specific factual result without the required governed evidence and applicable intelligence/lineage validation.

A report screen is therefore a publication/exploration surface, not a source of financial truth.

### Report lifecycle

```text
Define product
  ↓
Declare evidence/dependencies
  ↓
Observe authorized provider evidence
  ↓
Build canonical state
  ↓
Execute governed intelligence
  ↓
Persist exact runtime/lineage
  ↓
Validate semantic transformation
  ↓
Qualify/certify
  ↓
Publish eligible report
  ↓
User explores / asks / compares / acts
  ↓
Observe outcome where supported
  ↓
Feed governed learning back into the connected system
```

No step may be skipped by filling the gap with invented values.

## Financial Life user journey

The primary journey is:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare Change → Explore Scenarios → Decide → Observe Outcomes → Learn → Return`

The current primary navigation expresses this as:

`Life → Change → Understand → Verify → Reports → Scenario → Decide → Action → Outcome`

Connect remains the evidence-building control surface. The user should be able to move forward from reality into results and backward from a result into reasoning and evidence whenever exact lineage exists.

Progressive disclosure is intentional:

```text
human meaning
  ↓
intelligence / reasoning
  ↓
evidence / provenance
```

The interface may become enormous through nested reports, relationships, drill-downs, questions, comparisons and dynamically qualified products without requiring an enormous permanent top-level navigation.

## Persistent IRIS assistance

IRIS is available throughout the supported Financial Life journey.

Financial Life mode may use governed user-specific IRIS APIs and actual evidence/results. It must preserve evidence state, uncertainty and provenance and must never manufacture a financial fact.

Intelligence/Education mode is educational-only and must not load, query, display or infer user financial data.

## Evidence and anti-fabrication boundary

IRIS must never create or present as financial truth:

- fake, seeded, manually invented or hardcoded financial observations;
- invented report results;
- invented confidence/probability values;
- catalog metadata represented as evidence;
- provider availability represented as user authorization or observation;
- missing evidence represented as zero; or
- a capability definition represented as a user-specific intelligence result.

The following are distinct:

```text
available
≠ consented
≠ authorized
≠ provider response received
≠ observation persisted
≠ evidence certified
≠ normalized
≠ intelligence-consumable
≠ intelligence consumed
```

And:

```text
unknown ≠ unavailable ≠ unobserved ≠ hypothetical ≠ predicted ≠ inferred ≠ derived ≠ observed
```

Persistence is not semantic proof. Dependency availability is not proof of dependency consumption. Prediction is not observation. Scenario is not observation. Correlation is not causation.

## Read-only boundary

Current IRIS scope is read-only. No ACH, RTP, FedNow, card movement, transfer, withdrawal, trade, deposit or other money movement is implied or implemented as part of the current intelligence product.

## Certification

A UI, endpoint, database row, capability registration, test fixture or successful build does not by itself certify IRIS.

The governing chain is:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies an earlier state is certified.

See `docs/ROADMAP.md`, `docs/IRIS_EXPERIENCE_BOUNDARY.md`, and `docs/IRIS_FINANCIAL_LIFE_CATALOG.md` for the current implementation contract.