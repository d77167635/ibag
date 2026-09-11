# Iris Capability Roadmap

This roadmap tracks **capability state and product-readiness state**, not artifact count.

IRIS is a recursive financial-life intelligence operating system. Its intelligence hierarchy is a graph with no artificial semantic depth ceiling. **The hierarchy is internal reasoning machinery. The user products are the evidence-grounded reports and analytics produced from that hierarchy.**

## Product priorities and connected experiences

IRIS has two connected experiences over one underlying system. They are deliberately separated by **user-data boundary and purpose**, not by architecture.

### Priority 1 — Financial Life / Results / User Journey

This is the primary consumer product surface and the first implementation priority. It is the person's journey through their observed financial reality and the results Iris can validly derive from it. It includes the financial-life home, changes, understanding, evidence, the large report and analytics inventory, user-specific intelligence results, scenarios, decisions, actions, outcomes, controls, explanations, education, and empowerment.

The journey must remain primary even as the intelligence hierarchy grows. The intelligence graph powers the experience; it does not replace the experience.

### Priority 2 — IRIS Intelligence / Education

This is a read-only educational surface for learning how Iris thinks. It contains **no user financial data and no user-specific financial results**. It explains the hierarchy, graph, evidence states, lineage, recursive composition, uncertainty, and the boundaries between observation, interpretation, prediction, scenario, causality, and higher-order intelligence.

Priority 2 does not reduce or cap the intelligence architecture. The hierarchy remains unbounded in semantic depth.

### One connected system

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

The same IRIS assistant is available throughout both experiences, but its behavior is surface-aware:

- Financial Life / Results: contextual help grounded in the user's governed evidence and actual results.
- Intelligence / Education: educational help only; no user financial data or user-specific results are loaded.

## Governing execution chain

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Exact Evidence Boundary Verified → Semantic Lineage Verified → Report Product Defined → Report Product User-Controlled → Report Product Surfaced → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies an earlier state is certified.

## Intelligence integrity states

Capability existence and intelligence-result existence are separate states. A capability may be defined, registered, or executable without producing a user-specific intelligence result.

No evidence → no factual value.
No observation → no fabricated observation.
Unknown ≠ zero.
Provider availability ≠ user authorization ≠ response received ≠ observation persisted ≠ evidence certified ≠ intelligence consumable ≠ intelligence consumed.
Persistence ≠ semantic proof.
Dependency read ≠ semantic sufficiency.
Prediction ≠ observation.
Scenario ≠ observation.
Correlation ≠ causation.

## Architecture/product boundary

- `docs/IRIS_LIBRARY.md` is the intelligence-definition library.
- `docs/IRIS_REPORT_PRODUCT_LIBRARY.md` is the report-product catalog/definition library.
- `docs/IRIS_EXPERIENCE_STANDARD.md` is the consumer-facing product-quality contract.
- `docs/IRIS_USER_JOURNEY.md` is the full consumer journey contract.
- `docs/IRIS_VISUAL_INTERACTION_SYSTEM.md` is the visual/interaction contract.
- `docs/IRIS_SCREEN_MAP.md` is the screen-by-screen consumer product map.
- Intelligence nodes are internal semantic reasoning objects.
- Report products are user-facing publications generated from one or more intelligence nodes.
- A report name should be centered on the most important, material, empowering, explanatory, educational, or actionable supported intelligence contained in that report.
- A report title must never make a stronger claim than its underlying intelligence.
- Product availability must depend on evidence state, implementation state, certification state, subscription entitlement, and user activation; these states must remain distinct.
- During beta, intended report-product access is free, but free access never creates missing evidence.

## Persistent IRIS assistance requirement

The IRIS assistant is a **global experience capability**, not a page-specific enhancement. It must be present and ready to help on every authenticated page in both connected experiences.

### Financial Life / Results assistant

- Available on every Financial Life / Results page.
- Helps the user understand what is currently displayed, navigate the journey, understand reports, inspect evidence, interpret supported results, and ask questions.
- May use governed user-specific IRIS APIs where appropriate.
- Must preserve exact evidence state, uncertainty, provenance, freshness, and applicability.
- Must never invent a balance, transaction, result, confidence, causal claim, prediction, scenario, or other financial fact.

