# Iris Capability Roadmap

This roadmap tracks **capability state**, not artifact count. A capability is not complete because a file, schema, endpoint, or UI exists.

## Capability state model

Every major capability is evaluated through this chain:

`Architecture Defined → Contract Defined → Schema Implemented → Runtime Implemented → Independently Executable → Evidence Verified → Lineage Verified → Frontend Surfaced → User Controlled → Interaction Verified → Deployment Verified → End-to-End Certified`

A later state never implies an earlier state is certified unless the earlier state has been verified.

## 1. Continuity foundation
- [x] Master project state exists
- [x] Architecture ledger exists
- [x] Decision ledger exists
- [x] Automated status/session continuity foundations exist
- [ ] Master state checkpoint kept synchronized with every material implementation commit
- [ ] Roadmap state machine fully machine-readable and automatically reconciled with repository/runtime state

**Current state:** architecture/contract foundation established; documentation synchronization remains active work.

## 2. Plaid Product Capability Layer
- [x] Expanded authoritative Plaid product/catalog foundation
- [x] Product capability registry separating public capability from observed Item state
- [x] Deterministic product-selection decision boundary
- [x] Multi-Item aggregate selection semantics
- [x] Authorization, consent, entitlement, billing, cost, and observed-evidence dimensions represented independently
- [ ] Complete product-to-observation mapping certification across the supported universe
- [ ] Institution/connection availability certification
- [ ] Complete consent/authorization lifecycle certification
- [ ] Complete plan entitlement/user-charge policy certification
- [ ] Complete product evidence/coverage certification
- [ ] Selection explanation/audit trail certified end-to-end

**Current state:** substantial implementation exists; full evidence/runtime/certification chain remains incomplete.

## 3. Plaid Dashboard
- [x] Provider/source observability foundation
- [x] Product capability/source surfaces exist
- [x] Exact provider evidence/raw-observation inspection foundation exists
- [ ] Complete product-universe presentation
- [ ] Complete product-specific observed-data surfaces
- [ ] Connected institution/connection lifecycle states
- [ ] Availability/support/consent/authorization states
- [ ] Evidence coverage and freshness presentation
- [ ] Provider diagnostics and durable sync status
- [ ] Cost/entitlement presentation where appropriate
- [ ] Strict provider-only interpretation boundary verified across every surface

**Current state:** source observability foundation exists; authoritative dashboard completion is not certified.

## 4. Canonical Financial Life State
- [x] Canonical reconciliation foundation
- [x] Canonical transaction semantics foundation
- [x] Source-field observation materialization foundation
- [x] Source-field → intelligence binding foundation
- [ ] Complete canonical account semantics
- [ ] Complete transaction classification persistence and economic semantics
- [ ] Income/recurring income semantics
- [ ] Obligations/bills/subscriptions
- [ ] Liabilities/debt
- [ ] Assets/investments
- [ ] Merchant/category relationships
- [ ] Durable temporal state and historical observation lifecycle
- [ ] Evidence/freshness certification
- [ ] Field-level lineage certification
- [ ] Cross-domain relationship certification

**Current state:** foundation is substantive, but economic semantics, historical evidence lifecycle, and complete relational state are not certified.

## 5. Iris Feature Registry
- [x] Stable feature identity/versioning foundation
- [x] Prerequisites and required-evidence contract
- [x] Evidence coverage/readiness evaluator
- [x] Feature → analysis one-to-many publication mapping
- [x] Governed intelligence publication boundary
- [ ] Durable user activation/deactivation persistence and enforcement across all features
- [ ] Feature permissions/entitlements fully enforced
- [ ] Feature-level provenance/freshness/lineage certification
- [ ] Workspace routing certification
- [ ] Education/interactivity metadata fully surfaced

**Current state:** authoritative registry/publication foundation exists; user-control and end-to-end enforcement remain incomplete.

## 6. Iris Intelligence hierarchy

The hierarchy is a **recursive graph**, not a fixed maximum depth. The named families below are capability families; additional evidence-supported branches may continue indefinitely subject to governance, evidence, resource, and usefulness constraints.

