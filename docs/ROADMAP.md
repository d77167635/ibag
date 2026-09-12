# IRIS Capability & Product Roadmap

This roadmap is the engineering source of truth for the IRIS build. It tracks **capability state and proof state**, not artifact count, page count, endpoint count, or a percentage-complete impression.

The roadmap exists specifically to prevent the build from drifting back into an upside-down order.

> **Corrected build priority:** build the complete Financial Life / Results / User Journey consumer experience first, while preserving the existing Intelligence/Education work as Priority #2. Both remain equal views of one recursive IRIS hierarchy/graph/system.

---

# 0. Authoritative correction — read this before every build block

## 0.1 IRIS is one system

IRIS is a **Relational Financial Intelligence Operating System**.

There are two primary user-facing experiences over the same governed system:

- **Priority #1 — Financial Life / Results / User Journey:** actual user-specific financial reality/state and the results IRIS can validly derive from it.
- **Priority #2 — IRIS Intelligence / Education:** the educational explanation of the same intelligence machinery without user-specific financial data for now.

They are not two products.

They are not two architectures.

They are not two separate intelligence systems.

They are not a Financial Life side + Intelligence side + a third Journey layer.

The journey is the user's movement through the Financial Life/results experience. It is not the Financial Life itself and it is not a third architectural component.

## 0.2 Financial Life is actual user reality/state/results

Financial Life means the actual user-specific financial reality/state that IRIS is permitted to observe and derive from governed evidence.

It includes, when evidence supports them:

- accounts;
- transactions;
- balances;
- identity;
- assets;
- liabilities;
- investments;
- statements;
- income;
- cash flow;
- spending;
- merchants/domains/categories/entities;
- recurring activity;
- obligations;
- debt;
- temporal state;
- changes;
- relationships;
- user-specific intelligence;
- reports;
- analytics;
- comparisons;
- scenarios;
- decisions;
- actions within the permitted phase boundary;
- outcomes;
- learning; and
- education/empowerment grounded in the actual state.

Navigation labels such as `Life`, `Change`, `Understand`, `Verify`, `Reports`, `Scenario`, `Decide`, `Action` and `Outcome` describe **experience/journey destinations**. They are not substitutes for the underlying Financial Life state.

## 0.3 Intelligence is how IRIS understands Financial Life

The Intelligence Hierarchy is the graph of reasoning, transformations, relationships, dependencies and derived intelligence through which IRIS understands governed Financial Life evidence/state.

It must explain not only **what** result IRIS produced but **how** the hierarchy produced it.

## 0.4 The two-way contract

Forward:

```text
provider observation
→ governed evidence
→ canonical Financial Life State
→ relational/temporal/statistical/behavioral intelligence
→ recursive intelligence
→ qualified report/result
→ Financial Life user experience
```

Reverse:

```text
Financial Life result/report
→ producing intelligence
→ upstream intelligence/dependencies
→ canonical state
→ exact governed evidence
→ source-field observation
→ provider observation
```

Both directions are required. Exact factual reverse traversal requires exact persisted lineage.

---

# 1. Governing execution and certification chain

Every capability is tracked through the following chain:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies an earlier state is certified.

A file, table, endpoint, component, route, successful build or persisted row is not certification.

Certification requires the corresponding proof.

---

# 2. Build-order reset

The previous visible build became too heavily weighted toward the Intelligence/Education side before the Financial Life/user-data side was complete.

That is the specific sequencing error this roadmap corrects.

## 2.1 New consumer build priority

### Priority #1 — Financial Life / Results / User Journey

Build the complete user-specific experience first:

1. consistent IRIS shell;
2. correct navigation;
3. actual Financial Life state surfaces;
4. evidence states;
5. all supported domain surfaces;
6. reports and analytics;
7. explanations and relationships;
8. questions and exploration;
9. comparisons;
10. scenarios;
11. decisions;
12. actions within the read-only boundary;
13. outcomes;
14. learning;
15. education and empowerment;
16. controls;
17. exact forward/reverse traversal;
18. complete user journey verification.

### Priority #2 — IRIS Intelligence / Education

Continue improving the Intelligence/Education side after the Priority #1 foundation is corrected and built.

It remains fully recursive and semantically unbounded. Priority #2 is a UI/data-boundary priority, not an intelligence-depth limitation.

## 2.2 Dependency rule

“Priority #1” does **not** mean bypassing architecture dependencies.

Financial Life surfaces must still be built on correct contracts and governed state boundaries.

