# IRIS Intelligence Library

## Purpose

This document is the governed naming and semantic-definition library for IRIS intelligence. It defines stable names, identities, meanings, boundaries, evidence requirements, and composition roles for intelligence concepts without imposing a maximum intelligence depth.

This is an **intelligence-definition library**, not a claim that every entry is currently implemented, independently executable, evidence-certified, or user-visible. Implementation state remains governed by `docs/ROADMAP.md` and runtime evidence.

IRIS must never create a user-specific factual value merely because a library entry exists. A library definition describes what an intelligence node means and what would be required to instantiate it truthfully.

## Non-negotiable semantic rules

1. **No evidence, no factual value.**
2. **No observation, no fabricated observation.**
3. **Unknown is not zero.** Zero requires an observed or mathematically established basis.
4. **Available is not consented.** Provider availability, authorization, response receipt, persistence, normalization, evidence certification, and intelligence consumption remain separate states.
5. **A dependency reference is not proof of dependency consumption.**
6. **A dependency read is not automatically proof of semantic sufficiency.** The transformation must also be independently verifiable where the contract requires it.
7. **A graph node is not automatically certified intelligence.** Persistence establishes storage, not truth.
8. **Predictions are not observations.** Hypothetical scenarios are not observed state.
9. **Correlation is not causation.** Causal language requires appropriate evidence and reasoning support.
10. **Recursive depth has no artificial ceiling.** Resource, safety, evidence, semantic, and governance constraints may stop an execution, but they do not define a maximum intelligence level.
11. **Cross-domain synthesis must use compatible evidence and preserve exact lineage.**
12. **Historical facts must not be silently rewritten by learning.** Learning creates versioned changes with provenance.

## Naming convention

Each library entry has:

- **ID** — stable machine-oriented semantic identity.
- **Name** — human-readable intelligence name.
- **Definition** — exact meaning of the intelligence.
- **Inputs** — evidence or upstream intelligence required to instantiate it.
- **Output** — the kind of state/result it produces.
- **Boundary** — what it must not claim.
- **Composition role** — how it can participate in higher-order reasoning.
- **Status** — conceptual library status only; it does not override the roadmap.

IDs are semantic identities, not UI labels. A future implementation may version an operator independently from the identity of the intelligence concept.

---

# 1. Root intelligence

## IRIS.001 — IRIS
**Name:** Iris Financial-Life Intelligence Operating System

**Definition:** The governing intelligence system that observes permitted financial-life evidence, reconciles it into defensible state, derives increasingly higher-order intelligence through explicit relationships and transformations, preserves provenance and uncertainty, and exposes evidence-grounded reports, answers, recommendations, scenarios, and other user-controlled intelligence products.

**Inputs:** All permitted evidence domains and all valid derived intelligence available within the user's governed evidence boundary.

**Output:** A governed intelligence graph and its publication surfaces. Iris itself is the root boundary, not merely another analytical report.

**Boundary:** Iris cannot manufacture observations, infer unavailable facts as facts, treat provider capability as observed user data, or certify its own results solely because a computation completed.

**Composition role:** Root parent and governing semantic boundary for every downstream intelligence node.

**Status:** Architectural definition.

---

# 2. Authoritative Level-2 domains

These eight domains are authoritative source/evidence domains. They are not the complete intelligence hierarchy and are not a depth limit.

## IRIS.DOMAIN.AUTH — Authentication
**Name:** Authentication Intelligence Domain

**Definition:** The domain representing the authenticated connection and identity-control state necessary to establish which principal is authorized to access a governed IRIS data boundary.

**Inputs:** Authentication events, authorization state, governed user/session identity, provider connection state where applicable.

**Output:** Authentication/authorization state and evidence about access boundaries.

**Boundary:** Authentication state does not itself establish financial facts.

**Composition role:** Establishes who may access or govern evidence; can constrain every downstream intelligence operation.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.TXN — Transactions
**Name:** Transaction Intelligence Domain

