# IRIS Capability & Product Roadmap

This is the engineering-state roadmap for IRIS. It is a source-of-truth companion to the architecture, not a checklist of files and not a finite feature list.

> **Build the architecture first, then make the consumer experience an accurate expression of it.**

## 1. Product identity

IRIS is a **Relational Financial Intelligence Operating System**.

The person's financial life is the reality IRIS observes. The intelligence hierarchy is how IRIS understands that reality. The Financial Life / Results experience is how the user encounters what IRIS can validly derive from that reality. The Intelligence / Education experience explains the same reasoning machinery without user data.

These are two connected experiences over one system.

```text
financial reality
  ↓
provider observations
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
Financial Life journey

IRIS Intelligence / Education
  ↕
explains the same reasoning machinery without user data
```

## 2. Priorities

### Priority 1 — Financial Life / Results / User Journey

This is the primary consumer product and current implementation priority.

It includes, as evidence and runtime permit:

- arrival and orientation;
- evidence connection and formation;
- observed financial reality;
- canonical financial state;
- change and behavior;
- relationships and explanations;
- evidence and provenance;
- the report/analytics product catalog;
- user-specific intelligence results;
- comparisons;
- scenarios and counterfactuals;
- decisions and recommendations;
- action-oriented results;
- outcomes and learning;
- controls and activation/deactivation;
- search and exploration; and
- persistent IRIS assistance.

The catalog is a major product surface. It is not a fixed report count, fixed screen count, or substitute for the intelligence hierarchy.

### Priority 2 — IRIS Intelligence / Education

Read-only educational experience. No user financial data, user-specific balances, transactions, reports or intelligence results. It teaches hierarchy, graph structure, evidence states, lineage, recursive composition, uncertainty, causality, prediction, scenarios and higher-order intelligence.

Priority 2 does not reduce or cap the underlying intelligence architecture.

## 3. Eight architectural domains; seven current Sandbox domains

The eight authoritative domains are:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

The current executable/certifiable Sandbox boundary is **seven domains**:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments

Statements is Domain 8 architecturally but is deferred until real banking. It must not be requested, simulated, fabricated or presented as current Sandbox evidence.

## 4. Intelligence hierarchy contract

Level 1 is IRIS. Level 2 is the eight authoritative domains. Level 3 and beyond is recursively generated intelligence.

There is no artificial semantic depth ceiling. The intelligence structure is a graph, not a fixed tree. Nodes may have multiple upstream parents, cross domains, participate in temporal and semantic relationships, and become inputs to higher-order compositions.

Capability families/operators are internal composition machinery, not hierarchy levels and not a ceiling.

Arbitrary derived-intelligence graph nodes must support exact upstream identities, recursive ancestry, transformation identity, evidence binding, provenance, uncertainty/limitations and certification state. Persistence is not semantic proof.

## 5. Evidence-state contract

The following states remain distinct:

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

Epistemic states remain distinct:

```text
unknown
≠ unavailable
≠ unobserved
≠ hypothetical
≠ predicted
≠ inferred
≠ derived
≠ observed
```

Unknown is never silently converted to zero.

## 6. Non-fabrication and read-only boundaries

No production financial fact may be invented to make the interface look complete.

Never introduce fake balances, transactions, accounts, financial results, confidence values, outcomes or provider observations. Plaid Sandbox synthetic observations may be used only as controlled Sandbox testing and never as production truth.

Catalog definitions are not financial observations. A catalog definition may exist without Plaid user data.

Phase 1 remains read-only. Do not implement or imply ACH, RTP, FedNow, card movement, transfers, withdrawals, trades, deposits or other money movement.

## 7. Forward and reverse traversal

Forward:

```text
provider observation
→ source field
→ governed evidence
→ canonical state
→ interpretation/classification
→ temporal/statistical/relational/behavioral intelligence
→ patterns / baselines / anomalies
→ causal reasoning where supported
→ prediction
→ scenario / counterfactual
→ risk / opportunity
→ decision / recommendation
→ consequence
→ outcome
→ learning
→ cross-domain synthesis
→ higher-order intelligence
→ recursive composition
→ report/result
```

