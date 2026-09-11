# IRIS Capability & Product Roadmap

This roadmap is the implementation roadmap and engineering-state companion to the IRIS architecture. It is not a paraphrase of product intent and it is not a checklist of files. It defines what must be built, what must remain separated, what evidence is required, and what must be proven before a capability can be treated as complete.

The governing rule is simple:

> **Build the architecture first, then make the consumer experience an accurate expression of it. Never make the interface the source of truth for the architecture.**

---

## 1. Product identity

IRIS is a **Relational Financial Intelligence Operating System**.

IRIS is not a Plaid dashboard, a fixed collection of financial widgets, a finite capability registry, or a single “maximum intelligence” screen.

The person's financial life is the reality IRIS observes. The intelligence hierarchy is how IRIS understands that reality. Reports and results are the user-facing expression of what IRIS can validly derive from that observed reality.

These are different concerns, but they are one connected system.

The core relationship is:

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
user-specific intelligence/results
      ↓
reports / analytics / explanations / scenarios / decisions
      ↓
user journey
```

Reverse traversal must also be possible wherever the required records exist:

```text
result / report / decision
      ↓
intelligence node(s)
      ↓
relationships / transformations / reasoning
      ↓
canonical state
      ↓
governed evidence
      ↓
provider observation / source field
```

A UI split does not create two architectures.

---

## 2. Product priorities

### Priority 1 — Financial Life / Results / User Journey

This is the primary consumer product and the first implementation priority.

It is the user's journey through their observed financial reality and the results IRIS can validly derive from it.

It includes, as evidence permits:

- financial-life home;
- observed reality and canonical state;
- changes and behavioral understanding;
- evidence inspection;
- the report and analytics inventory;
- user-specific intelligence results;
- explanations and education about those results;
- relationships and reasoning;
- comparisons;
- scenarios and counterfactuals;
- decisions and recommendations;
- actions and consequences;
- outcomes and learning;
- controls and activation/deactivation;
- search, exploration, and question-specific experiences; and
- persistent IRIS assistance.

The report inventory is a major product surface. It is not a finite list and it must not be reduced to the currently implemented catalog.

### Priority 2 — IRIS Intelligence / Education

This is a read-only educational experience for learning **how IRIS thinks**.

It contains:

- no user financial data;
- no user-specific balances;
- no user-specific transactions;
- no user-specific intelligence results;
- no user-specific reports; and
- no user-specific financial inference.

It explains the intelligence architecture, including:

- the hierarchy;
- graph structure;
- authoritative domains;
- evidence states;
- lineage;
- recursive composition;
- uncertainty;
- interpretation;
- causality boundaries;
- prediction boundaries;
- scenario/counterfactual boundaries;
- cross-domain synthesis; and
- higher-order intelligence.

Priority 2 does **not** cap or simplify the underlying intelligence architecture. It only defines the user-data boundary and purpose of this experience.

---

## 3. Two experiences, one system

The experiences are separated by **purpose and user-data boundary**, not by architecture.

```text
                    ONE IRIS SYSTEM
                         │
             ┌───────────┴───────────┐
             │                       │
      FINANCIAL LIFE             INTELLIGENCE
        PRIORITY 1                PRIORITY 2
             │                       │
      user-specific data       no user data
      user-specific results    educational only
      reports / journey        hierarchy / reasoning
             │                       │
             └───────────┬───────────┘
                         │
                shared architecture
                shared graph model
                shared semantic rules
                shared integrity rules