**Definition:** The domain representing observed transaction records and their canonical financial semantics, including direction, economic role, account relationship, merchant/entity relationship, classification, timing, and evidence lineage.

**Inputs:** Provider transaction observations and field-level source evidence.

**Output:** Canonical transaction state and transaction-derived intelligence inputs.

**Boundary:** A transaction domain cannot claim an interpretation unsupported by observed fields or governed classification rules.

**Composition role:** Primary evidence substrate for cash flow, spending, recurrence, behavior, patterns, anomalies, and many higher-order financial-life compositions.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.BAL — Balance
**Name:** Balance Intelligence Domain

**Definition:** The domain representing observed account balance states and their temporal relationship to accounts, observation timestamps, and evidence boundaries.

**Inputs:** Provider balance observations.

**Output:** Observed balance state and balance-derived temporal/liquidity inputs.

**Boundary:** A missing balance observation is not a zero balance.

**Composition role:** Supports liquidity, cash-position, reconciliation, spending context, and temporal state reasoning.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.ID — Identity
**Name:** Identity Intelligence Domain

**Definition:** The domain representing provider-observed identity attributes and their evidence status, including the distinction between observed identity information and unverified assumptions.

**Inputs:** Provider identity observations and source-field evidence.

**Output:** Evidence-qualified identity state.

**Boundary:** Identity observations must not be expanded into unsupported demographic, legal, behavioral, or financial claims.

**Composition role:** Supplies identity context where legitimately relevant and authorized.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.ASSET — Assets
**Name:** Asset Intelligence Domain

**Definition:** The domain representing observed asset-related financial state, including asset accounts, positions, valuations, and other provider-supported asset observations.

**Inputs:** Provider asset observations and related account/evidence records.

**Output:** Evidence-qualified asset state.

**Boundary:** An absent asset observation does not establish absence of assets.

**Composition role:** Supports net worth, liquidity context, opportunity, risk, and cross-domain financial-life synthesis.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.LIAB — Liabilities
**Name:** Liability Intelligence Domain

**Definition:** The domain representing observed liability and debt-related financial state, including balances, obligations, accounts, and provider-supported liability attributes.

**Inputs:** Provider liability observations and related account/evidence records.

**Output:** Evidence-qualified liability state.

**Boundary:** A liability candidate is not automatically a verified obligation, and missing liability data does not prove no debt exists.

**Composition role:** Supports debt intelligence, obligation reasoning, risk, cash-flow pressure, and net-worth composition.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.INV — Investments
**Name:** Investment Intelligence Domain

**Definition:** The domain representing observed investment holdings, positions, securities, valuations, transactions, and related provider-supported investment state.

**Inputs:** Provider investment observations and source-field evidence.

**Output:** Evidence-qualified investment state.

**Boundary:** Projected investment outcomes remain modeled or predicted rather than observed unless directly evidenced.

**Composition role:** Supports asset composition, net worth, concentration, risk, opportunity, and scenario reasoning.

**Status:** Authoritative domain definition.

## IRIS.DOMAIN.STMT — Statements
**Name:** Statement Intelligence Domain

**Definition:** The domain representing provider-observed statement documents and statement-derived evidence that can establish historical financial information over explicit reporting periods.

**Inputs:** Provider statements and statement metadata/content observations.

**Output:** Statement evidence and statement-derived facts within the documented period and evidence boundary.

**Boundary:** A statement period cannot be extended beyond its actual evidence span without additional evidence.

**Composition role:** Supports historical reconciliation, period comparison, verification, and longitudinal financial-life reasoning.

**Status:** Authoritative domain definition.

---

# 3. Foundational intelligence

## IRIS.FND.001 — Evidence State
**Name:** Evidence State Intelligence

**Definition:** The explicit state of whether a potential data element is unavailable, available, consented, authorized, received, persisted, normalized, certified, consumable, or consumed.