### Core intelligence families
- [ ] Financial-life overview
- [ ] Money/account intelligence
- [ ] Cash-flow intelligence
- [ ] Spending intelligence
- [ ] Income intelligence
- [ ] Liquidity intelligence
- [ ] Bills/obligations intelligence
- [ ] Debt intelligence
- [ ] Net-worth intelligence
- [ ] Behavioral intelligence
- [ ] Pattern detection
- [ ] Anomaly detection
- [ ] Forecasting
- [ ] Risk intelligence
- [ ] Opportunity intelligence
- [ ] Scenario/counterfactual intelligence
- [ ] Decision intelligence
- [ ] Financial education

### Higher-order intelligence
- [ ] Statistical baselines and adaptive thresholds
- [ ] Evidence-grounded causal reasoning without unsupported causal claims
- [ ] Probabilistic forecasting and uncertainty propagation
- [ ] Optimization under explicit constraints
- [ ] Counterfactual state modeling
- [ ] Continuous intelligence/recomputation
- [ ] Proactive intelligence
- [ ] Conversational evidence-grounded Iris reasoning
- [ ] Outcome measurement
- [ ] Learning from verified outcomes
- [ ] Higher-order/emergent intelligence discovery

### Runtime status
- [x] Governed aggregate execution boundary
- [x] Capability planning/dependency ordering foundation
- [x] Capability operator registry
- [x] Temporal operator independently dispatchable through the governed dispatcher
- [ ] Independent capabilities executed through the full `executeIrisRun` persistence/certification path
- [ ] Remaining operator families independently dispatchable and verified
- [ ] Recursive capability graph execution certified

## 7. Recursive user experience
- [x] Iris shell/navigation foundation
- [x] Source-data exploration foundation
- [ ] Domain → subdomain navigation
- [ ] Entity context and detail
- [ ] Evidence graph traversal
- [ ] Relationship exploration
- [ ] Change explanations
- [ ] Intelligence interpretation surfaces
- [ ] Forecast/scenario workspaces
- [ ] Feature manager with real user controls
- [ ] Personalized Iris dashboard
- [ ] Cross-feature interaction
- [ ] Conversational Iris with evidence-grounded answers
- [ ] Education progression and user learning loop
- [ ] Proactive controls and notifications

**Current state:** strong exploration primitives exist; the complete recursive user experience is not certified.

## 8. Verification and release
- [x] Repository CI workflow foundation
- [ ] Clean dependency-installed backend test/build verification
- [ ] Clean frontend test/build verification
- [ ] Backend/frontend contract synchronization certification
- [ ] Provider-to-database reconciliation certification
- [ ] Evidence lineage verification
- [ ] RLS/ownership/security verification
- [ ] Durable sync cursor/update/remove lifecycle tests
- [ ] Webhook verification and durable processing/retry tests
- [ ] Round-up eligibility/reconciliation/idempotency certification
- [ ] Intelligence sufficiency/accuracy regression suite
- [ ] Render deployment verification for the current certified commit
- [ ] Supabase live verification against the authoritative migration state
- [ ] Plaid Sandbox end-to-end certification
- [ ] End-to-end observable user journey certification

## Current blocking principles

1. Never treat catalog metadata as observed financial evidence.
2. Never manufacture missing financial facts, values, transactions, balances, or provider observations.
3. Never collapse Plaid source observability into Iris interpretation.
4. Never mark a capability independently executable merely because an implementation file exists.
5. Never claim lineage, certification, or deployment verification without actually verifying it.
6. Never impose an arbitrary intelligence-depth ceiling; continue recursive branching when additional evidence can produce meaningful intelligence.
7. Never make unsupported causal claims.
8. Do not repair transitional legacy infrastructure blindly; reconcile it against the intended clean Iris architecture first.

## Completion definition

The roadmap is complete only when the implemented Iris capabilities satisfy their evidence, lineage, backend, frontend, user-control, explainability, education, deployment, and end-to-end interaction contracts. The hierarchy may continue beyond the currently named capabilities wherever governed evidence supports additional meaningful intelligence.