```

### Financial Life boundary

User-specific data may be read only through governed runtime paths and only where the evidence boundary permits it.

### Intelligence boundary

The educational surface must not call user-data or user-intelligence endpoints merely to make the educational experience appear richer.

The intelligence side is intentionally read-only and educational for the current product boundary.

### Report boundary

Reports belong to the Financial Life / Results experience. They are user-facing publications generated from qualified intelligence. Report definitions may reference intelligence definitions, but a report is not itself an intelligence-hierarchy level.

---

## 4. Intelligence hierarchy contract

### Level 1

`IRIS`

### Level 2 — eight authoritative domains

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

These eight domains are architectural authorities. They are not eight interchangeable UI tabs and they are not a statement that all eight are currently executable in Sandbox.

### Level 3+

Level 3 onward is recursively generated intelligence.

There is **no artificial semantic maximum depth**.

The hierarchy is a graph, not merely a tree. A node may have multiple upstream parents and may participate in:

- cross-domain relationships;
- temporal relationships;
- dependency relationships;
- derivation relationships;
- evidence relationships;
- transformation relationships;
- recursive ancestry; and
- reverse lineage.

Capability families and operators are implementation machinery. They are not hierarchy levels and must never be used as an artificial ceiling on intelligence.

Runtime/materialization budgets are operational constraints only. They must never be interpreted as a semantic depth ceiling.

---

## 5. Current Sandbox/runtime boundary

The architectural model has eight authoritative domains.

The **current executable and certifiable Sandbox boundary is seven domains**:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments

**Statements is Domain 8 architecturally but is deferred until real banking.**

Therefore:

- Statements must not be requested as a current Sandbox requirement.
- Statements must not be simulated.
- Statements must not be fabricated.
- Statements must not be displayed as observed Sandbox evidence.
- Statements must not be used to falsely claim eight-domain Sandbox certification.

This is a runtime boundary, not a reduction of the eight-domain architecture.

---

## 6. Evidence-state model

The following states are distinct and must never be collapsed:

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

Additional epistemic states must remain distinct:

```text
unknown
unavailable
unobserved
hypothetical
predicted
inferred
derived
observed
```

**Unknown is not zero.**

The absence of evidence must not be represented as a factual zero or a fabricated observation.

---

## 7. Non-negotiable integrity rules

Every implementation must preserve these invariants:

- No evidence → no factual value.
- No observation → no fabricated observation.
- Unknown ≠ zero.
- Persistence ≠ semantic proof.
- Dependency read ≠ semantic sufficiency.
- Prediction ≠ observation.
- Scenario ≠ observation.
- Correlation ≠ causation.
- Capability existence ≠ intelligence-result existence.
- Provider availability ≠ user authorization.
- User authorization ≠ provider response.
- Provider response ≠ persisted observation.
- Persisted observation ≠ certified evidence.
- Certified evidence ≠ intelligence consumption.
- Intelligence consumption ≠ user publication.
- Semantic depth ≠ fixed hierarchy level count.

No frontend state, report template, database row, capability registration, or API response may be used as a substitute for missing semantic proof.

---

## 8. No-fabrication boundary

IRIS must never manufacture financial reality in order to make a screen, report, test, or intelligence result look complete.

Production financial facts must originate from governed provider-derived evidence or from explicitly governed derived intelligence whose lineage resolves to such evidence.

Plaid Sandbox synthetic records may be used for controlled Sandbox testing. They are test observations, not production truth.

Do not introduce:

- fake balances;
- fake transactions;
- fake account activity;
- fake intelligence results;
- fake outcomes;
- fake confidence values;
- hardcoded financial examples presented as live data; or
- placeholder numbers presented as observed facts.

When evidence is missing, the correct result is an explicit insufficient/unknown/unavailable state.

---

## 9. Phase 1 money-movement boundary

Phase 1 is read-only.

Do not implement or imply actual:

- ACH movement;
- RTP movement;
- FedNow movement;
- card movement;
- transfers;
- withdrawals;
- trades; or
- deposits.

A user interface must not imply that a money-moving operation occurred when the backend did not perform and verify that operation.

---

## 10. Intelligence graph requirements

The graph must support arbitrary derived-intelligence nodes beyond the finite capability registry.

A derived node must retain, as applicable:

- exact upstream node identifiers;
- upstream execution/run boundary;
- transformation identity;
- transformation/hash integrity;
- recursive ancestry;
- evidence binding;
- semantic state;
- uncertainty/limitations;
- temporal applicability;
- provenance; and
- certification state.

Higher-order composition must consume exact persisted upstream node identities. It must fail closed when an upstream reference is missing, ambiguous, cross-boundary, cyclic, or otherwise invalid.

Persistence of a node is not certification of its semantic validity.

---

## 11. Forward and reverse traversal

IRIS must be designed for both directions of reasoning.

### Forward

```text
provider observation
→ source field
→ governed evidence
→ canonical state
→ interpretation/classification
→ temporal/statistical/relational/behavioral intelligence
→ pattern/baseline/anomaly
→ causal analysis where supported
→ prediction
→ scenario/counterfactual
→ risk/opportunity
→ decision/recommendation
→ consequence
→ outcome
→ learning
→ cross-domain synthesis
→ higher-order intelligence
→ recursive composition
→ report/result
```

### Reverse

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

Every reverse edge that is presented as factual must be backed by actual persisted lineage or an explicitly defined non-factual conceptual relationship.

The system must distinguish conceptual educational traversal from user-specific runtime traversal.

---

## 12. Report product model

Reports are the principal user-facing publication surface of the intelligence system.

The report catalog is conceptually unbounded. It is not a maximum number of reports.

New report products may emerge from:

- new intelligence;
- new relationships;
- new temporal contexts;
- new user questions;
- new scenarios;
- verified outcomes;
- recursive compositions; and
- materially useful combinations of existing intelligence.

A report may publish only when its required evidence, intelligence dependencies, semantic transformations, lineage, uncertainty, applicability, and certification requirements are satisfied.

### Report naming

A report name should be generated around the strongest defensible headline intelligence contained in the report, considering where applicable:

- materiality;
- relevance;
- explanatory power;
- actionability;
- educational value;
- confidence;
- evidence sufficiency;
- recency;
- temporal significance;
- cross-domain significance;
- risk significance;
- opportunity significance; and
- novelty.

The report name must preserve epistemic state. A prediction cannot be presented as certainty. A possible causal explanation cannot be titled as proven causation. Insufficient evidence cannot be presented as a completed factual report.

---

## 13. User controls and publication

Users may eventually activate or deactivate supported report products.

Deactivation changes presentation/attention preference. It must not silently delete underlying evidence or intelligence.

Product availability must remain separate from:

- evidence availability;
- implementation state;
- certification state;
- subscription entitlement; and
- user activation state.

Beta access may be free, but free access never creates missing evidence or bypasses certification.

---

## 14. Persistent IRIS assistant

The IRIS assistant is a global experience capability.

It must be present and ready to help on every supported authenticated page in both experiences.

### Financial Life mode

May use governed user-specific APIs and must remain grounded in actual evidence and actual certified/qualified results.

It must never invent:

- balances;
- transactions;
- financial results;
- confidence;
- causal claims;
- predictions;
- scenarios; or
- other financial facts.

### Intelligence/Education mode

Must be educational and read-only.

It must not:

- load user financial data;
- query user financial-data endpoints;
- query user-specific intelligence endpoints;
- display user-specific financial results; or
- infer user financial information.

Assistant presence alone is not certification. Certification requires proof of visibility, interaction, correct mode, and the correct data boundary.

---

## 15. Consumer journey

The Financial Life journey is governed by:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare Change → Explore Scenarios → Decide → Observe Outcomes → Learn → Return`