**Purpose:** Prevents provider capability and pipeline state from being confused with actual evidence.

**Boundary:** A provider product being available never becomes an observed user fact merely because the product exists.

## IRIS.FND.002 — Evidence Boundary
**Name:** Exact Evidence Boundary Intelligence

**Definition:** The precise temporal, provider, item, account, field, run, and observation boundary within which a derived result is allowed to make claims.

**Purpose:** Prevents computations from silently reaching outside the evidence actually available to the execution.

## IRIS.FND.003 — Evidence Freshness
**Name:** Evidence Freshness Intelligence

**Definition:** A qualified representation of how current an observation is relative to the intelligence being requested, including observation time and relevant synchronization boundaries.

**Boundary:** Old evidence may remain valid historical evidence; stale does not mean false.

## IRIS.FND.004 — Evidence Sufficiency
**Name:** Evidence Sufficiency Intelligence

**Definition:** Determination of whether the available evidence is sufficient for a particular intelligence contract.

**Boundary:** Insufficient evidence produces an insufficient/unknown result rather than an invented completion.

## IRIS.FND.005 — Evidence Lineage
**Name:** Evidence Lineage Intelligence

**Definition:** The exact trace connecting a result to the observations, fields, canonical records, upstream nodes, transformations, execution, and versions that produced it.

**Boundary:** Provenance metadata must not claim transformations that did not occur.

---

# 4. Canonical state intelligence

## IRIS.CAN.001 — Financial Life State
**Name:** Canonical Financial-Life State

**Definition:** A reconciled representation of the user's observed financial-life state at a defined evidence boundary, combining authoritative domain observations without inventing missing domains.

**Inputs:** Canonical observations across the eight domains.

**Output:** Governed state snapshot with explicit unknown and insufficient-evidence states.

## IRIS.CAN.002 — Account State
**Name:** Account State Intelligence

**Definition:** Evidence-qualified state of an individual financial account, including its provider identity, account relationships, observed balance state, transaction activity, and supported capabilities.

**Boundary:** Account capability is not account activity.

## IRIS.CAN.003 — Transaction Semantic State
**Name:** Transaction Semantic State

**Definition:** The normalized semantic interpretation of an observed transaction, including transaction direction, economic role, class, category, merchant/entity relationships, temporal attributes, and classification confidence where applicable.

**Boundary:** Unknown classification remains unknown rather than being forced into a convenient category.

## IRIS.CAN.004 — Economic Flow State
**Name:** Economic Flow State

**Definition:** A canonical representation of observed inflows, outflows, transfers, reversals, and other economic roles after explicit transaction semantics have been established.

**Boundary:** Raw transaction signs are not automatically economic meaning.

## IRIS.CAN.005 — Financial Entity State
**Name:** Financial Entity State

**Definition:** Evidence-qualified state for entities such as accounts, merchants, transaction classes, obligations, income sources, and investment positions and their relationships.

---

# 5. Temporal intelligence

## IRIS.TMP.001 — Observation Span
**Name:** Observation Span Intelligence

**Definition:** The exact period covered by available observations, including gaps and density, without assuming that an unobserved period was inactive.

## IRIS.TMP.002 — Activity Density
**Name:** Activity Density Intelligence

**Definition:** Measurement of how densely observations occur across a defined time window, preserving the distinction between inactivity and missing evidence.

## IRIS.TMP.003 — Temporal Aggregation
**Name:** Evidence-Bound Temporal Aggregation

**Definition:** Deterministic aggregation of observed financial events over an explicitly defined period and evidence boundary.

## IRIS.TMP.004 — Recurrence
**Name:** Recurrence Intelligence

**Definition:** Evidence-based detection of repeated financial events or behaviors across time, including interval regularity, amount stability, and recurrence confidence.

**Boundary:** A small number of similar events does not automatically establish a recurring obligation.

## IRIS.TMP.005 — Historical Baseline
**Name:** Historical Baseline Intelligence

