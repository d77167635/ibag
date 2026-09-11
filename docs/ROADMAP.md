# Iris Capability Roadmap

This roadmap tracks **capability state and product-readiness state**, not artifact count.

IRIS is a recursive financial-life intelligence operating system. Its intelligence hierarchy is a graph with no artificial semantic depth ceiling. **The hierarchy is internal reasoning machinery. The user products are the evidence-grounded reports and analytics produced from that hierarchy.**

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
- Intelligence nodes are internal semantic reasoning objects.
- Report products are user-facing publications generated from one or more intelligence nodes.
- A report name should be centered on the most important, material, empowering, explanatory, educational, or actionable supported intelligence contained in that report.
- A report title must never make a stronger claim than its underlying intelligence.
- Product availability must depend on evidence state, implementation state, certification state, subscription entitlement, and user activation; these states must remain distinct.
- During beta, intended report-product access is free, but free access never creates missing evidence.

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

### Not yet certified

- [ ] Persisted product catalog schema.
- [ ] Product-to-intelligence dependency model.
- [ ] Headline-intelligence selection runtime.
- [ ] Evidence-bound report composition runtime.
- [ ] Dynamic report-name generation runtime.
- [ ] Subscription entitlement runtime.
- [ ] User activation/deactivation runtime.
- [ ] Interactive Library UI.
- [ ] Interactive Report Catalog UI.
- [ ] Report → intelligence → evidence traversal.
- [ ] Evidence → intelligence → report traversal.
- [ ] Product publication certification.
- [ ] End-to-end product certification.

These unchecked states are intentional. Documentation does not count as runtime implementation or certification.

## Recursive intelligence hierarchy

The intelligence hierarchy remains unbounded in semantic depth. A report product may consume intelligence from any valid depth, provided its required lineage, evidence, semantic transformations, uncertainty, and certification requirements are satisfied.

The product layer does not impose a hierarchy ceiling.

## Certification rule

No report may claim to be evidence-grounded, certified, complete, or current merely because a report template exists. The publication boundary must independently verify the underlying intelligence and evidence state.