The experience must provide progressive disclosure:

```text
human-readable meaning
        ↓
intelligence / reasoning
        ↓
evidence / provenance
```

Users should be able to understand what IRIS knows, why it knows it, what it does not know, and what would be required to know more.

---

## 16. Intelligence/Education experience

The Intelligence experience should provide enough depth to teach the architecture rather than merely display a summary.

It should support educational exploration of:

- the eight architectural domains;
- the current seven-domain Sandbox boundary;
- graph structure;
- recursive composition;
- evidence states;
- forward traversal;
- reverse traversal;
- semantic lineage;
- uncertainty;
- causality boundaries;
- prediction boundaries;
- scenarios and counterfactuals;
- cross-domain intelligence; and
- higher-order intelligence.

It must not become a disguised user-data dashboard.

Reports and user-specific results belong on the Financial Life / Results side.

---

## 17. Developer implementation contract

A developer working from this roadmap must follow this order:

1. Read the architecture/source-of-truth documents.
2. Audit the current repository state.
3. Audit the current live schema/state where the change depends on it.
4. Identify the exact contract being changed.
5. Verify dependency order.
6. Implement against the actual current structure.
7. Run independent tests.
8. Verify exact evidence and lineage where applicable.
9. Verify the user-data boundary.
10. Verify frontend/backend/database synchronization.
11. Deploy only after the preceding state is proven.
12. Record the actual state in the roadmap.

