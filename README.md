# IRIS

**IRIS is a Relational Financial Intelligence Operating System.**

IRIS is one connected system. The user's Financial Life is the actual financial reality and user-specific state that IRIS is permitted to observe and derive from governed evidence. The Intelligence Hierarchy is the same system's reasoning machinery: it explains how IRIS transforms evidence and state into intelligence and results.

The two primary experiences are **equal views of the same IRIS system**:

1. **Financial Life / Results / User Journey — Priority #1:** the user-specific side. It shows the user's observed financial reality, derived state, reports, analytics, explanations, relationships, changes, questions, scenarios, decisions, actions, outcomes, learning, controls, education and empowerment, subject to evidence and runtime qualification.
2. **IRIS Intelligence / Education — Priority #2:** the educational side. It explains the hierarchy, graph, reasoning, evidence model, lineage, recursion, uncertainty, causality boundaries, prediction, scenarios and higher-order composition without loading, querying, displaying or inferring user-specific financial data for now.

These are **not two products, two architectures, or three layers with a separate journey layer between them**. They are two user-facing views of one governed IRIS hierarchy/graph/system. The journey is the user's movement through the Financial Life/results experience; it is not the Financial Life itself and it is not a third architectural component.

---

## 1. The correction that governs the rebuild

A previous build sequence put too much implementation weight on the Intelligence/Education side before the complete Financial Life/user-data side was built. That ordering is now explicitly corrected.

### Correct mental model

```text
                         IRIS
                          │
             ONE governed hierarchy/graph
                          │
          ┌───────────────┴───────────────┐
          │                               │
   FINANCIAL LIFE / RESULTS        IRIS INTELLIGENCE / EDUCATION
        PRIORITY #1                     PRIORITY #2
          │                               │
   actual user-specific            educational explanation
   financial reality/state          of the same machinery
   and resulting intelligence       without user data for now
          │                               │
   reports / analytics              hierarchy / graph
   relationships                    reasoning
   changes                          evidence concepts
   questions                        lineage
   comparisons                      recursion
   scenarios                        uncertainty
   decisions                        causality boundaries
   actions                          prediction/scenario boundaries
   outcomes                         higher-order composition
   learning
          │                               │
          └──────────── same IRIS ─────────┘
```

### What Financial Life means

**Financial Life is actual user-specific financial reality/state/results**, not a collection of conceptual labels such as Life, Change, Understand or Verify.

It can contain, when actually supported by governed evidence:

- accounts and account relationships;
- transactions and transaction semantics;
- balances and balance state;
- identity;
- assets;
- liabilities;
- investments;
- statements;
- income and cash-flow state;
- spending and merchant/domain relationships;
- recurring activity;
- obligations and debt state where evidence supports them;
- historical state and changes;
- relationships across domains and time;
- intelligence derived from those observations;
- reports and analytics produced from qualified intelligence;
- scenarios, decisions, actions and outcomes where those capabilities are independently supported; and
- education and explanations grounded in the user's actual state.

A navigation label is not a financial fact. A report definition is not a financial fact. A capability definition is not a financial fact. Only governed evidence and qualified transformations may produce user-specific factual results.

### What the journey means

The Financial Life journey describes **how the user moves through their Financial Life and the intelligence/results IRIS produces about it**:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare → Change → Explore → Scenarios → Decide → Action → Observe Outcomes → Learn → Return`

The journey is therefore an experience path through the Financial Life/results side. It is not a third side of IRIS.

### What the Intelligence side means

The Intelligence/Education side shows **how the hierarchy produces understanding**. It is not a substitute for the user's Financial Life and it is not a decorative encyclopedia. It is the readable/explorable representation of the same graph, dependencies, evidence boundaries, lineage, recursive reasoning and composition rules that ultimately produce user-specific results.

For now, it is strictly educational and contains no user-specific financial data.

---

## 2. The central bidirectional relationship

IRIS must support both directions.

### Forward: reality → result

```text
provider capability / authorized request
        ↓
provider observation
        ↓
governed evidence
        ↓
canonical Financial Life State
        ↓
relational / temporal / statistical / behavioral intelligence
        ↓
patterns / changes / anomalies / relationships
        ↓
risk / opportunity / prediction / scenario
        ↓