**Definition:** A reference representation derived from the user's actual historical observations for comparison against current state.

**Boundary:** Baselines must respect evidence windows, gaps, seasonality where supported, and changing behavior.

---

# 6. Financial-life intelligence

## IRIS.FIN.001 — Financial Overview
**Name:** Financial-Life Overview Intelligence

**Definition:** A concise, evidence-qualified synthesis of the most material observed financial state across domains available within the current evidence boundary.

**Boundary:** It must not imply complete financial visibility when domains are missing or incomplete.

## IRIS.FIN.002 — Money State
**Name:** Money and Account Intelligence

**Definition:** Integrated understanding of observed account structure, balances, flows, and account relationships within the available evidence.

## IRIS.FIN.003 — Cash Flow State
**Name:** Cash-Flow Intelligence

**Definition:** Evidence-grounded representation of observed inflows, outflows, transfers, net movement, timing, concentration, and cash-flow stability over a defined period.

## IRIS.FIN.004 — Spending State
**Name:** Spending Intelligence

**Definition:** Evidence-grounded analysis of observed consumer or financial outflows by time, category, merchant/entity, account, and economic role.

## IRIS.FIN.005 — Income State
**Name:** Income Intelligence

**Definition:** Evidence-grounded analysis of observed inflows that meet the governed semantic criteria for income, including source, timing, recurrence, concentration, and variability where supported.

## IRIS.FIN.006 — Liquidity State
**Name:** Liquidity Intelligence

**Definition:** Assessment of observed available financial resources and near-term obligations within the evidence boundary, explicitly separating observed liquidity from projected liquidity.

## IRIS.FIN.007 — Obligation Candidate
**Name:** Obligation-Candidate Intelligence

**Definition:** Evidence-based identification of transactions or recurring patterns that may represent financial obligations without promoting the candidate to a verified obligation without sufficient evidence.

## IRIS.FIN.008 — Verified Obligation
**Name:** Verified Obligation Intelligence

**Definition:** A financial obligation supported by sufficient evidence to establish its existence and relevant attributes within a defined evidence boundary.

## IRIS.FIN.009 — Debt State
**Name:** Debt Intelligence

**Definition:** Evidence-qualified representation of debt balances, payment activity, obligations, and debt-related relationships supported by available liability evidence.

## IRIS.FIN.010 — Net Worth State
**Name:** Net-Worth Intelligence

**Definition:** A mathematically derived relationship among observed assets and liabilities at a defined time/boundary, with missing-domain limitations made explicit.

**Boundary:** Partial asset/liability visibility cannot be presented as complete net worth.

---

# 7. Relational and behavioral intelligence

## IRIS.REL.001 — Financial Relationship
**Name:** Financial Relationship Intelligence

**Definition:** Identification and qualification of meaningful relationships among accounts, transactions, merchants, entities, categories, obligations, income sources, assets, liabilities, and temporal states.

## IRIS.REL.002 — Transaction Topology
**Name:** Transaction Topology Intelligence

**Definition:** Structural representation of how observed transaction activity connects financial entities, categories, accounts, and time.

## IRIS.REL.003 — Concentration
**Name:** Financial Concentration Intelligence

**Definition:** Measurement of how much observed financial activity is concentrated in particular entities, categories, accounts, or sources over a defined period.

## IRIS.BHV.001 — Behavioral State
**Name:** Financial Behavior Intelligence

**Definition:** Evidence-grounded characterization of repeated observed financial behavior over time, including stability, drift, recurrence, and changing patterns.

**Boundary:** Behavior descriptions must remain tied to observed financial actions and must not become unsupported personality or psychological claims.

## IRIS.BHV.002 — Category Drift
**Name:** Category Drift Intelligence

**Definition:** Detection of meaningful changes in the distribution or semantics of observed activity across categories over time.

## IRIS.PAT.001 — Pattern State
**Name:** Pattern Intelligence