The corrected sequence means we are no longer spending the primary consumer-build effort polishing the educational intelligence surface while the actual user Financial Life experience remains incomplete.

---

# 3. Non-negotiable architecture

## 3.1 One IRIS graph

```text
                         IRIS
                          │
                governed hierarchy/graph
                          │
          ┌───────────────┴───────────────┐
          │                               │
 Financial Life / Results        Intelligence / Education
      Priority #1                     Priority #2
          │                               │
 user-specific reality/results     educational reasoning
          │                               │
 reports / analytics               hierarchy / graph
 relationships                     lineage
 changes                           recursion
 questions                         uncertainty
 scenarios                         evidence concepts
 decisions                         causality boundaries
 outcomes                          higher-order composition
          │                               │
          └──────────── same IRIS ────────┘
```

## 3.2 Eight authoritative domains

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

## 3.3 Current executable/certifiable Sandbox boundary

The current Sandbox boundary is seven domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments

Statements is architecturally Domain 8 but is deferred until real banking.

Statements must not be requested, simulated, fabricated, displayed as observed, or used as a current Sandbox evidence requirement.

## 3.4 Recursive intelligence

Level 1 = IRIS.

Level 2 = the eight authoritative domains.

Level 3 onward = recursively generated intelligence.

The intelligence hierarchy is a graph, not a fixed tree.

There is no artificial semantic depth ceiling.

Capability families/operators are composition machinery, not hierarchy levels.

Arbitrary derived-intelligence nodes must support:

- exact upstream node identity;
- recursive ancestry;
- transformation identity;
- evidence binding;
- provenance;
- uncertainty/limitations;
- execution/run boundary;
- user boundary; and
- certification state.

Persistence is not semantic proof.

---

# 4. Evidence-state contract

These states must remain separate everywhere:

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

Epistemic states must remain separate:

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

Unknown is never zero.

No evidence means no factual value.

No observation means no fabricated observation.

Prediction is not observation.

Scenario is not observation.

Correlation is not causation.

Persistence is not semantic proof.

Dependency readability is not proof of semantic consumption.

---

# 5. Products versus Reports — mandatory distinction

This is a permanent architectural rule.

## 5.1 Provider products

A provider product is a source capability that can potentially contribute observations/evidence.

Its lifecycle can include:

```text
provider product universe
→ catalog
→ capability
→ availability
→ institution support
→ consent
→ authorization
→ plan entitlement
→ commercial cost
→ provider response
→ persisted observation
```

## 5.2 IRIS Report Products

An IRIS Report Product is a user-facing publication definition over the IRIS intelligence graph.

A report product may depend on:

- multiple provider products;
- multiple evidence domains;
- multiple intelligence nodes;
- temporal relationships;
- recursive dependencies;
- scenarios;
- verified outcomes; and
- higher-order compositions.

Therefore:

```text
Provider Product count ≠ Report Product count
Report Product count ≠ produced result count
produced result count ≠ certified result count
```

The UI must never manufacture matching counts.

Each count must come from its own governed runtime/catalog source.

---

# 6. Priority #1 — Financial Life build program

This is the active build program until its gates are complete.

## P1.0 — Full UI/route audit and identity correction

- [ ] Audit every reachable Financial Life route against the current repository.
- [ ] Inventory every screen, route, modal, drawer, tab, button, link and interactive control.
- [ ] Identify every stale/legacy product term.
- [ ] Remove incorrect legacy product identity from user-facing surfaces.
- [ ] Correct all incorrect terminology, including any remaining `cognity`/legacy terminology if present in the actual source.
- [ ] Ensure IRIS is the only current user-facing product identity.
- [ ] Confirm every screen has an explicit architectural purpose.
- [ ] Remove or quarantine surfaces that contradict the one-system IRIS architecture.
- [ ] Ensure no screen invents financial facts to make itself appear complete.

## P1.1 — Visual system normalization

- [ ] Establish one authoritative visual grammar.
- [ ] Normalize typography.
- [ ] Normalize spacing.
- [ ] Normalize containers/cards/panels.
- [ ] Normalize headings and hierarchy.
- [ ] Normalize buttons and button states.
- [ ] Normalize inputs and controls.
- [ ] Normalize badges/status indicators.
- [ ] Normalize loading states.
- [ ] Normalize empty states.
- [ ] Normalize insufficient-evidence states.
- [ ] Normalize unavailable/deferred states.
- [ ] Normalize error/retry states.
- [ ] Normalize responsive behavior.
- [ ] Remove screen-specific styling that contradicts the system unless explicitly justified by the experience contract.
- [ ] Independently verify visual consistency across all supported screens.