decision / recommendation / consequence
        ↓
outcome / learning / higher-order composition
        ↓
qualified IRIS report / analytics / user result
        ↓
Financial Life user journey
```

### Reverse: result → reasoning → evidence

```text
user result / report / answer
        ↓
producing intelligence node(s)
        ↓
upstream dependencies and relationships
        ↓
canonical Financial Life State
        ↓
exact governed evidence
        ↓
source-field observation
        ↓
provider observation
```

The reverse path is factual only when exact persisted lineage exists. Educational/conceptual relationships must remain explicitly conceptual and must never be presented as the user's actual evidence.

This bidirectional relationship is a core architectural requirement, not an optional visualization.

---

## 3. The intelligence hierarchy

Level 1 is **IRIS**.

Level 2 is the eight authoritative financial-life evidence domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

Level 3 and beyond are recursively generated intelligence. These are not a finite list of pages or a fixed set of numbered intelligence levels.

The hierarchy is a **graph**, not merely a tree. Nodes may:

- have multiple upstream parents;
- cross domains;
- depend on temporal relationships;
- depend on other derived intelligence;
- participate in relationships and transformations;
- preserve exact upstream identities;
- retain recursive ancestry;
- retain evidence/provenance bindings; and
- become inputs to additional intelligence indefinitely where evidence, governance, resources and usefulness permit.

There is **no artificial semantic depth ceiling**. Runtime, storage, latency, pagination and materialization budgets are operational constraints only. They must never be treated as a semantic maximum.

The finite capability registry is composition machinery. It is not the boundary of what IRIS can understand.

Arbitrary derived-intelligence graph nodes must be able to persist beyond a finite registry with exact upstream references, transformation identity, recursive lineage, evidence binding, provenance, uncertainty/limitations and certification state. Persistence alone is never semantic proof.

---

## 4. Financial Life comes first in the consumer build

The corrected build priority is:

### Priority #1 — Financial Life / Results / User Journey

This is the immediate implementation priority.

The objective is to build the user's complete, empowering and educational financial-life experience from the hierarchy backward and evidence forward, without manufacturing financial facts.

Priority #1 includes:

- the complete authenticated shell and consistent visual system;
- complete Financial Life navigation;
- actual user-state surfaces and correct empty/insufficient states;
- evidence connection and evidence formation;
- all eight domain surfaces, with current execution boundaries respected;
- account, transaction, balance, identity, asset, liability, investment and statement structures;
- relationships and temporal context;
- changes and explanations;
- report and analytics catalog;
- report detail and evidence inspection;
- report → intelligence → evidence traversal;
- evidence → intelligence → eligible result traversal;
- questions and exploration;
- comparisons;
- scenarios/counterfactuals;
- decisions and recommendations;
- actions where the current read-only boundary permits only informational action planning;
- outcomes and learning where independently supported;
- user controls;
- education and empowerment;
- persistent Financial Life assistance; and
- complete end-to-end journey behavior.

### Priority #2 — IRIS Intelligence / Education

The existing Intelligence/Education work is retained as the second priority and will be hardened after the Financial Life side has the correct foundation and user journey.

It must remain:

- read-only;
- educational;
- user-data-free for now;
- recursive;
- graph-based;
- lineage-aware;
- evidence-aware;
- explicit about uncertainty;
- explicit about observation vs inference vs derivation vs prediction vs scenario;
- explicit about causality boundaries; and
- capable of explaining the machinery that produces Financial Life results.

Priority #2 is not smaller intelligence. It is a different data boundary and a later consumer-build priority.

---

## 5. Products and Reports are different

**Products and Reports must never be treated as the same catalog or forced to have the same count.**

### Provider/Product capability

A provider product is a source capability. It describes what external/provider information or service capability can potentially contribute to the governed evidence system.

Provider-product state includes, as applicable:

```text
product universe
→ availability
→ institution support
→ consent
→ authorization
→ plan entitlement
→ commercial cost
→ provider response
→ observation
```

### IRIS Report Product

An IRIS Report Product is a user-facing publication definition over the IRIS intelligence graph. It defines what useful result IRIS can produce when its declared evidence and intelligence dependencies are qualified.

```text
IRIS intelligence
→ qualified result definition
→ report product
→ runtime-produced report/result
```

A report can depend on multiple provider products, multiple domains, multiple intelligence nodes, temporal relationships and recursive compositions.

Therefore:

```text
Provider Product count ≠ Report Product count
Report Product count ≠ produced user-result count
produced result count ≠ certified result count
```

Any screen that displays these counts must source each count from its own governed runtime/catalog state. No matching numbers may be fabricated for visual symmetry.

---

## 6. Evidence-state contract

These states are always distinct:

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

Epistemic states are also distinct:

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

Unknown is never silently represented as zero.

No evidence means no factual value.

No observation means no fabricated observation.

Persistence does not prove semantic correctness. A dependency being readable does not prove that an operator semantically consumed it. Prediction is not observation. Scenario is not observation. Correlation is not causation.

---

## 7. Eight domains and the current evidence boundary

Architecturally, IRIS has eight authoritative domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

The current executable/certifiable Sandbox boundary is seven domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments

Statements is Domain 8 architecturally but is deferred until real banking. Statements must not be requested, simulated, fabricated, displayed as observed, or used as a current Sandbox evidence requirement.

The seven current domain gates must remain independently provable. One domain passing does not certify another.

---

## 8. Report lifecycle

A report definition may exist before user evidence exists. That is a catalog definition, not a user-specific result.

The correct lifecycle is:

```text
Define report product
        ↓