### Intelligence / Education assistant

- Available on every Intelligence / Education page.
- Explains the intelligence hierarchy, graph, evidence model, lineage, recursive reasoning, and epistemic boundaries.
- Must not load, query, display, or infer user financial data.
- Must not present user-specific intelligence results or reports.
- Is read-only and educational for the current product boundary.

### Assistant certification requirement

The assistant's **presence, visibility, interaction, and surface-specific data boundary** must be independently verified across every supported authenticated route and supported responsive composition. A visible launcher alone is not sufficient certification; its mode must also be proven to respect the corresponding user-data boundary.

## Library/catalog user experience

The intended user experience is an interactive IRIS Library and Report Catalog in which users can:

- browse intelligence domains and concepts;
- browse report products and product families;
- read detailed definitions and educational explanations;
- inspect what evidence powers a report;
- traverse report → intelligence → evidence;
- traverse evidence → intelligence → available reports;
- activate/deactivate supported intelligence surfaces or report products;
- see subscription-locked products after beta;
- distinguish locked, available, insufficient-evidence, unavailable, historical-only, not-applicable, and not-yet-implemented states;
- search and filter the catalog;
- request question-specific reports;
- understand why a report is being surfaced; and
- experience their financial life as one connected intelligence ecosystem rather than disconnected banking widgets.

Deactivation is a presentation/attention preference. It must not silently delete underlying evidence or intelligence.

## Consumer experience standard

The consumer face and full user journey are first-class product surfaces and are held to a premium consumer-technology standard. The experience must make the intelligence hierarchy feel simple without hiding evidence, uncertainty, lineage, or limitations.

The full journey is governed by:

`Arrival → Evidence Connection → Evidence Formation → First Understanding → Ask → Explore Relationships → Understand Reasoning → Compare Change → Explore Scenarios → Decide → Observe Outcomes → Learn → Return`

The face must provide progressive disclosure from human-readable meaning to intelligence to evidence and must never expose an unavailable capability as if it were completed functionality.

### Defined

- [x] Consumer experience quality standard defined.
- [x] Full consumer user journey defined.
- [x] Trust/anti-fabrication UX contract defined.
- [x] Progressive-disclosure experience model defined.
- [x] Core consumer intelligence journey surfaces mapped to existing governed routes.
- [x] Visual interaction system defined, including semantic visual states, graph traversal, timeline, scenario, decision, outcome, learning, accessibility, and failure interaction rules.
- [x] Screen-by-screen consumer product map defined from arrival through return.

### Implemented but not certified

- [x] Premium IRIS consumer home surface implemented from the canonical governed intelligence endpoint.
- [x] Consumer home exposes current governed narrative only when supplied by the backend.
- [x] Consumer home exposes execution/certification boundary without manufacturing financial values.
- [x] Consumer home provides direct navigation into evidence, intelligence, behavioral change, reasoning, scenarios, decisions, and report products.
- [x] Consumer home preserves evidence-qualified report publication gating.
- [x] Consumer home includes explicit trust, unknown-state, and anti-fabrication presentation.
- [x] Unified authenticated IRIS shell implemented around the existing consumer surfaces, with persistent responsive navigation and a shared journey rail.
- [x] Shell maps the consumer journey to existing governed routes without inventing backend capabilities.
- [x] Shell provides persistent contextual entry points for Evidence, Ask/Understand, and connection flow.
- [x] Shell preserves the same semantic model across desktop and mobile composition.
- [x] Global IRIS assistant mounted at the experience-shell level so it is available across Financial Life / Results and Intelligence / Education routes.
- [x] Assistant has separate Financial Life and Intelligence/Education modes.
- [x] Intelligence/Education assistant mode does not call user-data or user-intelligence APIs.

## Report naming principle

The report product naming engine should identify the **headline intelligence** with the greatest defensible materiality/relevance/empowerment/educational/actionability value for the report and use that intelligence to form the human-readable report name.

The headline selection must consider, as appropriate:

- materiality;
- user relevance;
- explanatory power;
- actionability;
- educational value;
- confidence;
- evidence sufficiency;
- recency;
- temporal significance;
- cross-domain significance;
- opportunity significance;
- risk significance; and
- novelty.