**Definition:** Detection of repeatable structures in observed financial activity that exceed arbitrary single-event interpretation and meet the applicable evidence threshold.

## IRIS.PAT.002 — Change Point
**Name:** Financial Change-Point Intelligence

**Definition:** Detection of a statistically or semantically meaningful change in an observed financial series relative to its historical reference.

---

# 8. Statistical and anomaly intelligence

## IRIS.STAT.001 — Robust Reference
**Name:** Robust Statistical Reference Intelligence

**Definition:** A statistical representation of actual historical observations designed to resist distortion from outliers, missing periods, and irregular activity where the available evidence permits.

## IRIS.STAT.002 — Adaptive Threshold
**Name:** Adaptive Historical Threshold Intelligence

**Definition:** A threshold derived from the user's observed historical behavior rather than an arbitrary universal constant, with evidence window and methodology preserved.

## IRIS.ANM.001 — Anomaly State
**Name:** Anomaly Intelligence

**Definition:** Identification of observed activity that materially departs from an appropriate historical, relational, statistical, or semantic reference.

**Boundary:** An anomaly means unusual relative to the selected reference; it does not automatically mean fraudulent, harmful, or erroneous.

## IRIS.ANM.002 — Material Anomaly
**Name:** Material Financial Anomaly Intelligence

**Definition:** An anomaly whose magnitude, recurrence, context, or relationship makes it materially relevant to the user's financial state or requested analysis.

---

# 9. Causal, predictive, and scenario intelligence

## IRIS.CAU.001 — Causal Candidate
**Name:** Causal-Relationship Candidate Intelligence

**Definition:** A structured representation of a possible causal relationship supported by temporal ordering, association, mechanism evidence, or other relevant evidence without claiming causation prematurely.

## IRIS.CAU.002 — Supported Causal Reasoning
**Name:** Evidence-Grounded Causal Intelligence

**Definition:** Causal reasoning whose claim strength is limited to the evidence and methodology actually supporting the relationship.

**Boundary:** Correlation, coincidence, and temporal sequence alone do not justify unrestricted causal claims.

## IRIS.PRD.001 — Forward Projection
**Name:** Constrained Forward Projection Intelligence

**Definition:** A forward estimate derived from actual observed state and explicitly declared assumptions, constraints, and methodology.

## IRIS.PRD.002 — Probabilistic Forecast
**Name:** Probabilistic Financial Forecast Intelligence

**Definition:** A probability-aware prediction of future financial state using a defined methodology, target, horizon, evidence set, uncertainty representation, and refresh conditions.

**Boundary:** Forecast output remains predicted/modelled state, never observed fact.

## IRIS.SCN.001 — Scenario
**Name:** Financial Scenario Intelligence

**Definition:** A hypothetical future state generated by changing explicit assumptions while preserving the distinction between scenario inputs and observed reality.

## IRIS.SCN.002 — Counterfactual
**Name:** Financial Counterfactual Intelligence

**Definition:** A structured hypothetical analysis asking how an outcome might differ if a defined condition had been different, with assumptions and limitations made explicit.

**Boundary:** Counterfactual results are never written into observed state.

---

# 10. Risk, opportunity, decision, and recommendation intelligence

## IRIS.RSK.001 — Risk State
**Name:** Financial Risk Intelligence

**Definition:** Evidence-grounded identification and qualification of conditions that may increase the probability or severity of an adverse financial outcome.

**Boundary:** Risk is not certainty of loss.

## IRIS.OPP.001 — Opportunity State
**Name:** Financial Opportunity Intelligence

**Definition:** Evidence-grounded identification of potentially beneficial actions or conditions supported by the user's observed state and constraints.

**Boundary:** Opportunity does not mean guaranteed benefit.

## IRIS.DEC.001 — Decision State
**Name:** Decision Intelligence

**Definition:** Structured comparison of feasible choices using observed state, constraints, predicted consequences, scenario results, risks, opportunities, and explicit uncertainty.