Never mark a capability complete merely because:

- a file exists;
- a component renders;
- an endpoint returns HTTP 200;
- a row was persisted;
- a capability is registered;
- a test fixture exists; or
- a template exists.

The implementation state must describe what has actually been proven.

---

## 18. Governing execution and certification chain

The governing chain is:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies that an earlier state is certified.

Documentation is not runtime proof.

Persistence is not semantic proof.

A green build is not end-to-end certification.

---

# 19. Roadmap state

## A. Architecture and contracts — Defined

- [x] IRIS product identity defined.
- [x] Financial Life / Results established as Priority 1.
- [x] IRIS Intelligence / Education established as Priority 2.
- [x] Two-experience/one-system boundary defined.
- [x] Financial Life user-data boundary defined.
- [x] Intelligence/Education no-user-data boundary defined.
- [x] Eight authoritative architectural domains defined.
- [x] Seven-domain current Sandbox/runtime boundary defined.
- [x] Statements explicitly deferred until real banking.
- [x] Unbounded recursive intelligence hierarchy defined.
- [x] Graph rather than fixed tree defined.
- [x] Evidence-state distinctions defined.
- [x] Anti-fabrication rules defined.
- [x] Forward/reverse traversal model defined.
- [x] Arbitrary derived-intelligence node requirement defined.
- [x] Report/intelligence separation defined.
- [x] Report publication boundary defined.
- [x] Persistent assistant boundary defined.
- [x] Consumer journey defined.

## B. Consumer experience — Implemented, not certified

- [x] Unified authenticated IRIS shell implemented.
- [x] Financial Life journey navigation implemented around governed routes.
- [x] Intelligence/Education route implemented.
- [x] Global IRIS assistant mounted at the experience-shell level.
- [x] Assistant has separate Financial Life and Intelligence/Education modes.
- [x] Intelligence/Education assistant path is educational-only.
- [x] Consumer home uses governed intelligence output rather than fabricated financial values.
- [x] Consumer routes expose evidence, reasoning, behavior, scenarios, decisions, and reports through the existing governed product surfaces.
- [ ] Global route coverage independently verified for every supported authenticated route.
- [ ] Responsive visibility/interaction certification completed across supported device classes.
- [ ] Full Financial Life journey end-to-end certified against real provider evidence.
- [ ] Intelligence/Education user-data isolation independently certified across every supported route.

## C. Intelligence graph — Implemented foundations, not fully certified

- [x] Recursive intelligence graph architecture established.
- [x] Exact execution-scoped runtime node identity propagation implemented.
- [x] Arbitrary derived-intelligence node persistence foundation implemented.
- [x] Exact upstream-node references implemented for recursive composition.
- [x] Recursive provenance records upstream node IDs/hashes.
- [x] Cycle-safe bidirectional traversal foundation implemented.
- [x] Execution/run/user boundary checks implemented in runtime traversal.
- [x] Root capability persistence supports evidence-bound roots without artificial upstream requirements.
- [x] Missing/cross-execution upstream references fail closed.
- [ ] Complete recursive semantic lineage certification across all currently implemented operators.
- [ ] Exact input/output field lineage certification for every operator.
- [ ] Independent certification that every persisted execution artifact was actually consumed semantically.
- [ ] Complete forward traversal certification across all authoritative domains.
- [ ] Complete reverse traversal certification across all authoritative domains.
- [ ] Cross-domain recursive composition certification.
- [ ] Higher-order recursive composition certification without artificial semantic depth limits.