Reverse:

```text
report/result
→ headline intelligence
→ contributing intelligence nodes
→ transformations / relationships
→ canonical state
→ exact governed evidence
→ source-field observation
→ provider observation
```

Factual reverse edges require actual persisted lineage. Conceptual educational relationships must remain explicitly conceptual.

## 8. Financial Life user journey

The governing journey is:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare Change → Explore Scenarios → Decide → Observe Outcomes → Learn → Return`

The current primary navigation expresses the core journey as:

`Life → Change → Understand → Verify → Reports → Scenario → Decide → Action → Outcome`

`Connect` is the evidence-building control surface.

The UI should use progressive disclosure:

```text
human-readable meaning
  ↓
intelligence / reasoning
  ↓
evidence / provenance
```

The user must be able to move deeper without losing context and move backward from a result toward its reasoning and evidence whenever exact lineage exists.

## 9. Financial Life catalog contract

The **IRIS Report Product Catalog** is the user-facing publication inventory over the intelligence graph.

### Critical boundary

A catalog product can be defined and named without Plaid user data. That is valid and intentional.

But:

```text
catalog definition
≠ evidence
≠ intelligence result
≠ published user report
```

The current persisted catalog count is a database/runtime observation only. It must be queried rather than hardcoded and must never be described as the number of reports IRIS can ultimately produce.

### No conceptual ceiling

The catalog has no artificial maximum. Valid products can emerge from:

- new intelligence;
- new relationships;
- new temporal contexts;
- user questions;
- scenarios;
- verified outcomes;
- recursive compositions; and
- materially useful combinations of governed intelligence.

The runtime may constrain what can be materialized at a moment. That is an operational constraint, not a semantic ceiling.

### Product lifecycle

```text
Define
  ↓
Declare evidence/dependencies
  ↓
Qualify actual evidence boundary
  ↓
Execute governed intelligence
  ↓
Persist exact runtime and lineage
  ↓
Prove semantic transformation
  ↓
Validate / certify
  ↓
Publish qualified result
  ↓
User explores / asks / compares / acts
  ↓
Observe outcomes where supported
  ↓