## P1.2 — Interaction correctness

- [ ] Inventory all interactive controls.
- [ ] Ensure every user-facing button has a real supported behavior.
- [ ] Ensure navigation controls route to real supported destinations.
- [ ] Ensure disabled controls explain why they are disabled where appropriate.
- [ ] Ensure unsupported actions do not appear executable.
- [ ] Ensure retry controls invoke the correct retry behavior.
- [ ] Ensure activation/deactivation controls persist only where their contracts permit.
- [ ] Ensure search/filter controls actually filter the governed source.
- [ ] Ensure modal/drawer close behavior is correct.
- [ ] Ensure back/return behavior preserves context.
- [ ] Verify keyboard/accessibility interaction.
- [ ] Verify mobile interaction.
- [ ] Verify desktop interaction.

## P1.3 — Financial Life shell and journey

Build the user journey as one coherent experience:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare → Change → Explore → Scenarios → Decide → Action → Observe Outcomes → Learn → Return`

The primary navigation may expose a concise set of destinations such as:

`Life → Change → Understand → Verify → Reports → Scenario → Decide → Action → Outcome`

These labels are journey destinations, not substitutes for Financial Life state.

- [ ] Arrival/orientation.
- [ ] Financial Life state overview.
- [ ] Evidence connection.
- [ ] Evidence formation status.
- [ ] First-understanding experience.
- [ ] Ask.
- [ ] Explore relationships.
- [ ] Understand reasoning.
- [ ] Compare.
- [ ] Change.
- [ ] Explore.
- [ ] Scenarios.
- [ ] Decide.
- [ ] Action planning within the read-only boundary.
- [ ] Outcome observation where supported.
- [ ] Learning where independently qualified.
- [ ] Return/context preservation.

## P1.4 — Eight-domain Financial Life surfaces

Each domain must have an explicit state model and must never imply evidence that has not been observed/certified.

### Authentication

- [ ] User identity/authentication state.
- [ ] Connection authorization state.
- [ ] Evidence boundary state.
- [ ] Forward/reverse lineage entry points.
- [ ] Runtime gate.

### Transactions

- [ ] Transaction observation surface.
- [ ] Transaction semantics.
- [ ] Direction/economic role.
- [ ] Classification.
- [ ] Merchant/domain/category/entity relationships.
- [ ] Temporal relationships.
- [ ] Change/trend surfaces.
- [ ] Evidence inspection.
- [ ] Runtime gate.

### Balance

- [ ] Balance observation/state.
- [ ] Temporal balance context.
- [ ] Account relationship.
- [ ] Liquidity relationships where supported.
- [ ] Evidence inspection.
- [ ] Runtime gate.

### Identity

- [ ] Observed identity state.
- [ ] Identity evidence/provenance.
- [ ] Cross-domain relationships where supported.
- [ ] Runtime gate.

### Assets

- [ ] Observed asset state.
- [ ] Asset relationships.
- [ ] Evidence/coverage state.
- [ ] Runtime gate.

### Liabilities

- [ ] Observed liability state.
- [ ] Debt relationships.
- [ ] Obligation relationships.
- [ ] Evidence/coverage state.
- [ ] Runtime gate.

### Investments

- [ ] Observed investment state.
- [ ] Investment relationships.
- [ ] Evidence/coverage state.
- [ ] Runtime gate.

### Statements

- [ ] Architectural surface exists.
- [ ] Deferred state is explicit.
- [ ] No Sandbox request.
- [ ] No simulated statement evidence.
- [ ] No fabricated statement display.
- [ ] Real-banking implementation remains a future gate.

## P1.5 — Financial Life state model

- [ ] Canonical account semantics across supported domains.
- [ ] Canonical transaction semantics.
- [ ] Classification/economic semantics.
- [ ] Temporal state.
- [ ] Observation span/activity density.
- [ ] Economic flow state.
- [ ] Unknown/insufficient-evidence semantics.
- [ ] Merchant/domain concentration/topology.
- [ ] Evidence-gated income.
- [ ] Recurring activity.
- [ ] Obligation candidates distinct from verified obligations.
- [ ] Verified obligations where evidence supports them.
- [ ] Liability/debt state.
- [ ] Asset/investment state.
- [ ] Historical provider lifecycle.
- [ ] Field-level evidence lineage.
- [ ] Freshness state.
- [ ] Cross-domain relational state.
- [ ] Exact state-to-intelligence bindings.

## P1.6 — Reports and analytics

Reports belong to the Financial Life / Results side.

- [ ] Complete report product catalog surface.
- [ ] Distinct product/report data models.
- [ ] Runtime-driven product counts.
- [ ] Runtime-driven report counts.
- [ ] Search.
- [ ] Family filtering.
- [ ] Output-type filtering.
- [ ] Product purpose/description.
- [ ] Evidence requirements.
- [ ] Intelligence dependencies.
- [ ] Qualification state.
- [ ] Runtime-produced state.
- [ ] Certification state.
- [ ] Activation/deactivation.
- [ ] Related reports.
- [ ] Evidence limitations.
- [ ] Report → intelligence → evidence traversal.
- [ ] Evidence → intelligence → eligible report traversal.
- [ ] Question-driven report discovery.
- [ ] Comparison where supported.
- [ ] Contextual explanations.
- [ ] Persistent Financial Life assistance.

## P1.7 — Questions, relationships and exploration

- [ ] Question-driven exploration.
- [ ] Relationship explorer.
- [ ] Entity/subdomain/domain traversal.
- [ ] Temporal traversal.
- [ ] Cross-domain traversal.
- [ ] Change explanations.
- [ ] Intelligence explanation.
- [ ] Evidence inspection.
- [ ] Context-preserving backtracking.
- [ ] Forward traversal.
- [ ] Reverse traversal.

## P1.8 — Scenario, decision, action, outcome and learning

Only expose each capability when its evidence and execution gates support it.

- [ ] Scenario workspace.
- [ ] Counterfactual distinction from observation.
- [ ] Constraint-aware decision support.
- [ ] Recommendation boundaries.
- [ ] Action planning that remains read-only.
- [ ] Outcome observation model.
- [ ] Verified outcome learning boundary.
- [ ] Cross-domain consequence analysis.
- [ ] Higher-order learning where evidence supports it.

---

# 7. Priority #1 report publication contract

A report definition is not a report result.

Required states remain independent:

```text
defined
available
insufficient evidence
unavailable
historical
not applicable
not yet implemented
evidence-qualified
intelligence-qualified
runtime-produced
certified
active
published
deferred
```

Required lifecycle:

```text
Define
→ declare evidence/dependencies
→ qualify evidence boundary
→ execute intelligence
→ persist exact runtime
→ persist exact lineage
→ prove semantic transformation
→ validate
→ certify
→ publish
→ user explores
→ observe outcomes where supported
→ learn where independently qualified
```

No missing stage may be replaced by invented values.

---

# 8. Priority #1 forward/reverse certification

## Forward certification

For every current domain, prove:

```text
provider observation
→ source field
→ governed evidence
→ canonical state
→ intelligence input
→ intelligence execution
→ derived node
→ report/result
```

The proof must identify the exact evidence/run boundary and exact derived-node identity.

## Reverse certification

For every published user-specific result, prove:

```text
report/result
→ exact intelligence node
→ exact upstream dependencies
→ exact canonical state
→ exact evidence
→ exact source-field observation
→ provider observation
```

If an exact edge cannot be proven, the UI must not imply that factual lineage exists.

---

# 9. Priority #2 — Intelligence / Education hardening

This is the second consumer-build priority, not a reduction in architecture.

- [ ] Verify Intelligence/Education never loads user financial data.
- [ ] Verify Intelligence/Education never calls user-specific financial endpoints.
- [ ] Verify educational examples are clearly conceptual and never presented as user observations.
- [ ] Complete hierarchy/domain/subdomain/entity traversal.
- [ ] Complete graph traversal.
- [ ] Complete conceptual forward reasoning traversal.
- [ ] Complete conceptual reverse lineage explanation.
- [ ] Explain evidence-state distinctions.
- [ ] Explain uncertainty/epistemology.
- [ ] Explain causality boundaries.
- [ ] Explain prediction boundaries.
- [ ] Explain scenario boundaries.
- [ ] Explain recursive composition.
- [ ] Explain higher-order intelligence.
- [ ] Explain certification states.
- [ ] Improve educational assistant behavior.
- [ ] Preserve equal exploratory depth with Financial Life.

Priority #2 must remain connected to the same architectural graph while maintaining the user-data boundary.

---

# 10. Recursive intelligence execution

Existing recursive foundations are retained, but no foundation is automatically certified.

- [ ] Governed aggregate execution boundary.
- [ ] Persist execution-scoped node identity.
- [ ] Persist exact upstream node references.
- [ ] Persist recursive ancestry.
- [ ] Enforce user/run/execution boundaries.
- [ ] Fail closed on missing upstream nodes.
- [ ] Fail closed on cross-execution upstream references.
- [ ] Persist transformation identity.
- [ ] Persist input/output field lineage.
- [ ] Persist exact evidence binding.
- [ ] Prove semantic dependency consumption.
- [ ] Prove output semantic sufficiency.
- [ ] Verify every persisted execution artifact.
- [ ] Verify independent execution.
- [ ] Verify queryable certified result.
- [ ] Certify recursive dependency composition.
- [ ] Certify cross-domain recursive composition.
- [ ] Certify arbitrary derived-node persistence beyond finite registry assumptions.
- [ ] Certify recursive traversal without artificial semantic depth ceiling.

---

# 11. Provider/Plaid architecture

Plaid remains a provider/source capability layer, not the Financial Life itself and not the intelligence product.

The provider capability chain is:

```text
Plaid Product Universe
→ Product Catalog
→ Capability Matrix
→ Availability
→ Institution Support
→ Consent
→ Authorization
→ Plan Entitlement
→ Commercial Cost
→ Evidence
→ Canonical Financial Life State
→ Intelligence
```

IRIS should determine which provider capabilities are useful based on evidence needs and intelligence needs, subject to the user's subscribed plan and actual availability.

The user should not have to become a provider-product architect.

If required evidence is unavailable, IRIS must say that it cannot currently evaluate the corresponding aspect. It must never pretend the evidence exists.

---

# 12. Plaid connection gate — DO NOT CROSS EARLY

**Real Plaid connection is not the current build accelerator. It is a later verification gate.**

Before connecting Plaid to the consumer experience, all pre-Plaid gates below must pass:

- [ ] All supported Financial Life screens have consistent appearance.
- [ ] All supported navigation works.
- [ ] All supported buttons/controls work.
- [ ] All visible terminology is correct.
- [ ] No stale/legacy product identity remains in supported user-facing surfaces.
- [ ] Products and Reports are separate.
- [ ] Product count is runtime-sourced.
- [ ] Report count is runtime-sourced.
- [ ] No fabricated financial numbers are present.
- [ ] Empty/insufficient evidence states are correct.
- [ ] Unavailable/deferred states are correct.
- [ ] Connection ≠ observation.
- [ ] Observation ≠ certification.
- [ ] All supported Financial Life routes have explicit evidence boundaries.
- [ ] Financial Life forward traversal is structurally complete.
- [ ] Financial Life reverse traversal is structurally complete.
- [ ] Intelligence/Education data boundary is enforced.
- [ ] Build/test passes.
- [ ] UI interaction verification passes.

Only after these gates are satisfied should real provider evidence become the next verification step.

---

# 13. Eight runtime gates

Each authoritative domain requires an independent gate.

A domain passes only when all applicable stages can be proven:

```text
1. domain capability is defined
2. required provider capability is available
3. user consent/authorization is valid
4. provider response is actually received
5. observation is persisted
6. exact evidence boundary is established
7. canonical state is produced from that evidence
8. intelligence consumption is semantically proven
9. forward lineage is proven
10. reverse lineage is proven
11. user-facing result is correctly state-labeled
```

One domain passing never implies another domain passed.

Statements remains architecturally defined but outside the current Sandbox gate.

---

# 14. UI state contract

Every Financial Life surface must distinguish, as applicable:

- loading;
- no connection;
- connection requested;
- connection authorized;
- provider response pending;
- evidence incomplete;
- evidence persisted;
- evidence certified;
- insufficient evidence;
- unavailable;
- historical;
- not applicable;
- not yet implemented;
- runtime-produced;
- certified;
- active;
- disabled; and
- error/retry.

Never use a single generic “working” state.

Never use zero as a substitute for unknown.

Never display a factual result solely because a report definition exists.

---

# 15. UI consistency and interaction certification

This is a hard gate, not polish.

- [ ] Screen-by-screen visual audit.
- [ ] Screen-by-screen semantic audit.
- [ ] Screen-by-screen interaction audit.
- [ ] Screen-by-screen responsive audit.
- [ ] Screen-by-screen accessibility audit.
- [ ] Button inventory complete.
- [ ] Button behavior verification complete.
- [ ] Navigation inventory complete.
- [ ] Navigation behavior verification complete.
- [ ] Modal/drawer behavior verification complete.
- [ ] Search/filter behavior verification complete.
- [ ] Form validation behavior verification complete.
- [ ] Retry behavior verification complete.
- [ ] Activation/deactivation verification complete.
- [ ] Context-preserving back behavior verification complete.
- [ ] Product/report count verification complete.
- [ ] Empty/unknown/insufficient evidence verification complete.

A screen is complete only after behavior is verified, not merely after visual rendering.

---

# 16. Verification and clean release

- [ ] Backend/frontend contract synchronization.
- [ ] Provider → database reconciliation.
- [ ] Evidence lineage verification.
- [ ] RLS/ownership/security verification.
- [ ] Durable sync cursor/update/remove lifecycle verification.
- [ ] Durable webhook verification/retry verification.
- [ ] Round-Up feature certification.
- [ ] Intelligence sufficiency/accuracy regression suite.
- [ ] Supabase migration/runtime reconciliation with repository history.
- [ ] Seven-domain Sandbox end-to-end verification.
- [ ] Real-banking Statements implementation when that phase begins.
- [ ] Full observable Financial Life user-journey certification.
- [ ] Full report-product certification.
- [ ] Bidirectional report/intelligence/evidence certification.
- [ ] Deployment verification.
- [ ] End-to-end certification.

---

# 17. Current implementation interpretation

The repository contains substantial existing foundations across evidence, canonical state, recursive intelligence, feature/product contracts and frontend surfaces.

Those foundations are **not discarded** merely because the consumer build priority is being corrected.

They are treated as reusable infrastructure that must now be reconciled with the corrected Financial Life-first experience.

The following interpretation is mandatory:

- Existing intelligence foundations remain.
- Existing recursive graph foundations remain.
- Existing evidence foundations remain.
- Existing report/product foundations remain where they conform to the corrected separation.
- Existing UI is not assumed correct merely because it exists.
- Existing route/component count is not completion.
- Existing capability registration is not certification.
- Existing catalog count is not report-result count.
- Existing Intelligence/Education UI is not the Priority #1 consumer experience.
- Existing implementation claims must be re-audited against this roadmap before being marked certified.

---

# 18. No-fake-data rule

Never add:

- fake balances;
- fake accounts;
- fake transactions;
- fake income;
- fake liabilities;
- fake investments;
- fake reports;
- fake intelligence results;
- fake confidence/probability values;
- fake outcomes;
- seeded production observations;
- hardcoded financial values presented as user data; or
- placeholder values that could be mistaken for actual financial truth.

Controlled Plaid Sandbox synthetic records are acceptable only for Sandbox testing and never as production truth.

When evidence is absent, use a truthful state such as insufficient evidence, unavailable, not observed, not applicable, historical, or not yet implemented as appropriate.

---

# 19. Completion definition

IRIS is complete only when the implemented system can continuously transform governed provider evidence into:

- an accurate canonical Financial Life State;
- explainable intelligence;
- recursively composable intelligence without an artificial semantic depth ceiling;
- exact forward and reverse lineage;
- user-controllable report products;
- user-specific results where evidence supports them;
- a complete Financial Life user journey;
- education and empowerment;
- scenarios;
- decisions;
- actions within the permitted boundary;
- observed outcomes;
- independently qualified learning; and
- higher-order intelligence.

The Intelligence/Education experience must simultaneously provide an equally deep conceptual view of the same reasoning machinery without crossing into user-specific financial data.

Completion is therefore not a finite number of screens, products, reports, capabilities, nodes or endpoints.

Completion means the architecture, evidence, runtime, lineage, user controls, interaction, deployment and end-to-end behavior are all proven at the applicable boundaries.

---

# 20. Final build rule

**Build continuously. Audit continuously. Do not stop for cosmetic milestones. Do not skip dependencies. Do not manufacture evidence. Do not certify unproven work.**

The immediate direction is:

```text
CORRECT THE CONSUMER ORDER
        ↓
FINANCIAL LIFE / RESULTS / USER JOURNEY
        ↓
actual user state + complete journey
        ↓
reports + analytics + relationships + explanations
        ↓
forward/reverse lineage
        ↓
pre-Plaid UI/interaction certification
        ↓
REAL PROVIDER EVIDENCE
        ↓
independent domain gates
        ↓
qualified user-specific intelligence/results
        ↓
HARDEN INTELLIGENCE / EDUCATION
        ↓
recursive bidirectional certification
        ↓
scenarios → decisions → outcomes → learning
        ↓
higher-order recursive intelligence
        ↓
END-TO-END CERTIFICATION
```

The graph remains unbounded. The consumer build priority does not change that.