## IRIS.REC.001 — Recommendation State
**Name:** Recommendation Intelligence

**Definition:** A proposed action or option generated from evidence-grounded decision reasoning, with the relevant rationale, assumptions, uncertainty, and limitations exposed.

**Boundary:** A recommendation must not imply certainty, authorization, or execution merely because Iris recommends it.

## IRIS.CNS.001 — Consequence State
**Name:** Consequence Intelligence

**Definition:** Analysis of likely or modeled downstream effects of a decision, recommendation, or scenario across the evidence-supported financial-life graph.

**Boundary:** Modeled consequences remain modeled until independently observed.

---

# 11. Outcome and learning intelligence

## IRIS.OUT.001 — Outcome State
**Name:** Observed Outcome Intelligence

**Definition:** The observed result of a prior decision, recommendation, scenario, or event when sufficient evidence establishes what actually occurred.

**Boundary:** A predicted result is not an observed outcome.

## IRIS.LRN.001 — Learning State
**Name:** Verified-Outcome Learning Intelligence

**Definition:** Versioned adaptation of models, rules, thresholds, or reasoning strategies using verified outcomes, prediction error, changing observed behavior, or explicit user feedback within governance boundaries.

**Boundary:** Learning cannot silently rewrite historical observations.

## IRIS.LRN.002 — Prediction Error
**Name:** Prediction-Error Intelligence

**Definition:** Measured difference between a prior prediction and the subsequently observed outcome, using the exact prediction and outcome lineage.

## IRIS.LRN.003 — Baseline Evolution
**Name:** Baseline-Evolution Intelligence

**Definition:** Evidence-backed recognition that the user's historical reference behavior has changed sufficiently to justify a versioned baseline update.

---

# 12. Higher-order and recursive intelligence

## IRIS.HO.001 — Cross-Domain Synthesis
**Name:** Cross-Domain Financial-Life Synthesis

**Definition:** A derived intelligence result that combines evidence or derived intelligence from multiple authoritative domains where the semantic relationship between those inputs is explicitly governed and traceable.

**Boundary:** Combining two datasets is not sufficient; the composition must be semantically meaningful and evidence-compatible.

## IRIS.HO.002 — Higher-Order Intelligence
**Name:** Higher-Order Intelligence

**Definition:** Intelligence derived from one or more already-derived intelligence nodes rather than directly from raw or canonical observations.

**Boundary:** Higher-order does not mean more truthful automatically. Every additional derivation adds another transformation that must remain traceable.

## IRIS.HO.003 — Recursive Composition
**Name:** Recursive Intelligence Composition

**Definition:** The governed process by which newly derived intelligence becomes an eligible upstream input to subsequent intelligence generation when semantic compatibility, evidence sufficiency, lineage, resource limits, and safety constraints permit.

**Boundary:** Recursive composition has no predefined semantic depth ceiling, but any individual execution may be bounded by resources, safety, cycles, evidence, or governance.

## IRIS.HO.004 — Emergent Intelligence
**Name:** Emergent Intelligence

**Definition:** A materially useful intelligence structure discovered through valid composition of existing evidence and derived nodes that was not required to be represented as a finite predefined capability entry.

**Boundary:** “Emergent” never means unexplained, fabricated, or exempt from lineage. Its inputs and transformation must remain inspectable.

## IRIS.HO.005 — Arbitrary Derived Intelligence Node
**Name:** Arbitrary Derived-Intelligence Node

**Definition:** A persistable intelligence node whose semantic identity and derivation are valid even when the node does not correspond to a finite capability-registry entry.

**Required lineage:** Exact upstream node IDs, recursive ancestry, derivation operator/version, evidence boundary, execution context, deterministic node identity/hash, and applicable semantic transformation evidence.

## IRIS.HO.006 — Recursive Lineage
**Name:** Recursive Intelligence Lineage