## D. Evidence and provider boundary — Seven-domain Sandbox target

- [x] Provider evidence model established.
- [x] Exact user/run/execution evidence boundary model established.
- [x] Current provider Item selection requires the seven current executable domains.
- [x] Statements removed from the current Sandbox execution requirement.
- [x] Durable provider sync lease repair implemented.
- [x] Transaction source-field lineage repair implemented.
- [x] Numeric finiteness validation repair implemented.
- [ ] Independent seven-domain runtime gate certification.
- [ ] Independent forward traversal certification for each current domain.
- [ ] Independent reverse traversal certification for each current domain.
- [ ] Evidence-to-intelligence semantic sufficiency certification for every implemented operator.
- [ ] Real-banking Statements domain implementation and certification when real banking is available.

## E. Report product system — Foundations implemented, not certified

- [x] Intelligence-vs-report boundary documented.
- [x] Report-product definition library established.
- [x] Report catalog API boundary established.
- [x] Catalog search/family filtering implemented.
- [x] Activation/deactivation UI connected to governed selection APIs.
- [x] Report detail/exploration surface implemented.
- [x] Report dependency-definition graph implemented.
- [x] Runtime lineage resolver binds reports to exact intelligence nodes and evidence.
- [x] Report publication receives exact run/execution boundary.
- [x] Headline binding requires a persisted runtime intelligence-node ID.
- [x] Evidence → intelligence → report reverse traversal endpoint foundation implemented.
- [x] Report detail UI can expose runtime nodes/evidence and reverse mappings.
- [x] Semantic dependency-consumption evaluator distinguishes structural reads from semantic sufficiency.
- [x] Exact report evidence-boundary evaluator implemented.
- [x] Conjunctive report certification-gate foundation implemented.
- [x] Authoritative run-bound evidence resolver implemented.
- [x] Report runtime-lineage resolver fails closed on invalid roots, missing ancestors, invalid transformations, cycles, and invalid evidence IDs.
- [ ] Persisted product catalog schema certified.
- [ ] Persisted product-to-intelligence dependency records certified as first-class product data.
- [ ] Semantic sufficiency of every report-to-intelligence mapping certified.
- [ ] Dynamic report-name generation runtime certified.
- [ ] Complete report → intelligence → evidence traversal certification.
- [ ] Complete evidence → intelligence → report traversal certification.
- [ ] Product publication certification.
- [ ] End-to-end product certification.
- [ ] Subscription entitlement runtime certification.
- [ ] User activation/deactivation end-to-end certification.

## F. Financial Life / Results — Priority 1

- [x] Consumer home foundation implemented.
- [x] Governed narrative boundary implemented.
- [x] Evidence/unknown/anti-fabrication presentation foundation implemented.
- [x] Financial Life journey shell implemented.
- [x] Persistent Financial Life assistant foundation implemented.
- [ ] Complete real-evidence Financial Life journey certification.
- [ ] Full report inventory runtime certification.
- [ ] User-specific report publication certification.
- [ ] Evidence → intelligence → result → report traversal certification across the full product.
- [ ] Scenario → decision → consequence → outcome lifecycle certification.
- [ ] Outcome observation and learning certification when those capabilities are independently implemented and evidence-qualified.
- [ ] Premium visual/interaction certification across supported device classes.

## G. IRIS Intelligence / Education — Priority 2

- [x] Educational Intelligence surface implemented.
- [x] Educational surface contains no user-specific intelligence result path.
- [x] Educational assistant mode implemented without user-data calls.
- [x] Eight-domain architecture and seven-domain Sandbox boundary explained.
- [x] Recursive graph, lineage, evidence-state, and epistemic boundaries represented.
- [ ] Interactive Intelligence Library UI.
- [ ] Full educational graph traversal experience.
- [ ] Educational forward/reverse lineage visualization.
- [ ] Comprehensive operator/composition teaching surface.
- [ ] Independent proof that every Intelligence/Education route remains user-data-free.
- [ ] Premium visual/interaction certification.