The name must preserve the epistemic state. A prediction cannot be titled as a certainty; a possible causal explanation cannot be titled as proven causation; insufficient evidence cannot be represented as a completed factual report.

## Product-generation boundary

A report may be generated only when its required evidence and intelligence dependencies are available within the exact permitted evidence boundary, required semantic transformations are satisfied, lineage is preserved, uncertainty/limitations are represented, and publication rules permit the result.

The catalog itself is unbounded in principle. Named report products are stable identities, not a maximum count. New products may emerge from new intelligence, new relationships, new temporal contexts, new questions, new scenarios, verified outcomes, recursive compositions, or materially useful combinations of existing intelligence.

## Current product-layer implementation state

### Defined

- [x] Intelligence-vs-product boundary explicitly documented.
- [x] Dedicated IRIS intelligence-definition library established.
- [x] Dedicated IRIS report-product library established.
- [x] Report naming principle established: headline intelligence drives the report name.
- [x] Interactive library/catalog requirements defined.
- [x] Beta free-access intent defined.
- [x] Subscription gating semantics defined.
- [x] Product activation/deactivation semantics defined.
- [x] Evidence/product availability state distinctions defined.
- [x] Financial Life / Results established as Priority 1.
- [x] IRIS Intelligence / Education established as Priority 2.
- [x] Shared-system boundary between the two experiences explicitly documented.

### Implemented but not certified

- [x] Frontend report-catalog API contract typed, including catalog version, activation state, product/provider boundaries, and catalog counts.
- [x] Frontend report catalog loads live catalog/activation state through the governed API boundary.
- [x] Catalog search and family filtering implemented.
- [x] Report activation/deactivation UI connected to the existing catalog selection API.
- [x] Report product detail/exploration surface implemented from the live catalog definition.
- [x] Catalog UI surfaces backend-governed product/provider boundary metadata.
- [x] Consumer home consumes the canonical governed intelligence endpoint.
- [x] Consumer publication is gated by the governed certification flag.
- [x] Headline-intelligence binding is represented in the consumer contract/runtime boundary.
- [x] Canonical intelligence and summary API requests maintain independent in-flight state; they cannot accidentally share one promise solely because both are typed as the consumer response.
- [x] Report dependency-definition graph maps report products to authoritative analysis definitions, feature IDs, and required evidence keys without pretending those identifiers are runtime evidence or intelligence nodes.
- [x] Report runtime lineage resolver binds an executed report to exact persisted intelligence-node IDs, upstream recursive ancestry, and run-bound evidence IDs when those rows actually exist.
- [x] Governed report publication receives the exact run/execution boundary and requires resolved runtime lineage for a ready report.
- [x] Report headline binding requires an actual persisted runtime intelligence-node ID; an analysis-definition ID is no longer sufficient.
- [x] Consumer contract/API exposes exact runtime lineage and governed evidence reverse-lineage traversal.
- [x] Governed evidence → intelligence → report reverse traversal endpoint implemented for an exact user/run/execution/evidence boundary.
- [x] Report detail UI surfaces exact runtime nodes/evidence and allows an evidence record to be traced in reverse to mapped reports.
- [x] Cycle-safe bidirectional runtime graph traversal foundation implemented with explicit user/run/execution boundary checks and no semantic depth ceiling.
- [x] Report-level semantic dependency-consumption evaluator implemented against declared runtime dependency contracts; it explicitly distinguishes structural read proof from semantic sufficiency.
- [x] Recursive multi-report composition foundation implemented using exact runtime node IDs and derived depth when supplied, without imposing an artificial maximum.
- [x] Exact report evidence-boundary evaluator implemented; required evidence keys are never treated as observations, and missing/unknown evidence remains explicit.
- [x] Conjunctive report certification-gate foundation implemented across execution status, runtime lineage, declared dependency-read proof, and evidence boundary.
- [x] Report publication resolver consumes execution-scoped semantic dependency proofs and emits per-report semantic-consumption/certification state.
- [x] Authoritative report evidence resolver maps required evidence keys to exact executed runtime intelligence nodes, recursively traverses their persisted lineage, resolves exact `iris_run_evidence` rows, and exposes their raw observation/source-field references.
- [x] Report certification consumes the authoritative run-bound evidence mapping instead of the former intentionally-unmapped evidence boundary.
- [x] Repository certification gate reconciled with the current recursive graph architecture version (`IRIS_RECURSIVE_CAPABILITY_GRAPH_V2`).
- [x] Report certification gate aligned with the actual governed execution states (`EXECUTED`/`CERTIFIED`, while retaining compatibility with `SUCCEEDED`).
- [x] Recursive executor now returns the exact persisted graph-node ID for every executed capability within the run/execution boundary.
- [x] Arbitrary recursive composition now consumes only those exact execution-scoped graph-node IDs; missing or cross-execution references fail closed instead of selecting a node by capability name.
- [x] Arbitrary recursive composition provenance records the exact upstream node IDs and upstream node hashes used for the derived composition.
- [x] Automated backend test covers propagation of exact upstream graph-node IDs through recursive execution.
- [x] Report runtime-lineage resolution now fails closed on missing/ambiguous capability roots, missing upstream nodes, missing or undeclared transformation edges, transformation hash mismatches, missing recursive ancestors, lineage cycles, and invalid run-bound evidence IDs.
- [x] Report runtime-lineage resolution requires every report root to be recursively evidence-grounded within the exact user/run/execution boundary.
- [x] CI verified the recursive report-lineage hardening source commit `627eb8cb41b3bf8c3e6d156ea7df1a02240e1c44`: backend intelligence tests and TypeScript build passed; frontend build passed; continuity refresh passed.
- [x] Persistent IRIS assistant launcher mounted from the authenticated experience shell rather than only individual pages.
- [x] Financial Life assistant retains governed user-specific question path.
- [x] Intelligence assistant uses an educational-only path without user financial data.