**Definition:** The complete ancestry chain through which a derived intelligence node ultimately connects to its evidence and intermediate intelligence predecessors.

**Boundary:** Lineage depth is descriptive, not a semantic ceiling.

---

# 13. Semantic transformation intelligence

## IRIS.SEM.001 — Dependency Consumption
**Name:** Semantic Dependency Consumption

**Definition:** Evidence that a declared upstream intelligence result was actually accessed by the downstream computation where the downstream contract requires that dependency.

**Boundary:** A recorded dependency ID alone is not proof of consumption.

## IRIS.SEM.002 — Semantic Transformation
**Name:** Semantic Transformation Intelligence

**Definition:** The explicit relationship describing how an upstream field, value, structure, or intelligence contributes to a downstream field, value, structure, or intelligence under a named operator/version.

## IRIS.SEM.003 — Transformation Edge
**Name:** Semantic Transformation Edge

**Definition:** A persisted, inspectable graph relationship connecting a consumed upstream intelligence result to the downstream result and identifying the transformation semantics that relate them.

**Boundary:** Edge persistence is a proof foundation, not by itself semantic certification.

## IRIS.SEM.004 — Semantic Sufficiency
**Name:** Independent Semantic Sufficiency Intelligence

**Definition:** An independently evaluated determination that the declared upstream dependencies and transformations are sufficient for the downstream intelligence contract, rather than merely present or read.

**Boundary:** Runtime success cannot substitute for semantic sufficiency verification.

## IRIS.SEM.005 — Semantic Contract
**Name:** Intelligence Semantic Contract

**Definition:** A formal declaration of the meaning, required dependencies, required semantic paths, transformation obligations, evidence constraints, and output boundary of an intelligence operator.

---

# 14. Governance and certification intelligence

## IRIS.GOV.001 — Execution Integrity
**Name:** Intelligence Execution Integrity

**Definition:** Verification that an intelligence execution stayed within its planned capabilities, dependencies, evidence boundary, resource budget, and safety rules.

## IRIS.GOV.002 — Cycle Detection
**Name:** Recursive Cycle-Safety Intelligence

**Definition:** Detection and controlled rejection or containment of recursive dependency cycles that could otherwise create infinite execution.

**Boundary:** Cycle rejection is an execution-safety mechanism and does not impose a maximum intelligence hierarchy depth.

## IRIS.GOV.003 — Certification State
**Name:** Intelligence Certification State

**Definition:** The governed status of whether a particular result has passed the required evidence, execution, lineage, semantic, and product-publication checks.

**Boundary:** Certification cannot be inferred from capability registration, test existence, or database persistence alone.

## IRIS.GOV.004 — Publication Boundary
**Name:** Intelligence Publication Boundary

**Definition:** The final governance boundary deciding whether a derived result may be surfaced as a user-facing product, report, answer, recommendation, scenario, or other intelligence artifact.

## IRIS.GOV.005 — Uncertainty State
**Name:** Intelligence Uncertainty and Limitation State

**Definition:** Explicit representation of uncertainty, missing evidence, assumptions, confidence limitations, methodological constraints, and other conditions that affect interpretation.

---

# 15. Report-product layer

Report products are user-facing publications of intelligence. They are not intelligence hierarchy levels.

## IRIS.REPORT.001 — Financial-Life Overview Report
**Definition:** User-facing publication of the highest-value evidence-grounded current financial-life state available within the user's actual evidence boundary.

## IRIS.REPORT.002 — Cash-Flow Report
**Definition:** User-facing publication of observed cash-flow behavior, period comparisons, sources, outflows, timing, and material changes supported by evidence.

## IRIS.REPORT.003 — Spending Report
**Definition:** User-facing publication of observed spending behavior, concentration, category movement, recurring activity, and material anomalies supported by evidence.

## IRIS.REPORT.004 — Income Report
**Definition:** User-facing publication of evidence-qualified income sources, timing, recurrence, stability, and changes.