Declare evidence and intelligence dependencies
        ↓
Observe authorized provider evidence
        ↓
Persist governed evidence
        ↓
Build canonical Financial Life State
        ↓
Execute governed intelligence
        ↓
Persist exact runtime inputs/outputs and lineage
        ↓
Prove semantic transformation
        ↓
Validate evidence boundary
        ↓
Certify where all gates pass
        ↓
Publish eligible user-specific result
        ↓
User explores / asks / compares / scenarios / decides
        ↓
Observe supported outcomes
        ↓
Learn only from independently qualified outcomes
```

No missing stage may be filled with invented values.

Report states must remain independently distinguishable, including:

- defined;
- available;
- insufficient evidence;
- unavailable;
- historical;
- not applicable;
- not yet implemented;
- evidence-qualified;
- intelligence-qualified;
- runtime-produced;
- certified;
- active;
- published; and
- deferred.

---

## 9. Progressive disclosure

The user should be able to move from human meaning into the intelligence that produced it and then into exact evidence/provenance where available:

```text
human-readable meaning
        ↓
intelligence / reasoning
        ↓
evidence / provenance
```

This same graph enables reverse traversal:

```text
result
→ intelligence
→ relationships / transformations
→ canonical state
→ evidence
→ provider observation
```

The interface can therefore become extremely deep without requiring every intelligence node or report to become a permanent top-level navigation item.

A primary navigation surface is a doorway, not a semantic depth limit.

---

## 10. User interface correctness is a build gate

Before Plaid is connected to the consumer experience, the entire pre-Plaid UI must be structurally, visually, semantically and behaviorally correct.

This includes:

- consistent appearance across every screen;
- consistent typography, spacing, controls, terminology and state presentation;
- removal of stale product terminology, including all incorrect uses of legacy names or concepts;
- correct IRIS naming and identity;
- working navigation;
- working buttons and controls;
- no dead interactive elements represented as completed functionality;
- correct loading states;
- correct empty states;
- correct insufficient-evidence states;
- correct unavailable/deferred states;
- correct error/retry states;
- correct accessibility and responsive behavior;
- Products and Reports shown as separate concepts and separate data sources;
- counts sourced from actual governed catalogs/state rather than hardcoded values;
- no fabricated financial numbers;
- no placeholder financial facts presented as real;
- no false “connected,” “observed,” “certified,” or “intelligence-ready” claims; and
- clear user-controlled boundaries.

A rendered screen is not complete merely because it looks finished.

A button is not complete merely because it is visible.

A report is not complete merely because its definition exists.

A capability is not complete merely because its endpoint exists.

---

## 11. Read-only boundary

Current IRIS scope is read-only.

No ACH, RTP, FedNow, card movement, transfer, withdrawal, trade, deposit or other money movement is implied or implemented as part of the current intelligence product.

Round-Ups remain an IRIS feature, not the IRIS product boundary or intelligence foundation. Their current scope is analytical/read-only unless and until a separately authorized future phase changes that boundary.

---

## 12. Persistent IRIS assistance

IRIS assistance is persistent across supported authenticated pages.

### Financial Life mode

May use governed user-specific APIs and actual evidence/results. It must preserve evidence state, uncertainty and provenance and must never invent a financial fact.

### Intelligence/Education mode

Educational only. It must not load, query, display or infer user financial data for now.

The assistant is therefore another view of the same IRIS system, not a separate architecture.

---

## 13. Certification chain

The governing execution/certification chain is:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies an earlier state is certified.

Certification requires actual proof. File existence, schema existence, endpoint existence, successful rendering, successful compilation, or a persisted row are not certification by themselves.

---

## 14. Non-negotiables

1. Never manufacture financial facts, values, transactions, balances, accounts, provider observations, report results or user outcomes.
2. Never convert unavailable or unknown evidence into zero.
3. Never confuse provider capability with provider observation.
4. Never confuse provider availability with consent or authorization.
5. Never confuse consent/authorization with response receipt.
6. Never confuse response receipt with persisted observation.
7. Never confuse persistence with evidence certification.
8. Never confuse evidence certification with intelligence consumption.
9. Never confuse intelligence definition with intelligence execution.
10. Never confuse report definition with user-specific report result.
11. Never make Products and Reports artificially equal in count.
12. Never collapse the Financial Life side and Intelligence side into separate architectures.
13. Never create a third architectural “journey layer.” The journey is the user's path through Financial Life/results.
14. Never reduce the Intelligence side's semantic depth because it is Priority #2.
15. Never impose an artificial semantic depth ceiling on recursive intelligence.
16. Never make unsupported causal claims.
17. Never present prediction as observation.
18. Never present a scenario as an observed fact.
19. Never claim lineage without exact persisted lineage.
20. Never claim certification without verification.
21. Never blindly repair transitional infrastructure without reconciling it against the intended architecture.
22. Never connect Plaid to an unfinished consumer experience merely to make the application appear more complete.

---

## 15. Definition of complete IRIS

IRIS is complete only when it can continuously and safely transform governed provider evidence into an explainable, lineage-preserving, user-controllable and recursively composable Financial Life intelligence experience, while also providing the equally deep educational Intelligence/Education view of the same machinery.

Completion includes, wherever supported by evidence and governance:

- complete Financial Life state;
- complete user journey;
- reports and analytics;
- explanations and relationships;
- evidence inspection;
- scenarios;
- decisions;
- actions within the permitted boundary;
- outcomes;
- learning;
- education;
- empowerment;
- recursive higher-order intelligence;
- exact forward and reverse lineage;
- independent domain gates;
- user controls;
- interaction correctness; and
- deployment/end-to-end verification.

The intelligence graph, report universe and user journey have no artificial conceptual ceiling.

---

## 16. Build-order rule from this point forward

The corrected build order is:

```text
1. Establish the IRIS identity and one-system contract
2. Establish the Financial Life/user-data model
3. Establish evidence/state boundaries
4. Build the Financial Life surfaces and complete journey
5. Build Products and Reports as distinct systems
6. Connect Financial Life results to exact intelligence lineage
7. Verify UI consistency and every interaction
8. Verify Financial Life traversal forward and reverse
9. Only then connect real provider evidence/Plaid
10. Independently certify each evidence domain
11. Harden the Intelligence/Education side against the same graph
12. Certify bidirectional system traversal
13. Add scenarios, decisions, outcomes and learning as their evidence gates become valid
14. Continue recursive higher-order composition without a semantic depth ceiling
```

This order is a **consumer build priority**, not permission to violate the underlying dependency order. Financial Life surfaces must still be downstream of the governed state/evidence contracts, and intelligence results must still be downstream of qualified intelligence execution.

The purpose of the reset is to stop building the visible system upside down: the user-data/Financial Life experience is now the primary consumer build, while the existing Intelligence/Education work becomes the second priority and is improved in alignment with the same underlying hierarchy.

See `docs/ROADMAP.md` for the detailed engineering sequence and certification gates.