### Not yet certified

- [ ] Persisted product catalog schema.
- [ ] Persisted product-to-intelligence dependency records as first-class product data.
- [ ] Semantic sufficiency of report-to-intelligence mappings beyond structural runtime resolution.
- [ ] Complete evidence → intelligence → report reverse traversal across every evidence domain and every recursive graph relationship.
- [ ] Dynamic report-name generation runtime.
- [ ] Subscription entitlement runtime.
- [ ] User activation/deactivation end-to-end certification.
- [ ] Interactive Intelligence Library UI.
- [ ] Report → intelligence → evidence traversal certification.
- [ ] Evidence → intelligence → report traversal certification.
- [ ] Product publication certification.
- [ ] End-to-end product certification.
- [ ] Current-commit CI/deployment verification for the latest product-layer changes.
- [ ] Full IRIS consumer journey certification against real provider evidence.
- [ ] Premium consumer experience visual/interaction certification across supported device classes.
- [ ] Global IRIS assistant visibility and interaction certification across every supported authenticated route.
- [ ] Financial Life assistant evidence-boundary certification across every supported route.
- [ ] Intelligence/Education assistant proof that no user financial data is loaded or exposed across every supported route.

The previously listed migration-reconciliation blocker is **resolved**: the current repository contains the semantic-proof and transformation-edge migration history, and the live Supabase schema has the corresponding tables/columns with RLS enabled and forced. Those facts establish schema presence only; they do not establish runtime execution or certification.

These unchecked states are intentional. Documentation does not count as runtime implementation or certification.

## Recursive intelligence hierarchy

The intelligence hierarchy remains unbounded in semantic depth. A report product may consume intelligence from any valid depth, provided its required lineage, evidence, semantic transformations, uncertainty, and certification requirements are satisfied.

The product layer does not impose a hierarchy ceiling.

## Current Sandbox evidence boundary

The architectural evidence model contains eight authoritative domains:

1. Authentication
2. Transactions
3. Balance
4. Identity
5. Assets
6. Liabilities
7. Investments
8. Statements

The **current Sandbox/runtime executable and certifiable boundary is seven domains**: Authentication, Transactions, Balance, Identity, Assets, Liabilities, and Investments. Statements is architecturally defined but **deferred until real banking**. Statements must not be simulated, fabricated, or represented as observed Sandbox evidence.

This boundary is a runtime state, not a reduction of the architectural eight-domain model.

## Certification rule

No report may claim to be evidence-grounded, certified, complete, or current merely because a report template exists. The publication boundary must independently verify the underlying intelligence and evidence state.