## IRIS.REPORT.005 — Liquidity Report
**Definition:** User-facing publication of observed liquidity state and relevant near-term financial pressures within the available evidence boundary.

## IRIS.REPORT.006 — Debt Report
**Definition:** User-facing publication of verified or explicitly qualified debt/liability state and related payment behavior supported by liability evidence.

## IRIS.REPORT.007 — Net-Worth Report
**Definition:** User-facing publication of mathematically derived net worth where asset and liability evidence is sufficiently complete for the stated boundary; otherwise it must clearly qualify partial visibility.

## IRIS.REPORT.008 — Anomaly Report
**Definition:** User-facing publication of materially unusual observed financial activity with the comparison reference and evidence boundary exposed.

## IRIS.REPORT.009 — Risk Report
**Definition:** User-facing publication of evidence-grounded financial risks, their supporting conditions, uncertainty, and relevant modeled consequences.

## IRIS.REPORT.010 — Opportunity Report
**Definition:** User-facing publication of evidence-grounded opportunities and their supporting rationale, constraints, and uncertainty.

## IRIS.REPORT.011 — Decision Report
**Definition:** User-facing comparison of available options and modeled consequences based on actual observed state and explicit assumptions.

## IRIS.REPORT.012 — Recommendation Report
**Definition:** User-facing presentation of one or more evidence-grounded recommended actions with rationale, assumptions, uncertainty, and non-execution boundaries.

## IRIS.REPORT.013 — Scenario Report
**Definition:** User-facing presentation of hypothetical financial scenarios and counterfactual outcomes, clearly separated from observed state.

## IRIS.REPORT.014 — Intelligence Lineage Report
**Definition:** User-facing inspection surface showing where a material intelligence result came from, including upstream evidence, derived nodes, transformations, timestamps, and limitations.

## IRIS.REPORT.015 — Evidence Coverage Report
**Definition:** User-facing description of which financial-life domains and evidence types are actually observed, which are unavailable or incomplete, and how that affects available intelligence.

---

# 16. Recursive naming model for future intelligence

The library deliberately does **not** enumerate every future intelligence node. Instead, new nodes must receive a semantic identity that describes their actual meaning.

A valid future node should answer:

1. **What is it?** — precise semantic name.
2. **Why does it exist?** — useful analytical purpose.
3. **What evidence or upstream intelligence supports it?**
4. **What transformation produces it?**
5. **What exactly does the output mean?**
6. **What does it explicitly not mean?**
7. **What is its evidence boundary?**
8. **What uncertainty or limitations apply?**
9. **What exact upstream nodes produced it?**
10. **Can another valid intelligence node consume it?**
11. **If consumed, what semantic transformation connects the two?**
12. **Can the result be independently verified and, if appropriate, certified for publication?**

A future intelligence node may therefore be conceptually named using patterns such as:

`<domain> + <state/relationship/pattern> + <time/context>`

or

`<upstream intelligence> + <transformation> + <new semantic state>`

The naming system must describe meaning rather than merely describing implementation mechanics.

---

# 17. Status interpretation

The presence of a name in this library means only that IRIS has a governed semantic definition for that concept.

It does **not** mean:

- the operator is implemented;
- the operator is registered;
- real provider evidence currently exists;
- the operator has been independently executed;
- semantic dependency consumption has been proven;
- the result has been persisted;
- the result has been certified;
- the result is currently available to a user;
- the corresponding report is enabled;
- the corresponding report has passed end-to-end verification.

Those states must be established independently by repository, database, runtime, test, deployment, evidence, and certification evidence.

# 18. Governing principle

**IRIS is allowed to become more intelligent without becoming less truthful.**

The hierarchy may continue recursively and indefinitely in semantic depth whenever valid evidence, meaningful relationships, explicit transformations, computational resources, and governance permit. The system must stop a particular derivation when evidence, semantics, safety, resources, or certification requirements are insufficient—not because an arbitrary intelligence level has been reached.