---

# 20. Runtime gates

The eight architectural domains each require an explicit runtime gate. The current Sandbox executable target is seven; Statements remains deferred.

### Authentication gate

Pass only when the authenticated principal is resolved, the request is authorized for the target user boundary, and the runtime cannot silently substitute another user or Item.

### Transactions gate

Pass only when actual provider-derived transaction observations are persisted, current within the governed synchronization boundary, traceable to exact source observations/fields, and usable by the consuming intelligence operation.

### Balance gate

Pass only when actual provider-derived balance observations exist within the permitted freshness/time boundary and the consuming operation can identify the exact observation(s) used.

### Identity gate

Pass only when actual provider-derived identity observations exist, are authorized for the target user, and the operation can trace its use to exact evidence.

### Assets gate

Pass only when actual provider-derived asset observations exist, are authorized for the target user, and their use is semantically sufficient for the operation.

### Liabilities gate

Pass only when actual provider-derived liability observations exist, are authorized for the target user, and their use is semantically sufficient for the operation.

### Investments gate

Pass only when actual provider-derived investment observations exist, are authorized for the target user, and their use is semantically sufficient for the operation.

### Statements gate

Architecturally defined but **not a current Sandbox gate**. It becomes executable only when real banking support is available and independently verified.

A domain gate passing means the domain's evidence boundary is satisfied. It does not by itself prove that a downstream intelligence operator consumed the evidence correctly.

---

# 21. Immediate implementation order

The next implementation work must follow dependency order rather than visual priority alone:

1. **Audit current repository and live runtime state.**
2. **Lock the developer-grade architecture/source-of-truth contract.**
3. **Verify all supported authenticated routes and assistant placement.**
4. **Certify the seven current domain runtime gates independently.**
5. **Certify exact evidence boundary per execution.**
6. **Certify exact input/output and semantic lineage per operator.**
7. **Certify forward traversal.**
8. **Certify reverse traversal.**
9. **Certify arbitrary recursive derived-node composition.**
10. **Complete the report dependency/publication graph.**
11. **Certify report → intelligence → evidence and evidence → intelligence → report.**
12. **Complete the Priority 1 Financial Life report/result journey.**
13. **Certify persistent Financial Life assistant behavior.**
14. **Expand Priority 2 educational Intelligence Library without introducing user data.**
15. **Certify Intelligence/Education isolation.**
16. **Run deployment and end-to-end verification against the actual deployed commit.**

No step may be marked complete merely because its code exists. The state must be backed by the corresponding independent proof.

---

# 22. Current status language

Use these states consistently:

- **Defined** — architecture or contract exists.
- **Implemented** — code/schema exists and is integrated.
- **Independently Executable** — capability can be invoked independently under its governed boundary.
- **Evidence Verified** — required provider-derived evidence was actually observed and persisted.
- **Lineage Verified** — exact semantic ancestry and evidence lineage are proven.
- **Certified** — the complete applicable contract and gate have passed independently.
- **Surfaced** — the certified/qualified result is available through the intended user experience.
- **Deployed** — the intended implementation is running in the target environment.
- **End-to-End Certified** — the complete user-to-provider-to-intelligence-to-result path has been independently exercised and verified.

Do not use “complete,” “live,” “working,” or “done” as substitutes for these states when the distinction matters.

---

# 23. Final governing principle

IRIS must never be built upside down.

The interface is not the architecture.

The report catalog is not the intelligence hierarchy.

The capability registry is not the intelligence limit.

The database row is not semantic proof.

The provider product list is not provider evidence.

A Sandbox observation is not production reality.

An educational explanation is not a user-specific result.

A user-specific result is not valid unless its evidence, transformation, lineage, uncertainty, and applicability are governed.

The Financial Life experience is **Priority 1**.

The Intelligence/Education experience is **Priority 2**.

Both are expressions of **one connected IRIS system**.

And the intelligence hierarchy remains **semantically unbounded** regardless of how the user interface is divided.