Learn where independently qualified
```

A missing stage cannot be replaced with a fabricated value.

### Product states

Track independently where applicable:

- defined;
- available;
- evidence-qualified;
- intelligence-qualified;
- runtime-produced;
- certified;
- active;
- published;
- limited;
- unavailable; and
- deferred.

Do not collapse these states into one generic “working” flag.

### Product naming

Names must communicate the strongest defensible meaning while preserving epistemic state. Contextual titles may use only actual runtime-supplied period, entity, domain and other verified context.

Prediction cannot be titled as certainty. Possible causal explanation cannot be titled as proven causation. Insufficient evidence cannot be presented as a completed factual report.

## 10. Report experience requirements

The Priority 1 catalog should support:

- full catalog browsing;
- search;
- family and output-type filtering;
- product purpose and description;
- dependency inspection;
- evidence requirements;
- current product qualification state;
- runtime-produced state;
- certification state;
- activation/deactivation;
- related-product discovery;
- evidence limitations;
- runtime lineage;
- report → intelligence → evidence traversal;
- evidence → intelligence → eligible report traversal where exact mappings exist;
- question-driven report discovery;
- comparison where supported;
- contextual explanations; and
- persistent IRIS assistance.

A report definition must never be rendered as a user-specific financial result merely because it is present in the catalog.

## 11. User experience scale

Do not solve scale by creating a permanent top-level screen for every report or intelligence node.

A relatively small set of comprehensible primary navigation surfaces should open into a potentially enormous nested universe of:

- report families;
- individual products;
- dynamic products;
- user-specific report instances;
- questions;
- relationships;
- comparisons;
- evidence views;
- reasoning views;
- scenarios;
- decisions; and
- outcomes.

The number of navigation routes is therefore not the measure of IRIS intelligence or product capacity.

## 12. Persistent assistant

IRIS must be present throughout supported authenticated Financial Life pages.

Financial Life mode may use governed user-specific APIs and actual evidence/results. It must retain uncertainty, evidence state and provenance and must never invent financial facts.

Intelligence/Education mode is educational-only and must not load, query, display or infer user financial data.

## 13. Current implementation state

### Architecture and contracts — Defined

- [x] IRIS identity.
- [x] Priority 1 Financial Life / Results / User Journey.
- [x] Priority 2 Intelligence / Education.
- [x] One-system/two-surface boundary.
- [x] Eight authoritative domains.
- [x] Seven-domain current Sandbox boundary.
- [x] Statements deferred until real banking.
- [x] Unbounded recursive hierarchy.
- [x] Graph rather than fixed tree.
- [x] Evidence-state distinctions.
- [x] Anti-fabrication rules.
- [x] Forward/reverse traversal model.
- [x] Arbitrary derived-intelligence requirement.
- [x] Report/intelligence separation.
- [x] Report publication boundary.
- [x] Financial Life journey.
- [x] Catalog definition/result distinction.

### Consumer experience — Implemented, not certified

- [x] Unified authenticated IRIS shell.
- [x] Financial Life journey navigation.
- [x] Financial Life home/journey foundation.
- [x] Report catalog surface.
- [x] Report detail/exploration surface.
- [x] Catalog search/family/output filtering.
- [x] Report activation/deactivation controls.
- [x] Evidence and lineage presentation foundations.
- [x] Persistent Financial Life assistant foundation.
- [x] Separate educational Intelligence route.
- [x] Educational assistant mode without user-data calls.
- [ ] Independent verification of every supported authenticated route.
- [ ] Responsive visibility/interaction certification.
- [ ] Full Financial Life journey end-to-end certification against real provider evidence.
- [ ] Full report inventory runtime certification.
- [ ] User-specific report publication certification.

### Intelligence graph — Foundations implemented, not fully certified

- [x] Recursive graph architecture.
- [x] Execution-scoped runtime node identity.
- [x] Arbitrary derived-node persistence foundation.
- [x] Exact upstream node references.
- [x] Recursive ancestry metadata.
- [x] Cycle-safe bidirectional traversal foundation.
- [x] Execution/run/user boundary checks.
- [x] Root capability persistence for evidence-bound roots.
- [x] Fail-closed missing/cross-execution upstream references.
- [ ] Complete recursive semantic lineage certification.
- [ ] Exact input/output field lineage certification for every operator.
- [ ] Independent proof every persisted execution artifact was semantically consumed.
- [ ] Complete forward traversal certification across current domains.
- [ ] Complete reverse traversal certification across current domains.
- [ ] Cross-domain recursive composition certification.
- [ ] Higher-order recursive composition certification without artificial semantic depth limits.

### Provider/evidence — Seven-domain Sandbox target

- [x] Provider evidence model.
- [x] Exact user/run/execution evidence boundary model.
- [x] Seven-domain canonical Item selection.
- [x] Statements removed from Sandbox execution requirement.
- [x] Durable sync lease repair.
- [x] Transaction source-field lineage repair.
- [x] Numeric finiteness repair.
- [ ] Independent seven-domain runtime gate certification.
- [ ] Independent forward traversal certification for each current domain.
- [ ] Independent reverse traversal certification for each current domain.
- [ ] Evidence-to-intelligence semantic sufficiency certification.
- [ ] Real-banking Statements implementation/certification.

### Report product system — Foundations implemented, not certified

- [x] Intelligence/report boundary.
- [x] Report product definition library.
- [x] Catalog API boundary.
- [x] Search/family filtering.
- [x] Activation/deactivation persistence path.
- [x] Report detail surface.
- [x] Dependency-definition graph.
- [x] Runtime lineage resolver foundation.
- [x] Exact execution/run publication boundary.
- [x] Runtime headline binding requires persisted intelligence-node identity.
- [x] Evidence → intelligence → report reverse-lineage endpoint foundation.
- [x] Semantic dependency-consumption evaluator.
- [x] Exact report evidence-boundary evaluator.
- [x] Conjunctive report certification-gate foundation.
- [x] Authoritative run-bound evidence resolver.
- [x] Fail-closed runtime lineage validation.
- [ ] Persisted product catalog schema certification.
- [ ] Product-to-intelligence dependency certification.
- [ ] Semantic sufficiency certification for every report mapping.
- [ ] Dynamic report-name generation certification.
- [ ] Complete report → intelligence → evidence certification.
- [ ] Complete evidence → intelligence → report certification.
- [ ] Product publication certification.
- [ ] End-to-end product certification.
- [ ] Subscription entitlement runtime certification.
- [ ] User activation/deactivation end-to-end certification.

## 14. Priority 1 build program

The next Financial Life implementation must proceed in this order:

### P1 — Financial Life foundation

- [ ] Audit every currently reachable Financial Life route against the actual repository.
- [ ] Remove or quarantine legacy consumer surfaces that conflict with the IRIS identity/product boundary.
- [ ] Ensure every supported route has an explicit purpose and evidence boundary.
- [ ] Establish consistent loading, empty, limited, unavailable and error states.
- [ ] Ensure unknown values are never rendered as zero.
- [ ] Ensure every factual user value identifies its evidence state.
- [ ] Ensure the persistent assistant is present and correctly scoped.

### P2 — Financial Life orientation

- [ ] Make arrival clearly communicate what IRIS currently observes.
- [ ] Show actual observed account/evidence state without synthetic filler.
- [ ] Make missing evidence understandable rather than merely empty.
- [ ] Provide direct transitions from observed reality to change, understanding, evidence and reports.

### P3 — Change and understanding

- [ ] Connect What Changed to actual qualified intelligence outputs.
- [ ] Provide relationship-first exploration rather than isolated metrics.
- [ ] Make explanations distinguish observation, calculation, inference, prediction and hypothetical scenario.
- [ ] Provide exact backward traversal where lineage exists.

### P4 — Evidence

- [ ] Make evidence inspectable from every relevant result.
- [ ] Show provider/source boundary, freshness, observation state and lineage.
- [ ] Keep the seven-domain Sandbox boundary explicit.
- [ ] Keep Statements deferred until real banking.

### P5 — Report catalog

- [ ] Treat persisted catalog definitions as product inventory, not results.
- [ ] Surface product state dimensions independently.
- [ ] Improve catalog discovery and family navigation.
- [ ] Add related-product and question-driven discovery.
- [ ] Make dependencies/evidence requirements understandable to users.
- [ ] Surface runtime-produced/certified state only from actual governed runtime records.
- [ ] Prevent catalog definitions from appearing as produced reports.

### P6 — Dynamic product expansion

- [ ] Define runtime identity for valid dynamically composed report products.
- [ ] Bind dynamic products to exact intelligence-node identities.
- [ ] Resolve recursive ancestry and evidence lineage.
- [ ] Require semantic transformation proof.
- [ ] Preserve uncertainty/applicability/freshness.
- [ ] Publish only after applicable certification gates pass.
- [ ] Never create dynamic products as a workaround for missing evidence.

### P7 — Scenario / decision / outcome journey

- [ ] Connect scenario inputs to explicitly hypothetical state.
- [ ] Keep scenario output separate from observed history.
- [ ] Connect qualified scenarios to decisions without implying execution.
- [ ] Keep action surfaces read-only in Phase 1.
- [ ] Record outcomes only when actual outcomes can be observed/governed.
- [ ] Enable learning only after independent outcome evidence and lineage are established.

### P8 — Premium experience certification

- [ ] Full desktop interaction verification.
- [ ] Full mobile/responsive verification.
- [ ] Keyboard/focus/accessibility verification.
- [ ] Loading/error/empty/limited-state verification.
- [ ] Navigation continuity verification.
- [ ] Assistant placement and mode verification.
- [ ] Report drill-down and reverse traversal interaction verification.

## 15. Priority 2 Intelligence / Education program

- [x] Educational Intelligence surface foundation.
- [x] No user-specific result path in educational surface.
- [x] Educational assistant mode.
- [x] Eight-domain architecture explanation.
- [x] Seven-domain Sandbox boundary explanation.
- [x] Recursive graph/lineage/evidence concepts.
- [ ] Interactive Intelligence Library.
- [ ] Full educational graph traversal.
- [ ] Educational forward/reverse lineage visualization.
- [ ] Comprehensive operator/composition teaching surface.
- [ ] Independent user-data isolation certification across every supported route.
- [ ] Premium educational interaction certification.

## 16. Runtime gates

Each architectural domain has an explicit gate. Only seven are currently executable/certifiable in Sandbox.

### Authentication
Pass only when the authenticated principal and target user boundary are resolved and the runtime cannot substitute another user or Item.

### Transactions
Pass only when actual provider-derived transactions exist within the governed synchronization boundary, are traceable to exact source observations/fields, and are usable by the consuming operation.

### Balance
Pass only when actual provider-derived balance observations exist within the allowed freshness/time boundary and the exact observations used can be identified.

### Identity
Pass only when actual provider-derived identity observations exist, are authorized for the target user and can be traced to exact evidence.

### Assets
Pass only when actual provider-derived asset observations exist, are authorized and are semantically sufficient for the consuming operation.

### Liabilities
Pass only when actual provider-derived liability observations exist, are authorized and are semantically sufficient for the consuming operation.

### Investments
Pass only when actual provider-derived investment observations exist, are authorized and are semantically sufficient for the consuming operation.

### Statements
Architecturally defined but deferred. It is not a current Sandbox gate.

A domain gate passing does not prove downstream semantic consumption.

## 17. Certification chain

The governing chain is:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

Use these state names consistently:

- **Defined** — contract/architecture exists.
- **Implemented** — code/schema exists and integrates.
- **Independently Executable** — capability can be invoked under its governed boundary.
- **Evidence Verified** — actual provider-derived evidence was observed/persisted.
- **Lineage Verified** — exact semantic ancestry/evidence lineage is proven.
- **Certified** — applicable contract and gates passed independently.
- **Surfaced** — qualified/certified result is available in the intended user experience.
- **Deployed** — intended implementation is running in the target environment.
- **End-to-End Certified** — complete path was exercised and independently verified.

A green build, HTTP 200, database row, component, capability registration or test fixture is not certification.

## 18. Developer execution contract

Before every material implementation:

1. Read current source-of-truth documents.
2. Audit the actual repository state.
3. Audit live schema/runtime state when relevant.
4. Identify the exact contract being changed.
5. Verify dependency order.
6. Implement against actual current paths and names.
7. Run independent tests.
8. Verify evidence and lineage.
9. Verify the user-data boundary.
10. Verify frontend/backend/database synchronization.
11. Verify deployed commit/environment before claiming deployment.
12. Record the actual state here.

Never assume a previous description is still true after repository changes.

## 19. Current authoritative interpretation

The Financial Life / Results side is **Priority 1** and is now the active product-building focus.

The report catalog is a potentially enormous publication universe. Its current persisted definitions are product metadata and may be named before Plaid user data exists. They do not constitute user-specific reports.

The Intelligence / Education side remains **Priority 2**, read-only and user-data-free.

Both are one IRIS system. The user experience split exists so a person can separately experience:

1. **what IRIS can show and help them do with their financial life**, and
2. **how IRIS thinks and reasons about financial reality**.

Neither side has a conceptual ceiling.

## 20. Final governing principle

IRIS must never be built upside down.

The interface is not the architecture.

The report catalog is not the intelligence hierarchy.

The catalog count is not intelligence capacity.

A report definition is not a report result.

A provider product is not provider evidence.

A database row is not semantic proof.

A Sandbox observation is not production reality.

An educational explanation is not a user-specific result.

The Financial Life / Results / User Journey is **Priority 1**.

IRIS Intelligence / Education is **Priority 2**.

Both are expressions of **one connected IRIS system**.

The intelligence hierarchy and the Financial Life product universe remain semantically unbounded.