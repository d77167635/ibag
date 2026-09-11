# IRIS Intelligence Library

## Purpose and product boundary

This document is the canonical **IRIS intelligence-definition library**. It names and precisely defines the intelligence that exists inside the IRIS intelligence hierarchy.

**These entries are intelligence, not products.**

IRIS intelligence is the internal reasoning substrate: observations become governed state; governed state can produce semantic interpretations; interpretations can participate in temporal, relational, behavioral, statistical, anomaly, causal, predictive, scenario, decision, consequence, outcome, learning, cross-domain, higher-order, and recursively derived intelligence.

The hierarchy has **no artificial maximum semantic depth**. The names below establish stable semantic concepts where those concepts are useful and governable. They do not constitute a finite list of everything IRIS can ever know or derive.

The **products** are the enormous and continuously expandable set of user-facing reports, analyses, explanations, comparisons, alerts, summaries, forecasts, scenarios, recommendations, and other report instances that the intelligence hierarchy can produce from actual evidence and valid derived intelligence. A report product is an output/publication of intelligence; it is not itself a hierarchy level or an intelligence definition.

Therefore:

`Evidence → Intelligence Graph → Higher-Order / Recursive Intelligence → Report Product`

The same intelligence can contribute to many different reports, and one report can combine many intelligence nodes. Report abundance must come from real evidence, valid composition, materiality, and usefulness—not from inventing financial facts or manufacturing placeholder reports.

This library does **not** claim that every named intelligence is currently implemented, independently executable, evidence-certified, or user-visible. Runtime implementation and certification remain governed by `docs/ROADMAP.md` and actual runtime evidence.

## Non-negotiable semantic rules

1. **No evidence, no factual value.**
2. **No observation, no fabricated observation.**
3. **Unknown is not zero.** Zero requires an observed or mathematically established basis.
4. **Available is not consented.** Provider availability, authorization, response receipt, persistence, normalization, evidence certification, intelligence consumption, and actual use remain separate states.
5. **A dependency reference is not proof of dependency consumption.**
6. **A dependency read is not automatically proof of semantic sufficiency.** Required transformations must be independently verifiable where the contract requires them.
7. **A persisted graph node is not automatically certified intelligence.** Persistence proves storage, not truth.
8. **Predictions are not observations.**
9. **Scenarios and counterfactuals are hypothetical outputs, not observed state.**
10. **Correlation is not causation.** Causal language requires appropriate evidence and reasoning support.
11. **Recursive depth has no artificial ceiling.** Resource, safety, evidence, semantic, and governance limits may stop an execution; they do not define a maximum intelligence level.
12. **Cross-domain intelligence must use compatible evidence and preserve exact lineage.**
13. **Learning cannot silently rewrite historical facts.** Changes to models, rules, or interpretations require versioning and provenance.
14. **A missing observation does not prove absence.**
15. **A capability/operator is not the intelligence itself.** Operators are execution machinery that instantiate intelligence definitions.
16. **A report is not the intelligence itself.** Reports are publication products generated from intelligence.

## Intelligence entry specification

Every named intelligence concept should eventually have these semantic fields:

- **ID** — stable machine-oriented semantic identity.
- **Name** — precise human-readable intelligence name.
- **Definition** — extremely specific statement of what the intelligence means.
- **Question answered** — the class of question this intelligence can legitimately address.
- **Evidence inputs** — observations and evidence domains that can support it.
- **Upstream intelligence** — previously derived intelligence that may be legitimately consumed.
- **Transformation** — what semantic operation turns inputs into this intelligence.
- **Output state** — what the intelligence actually represents.
- **Temporal scope** — the relevant observation period or point-in-time boundary.
- **Evidence boundary** — exact permitted evidence scope.
- **Uncertainty** — known uncertainty, limitations, and insufficient-evidence conditions.
- **Boundary** — claims the intelligence must not make.
- **Composition role** — how the intelligence can participate in higher-order intelligence.
- **Lineage requirement** — exact upstream observations/nodes and transformations that must be preserved.
- **Product potential** — classes of reports that may consume the intelligence, without making those reports part of the intelligence definition.
- **Status** — conceptual definition only; implementation/certification is determined elsewhere.

IDs are semantic identities, not UI labels. Operator versions may change independently from the semantic identity of the intelligence concept.

---

# 1. ROOT INTELLIGENCE

## IRIS.001 — IRIS Financial-Life Intelligence Operating System

**Name:** IRIS

**Extremely detailed description:** IRIS is the governing intelligence system that receives permitted evidence, establishes the exact evidence boundary, reconciles observations into defensible state, identifies semantic relationships, derives increasingly higher-order intelligence, preserves uncertainty and provenance, and recursively composes valid intelligence into further intelligence when evidence, semantics, resources, and governance permit. IRIS is the root of the intelligence graph and the authority governing whether a downstream claim may exist at all. It is not a report, dashboard, product card, or single analytical capability. It is the complete intelligence substrate from which user-facing reports and other products are generated.

**Question answered:** What can IRIS truthfully know, derive, relate, model, predict, test, recommend, and learn from the evidence actually available within the governed boundary?

**Inputs:** All permitted authoritative evidence and all valid derived intelligence whose lineage remains intact.

**Transformation:** Governs the full chain from observation through canonicalization, semantic derivation, relational composition, temporal reasoning, modeling, decision reasoning, outcome interpretation, learning, and recursive composition.

**Output:** Governed intelligence nodes and relationships, not a single report.

**Boundary:** IRIS cannot manufacture observations, turn unavailable provider data into user facts, silently fill missing information, certify itself merely because code executed, or convert hypothetical/modelled state into observed fact.

**Composition role:** Root parent and governing semantic boundary for every downstream intelligence node.

**Product potential:** Potentially contributes to an enormous and continuously expanding set of reports and report instances. Those products are deliberately outside this intelligence definition.

---

# 2. AUTHORITATIVE LEVEL-2 INTELLIGENCE DOMAINS

These eight domains are the authoritative Level-2 domains. They are **intelligence domains**, not products, and they are not a maximum hierarchy depth.

## IRIS.DOMAIN.AUTH — Authentication Intelligence

**Name:** Authentication Intelligence

**Extremely detailed description:** Intelligence concerning the authenticated principal, authorization state, access-control boundary, connection/session state, and evidence-governance identity required to determine whose permitted evidence IRIS may process and under what authorization context. Authentication intelligence establishes the security and ownership boundary around every downstream operation; it does not describe the user's financial condition merely because authentication succeeded.

**Inputs:** Authentication events, authorization state, governed user identity, provider connection state where applicable.

**Output:** Evidence-qualified access and authorization state.

**Boundary:** Authentication does not establish financial facts, account ownership beyond what the evidence actually establishes, or user characteristics not supported by evidence.

**Composition role:** Governs access to and scope of every downstream intelligence operation.

---

## IRIS.DOMAIN.TXN — Transaction Intelligence

**Name:** Transaction Intelligence

**Extremely detailed description:** Intelligence concerning observed transaction events and their defensible economic semantics. It can represent transaction identity, timing, direction, amount, account relationship, merchant/entity relationship, economic role, classification, category, recurrence relationships, and source-field provenance. Transaction intelligence is a foundational evidence substrate because many higher-order financial-life concepts depend on understanding what observed financial events actually represent.

**Inputs:** Provider transaction observations and source-field evidence.

**Output:** Canonical transaction state and transaction-derived semantic intelligence.

**Boundary:** Unknown or ambiguous transactions remain unknown or qualified; transaction signs, descriptions, or categories must not be treated as complete economic meaning without governed semantics.

**Composition role:** Foundational substrate for flow, spending, income, recurrence, behavior, patterns, anomalies, relationships, and higher-order financial reasoning.

---

## IRIS.DOMAIN.BAL — Balance Intelligence

**Name:** Balance Intelligence

**Extremely detailed description:** Intelligence concerning observed account balances and their temporal relationship to accounts, observations, synchronization boundaries, and other evidence. It establishes what balance state was actually observed at a specific point or observation interval and can support reconciliation, liquidity reasoning, historical comparison, and balance-aware analysis.

**Inputs:** Provider balance observations.

**Output:** Evidence-qualified balance state.

**Boundary:** No observation is not zero. An old observation remains historical evidence but cannot automatically be represented as current state.

**Composition role:** Supports liquidity, account state, reconciliation, cash-position reasoning, and temporal financial-life intelligence.

---

## IRIS.DOMAIN.ID — Identity Intelligence

**Name:** Identity Intelligence

**Extremely detailed description:** Intelligence concerning identity attributes actually observed through permitted provider evidence and the confidence, provenance, temporal scope, and authorization associated with those attributes. Identity intelligence supplies context to downstream reasoning only when that context is relevant, supported, and governed.

**Inputs:** Provider identity observations and source-field evidence.

**Output:** Evidence-qualified identity state.

**Boundary:** Identity evidence must not be expanded into unsupported demographic, psychological, legal, behavioral, or financial conclusions.

**Composition role:** Provides legitimate identity context to other intelligence while preserving strict evidence boundaries.

---

## IRIS.DOMAIN.ASSET — Asset Intelligence

**Name:** Asset Intelligence

**Extremely detailed description:** Intelligence concerning observed assets and asset-related financial state, including supported asset accounts, holdings, positions, valuations, and relationships. It distinguishes directly observed asset state from derived valuations, modeled changes, and predictions.

**Inputs:** Provider asset observations and related evidence.

**Output:** Evidence-qualified asset state.

**Boundary:** Missing asset evidence does not establish that the user owns no assets.

**Composition role:** Supports net-worth intelligence, concentration, opportunity, risk, scenario analysis, and cross-domain synthesis.

---

## IRIS.DOMAIN.LIAB — Liability Intelligence

**Name:** Liability Intelligence

**Extremely detailed description:** Intelligence concerning observed liabilities, debt accounts, balances, payment obligations, and supported liability attributes. It distinguishes verified liability state from candidates inferred from transaction behavior and preserves the evidence needed to establish each distinction.

**Inputs:** Provider liability observations, related accounts, and transaction evidence where legitimately relevant.

**Output:** Evidence-qualified liability state.

**Boundary:** A recurring payment is not automatically a verified debt, and missing liability data does not establish absence of debt.

**Composition role:** Supports debt, obligations, cash-flow pressure, risk, net worth, and financial resilience intelligence.

---

## IRIS.DOMAIN.INV — Investment Intelligence

**Name:** Investment Intelligence

**Extremely detailed description:** Intelligence concerning observed investment holdings, positions, securities, valuations, investment transactions, and related financial relationships supported by actual provider evidence. It distinguishes current observed holdings from modeled performance, projected value, scenario outcomes, and predictions.

**Inputs:** Provider investment observations and source-field evidence.

**Output:** Evidence-qualified investment state.

**Boundary:** A projected investment result is not an observed result; absent investment observations do not prove absence of investments.

**Composition role:** Supports asset composition, net worth, concentration, risk, opportunity, and scenario intelligence.

---

## IRIS.DOMAIN.STMT — Statement Intelligence

**Name:** Statement Intelligence

**Extremely detailed description:** Intelligence concerning provider-observed financial statements and the historical evidence contained within explicit statement periods. Statement intelligence can establish period-bounded historical facts, reconciliation evidence, and longitudinal comparisons while preserving the exact statement period and source lineage.

**Inputs:** Provider statement observations, statement metadata, and statement-derived evidence.

**Output:** Period-bounded statement evidence and derived historical state.

**Boundary:** A statement's evidence cannot silently be extended beyond its actual period or content.

**Composition role:** Supports historical reconciliation, verification, period comparison, and longitudinal intelligence.

---

# 3. EVIDENCE INTELLIGENCE

## IRIS.EVIDENCE.001 — Evidence State Intelligence
**Name:** Evidence State Intelligence

**Extremely detailed description:** Determines the actual lifecycle state of a potential evidence element: provider capability availability, consent, authorization, response receipt, persistence, normalization, evidence certification, intelligence consumption, and actual use. Its purpose is to prevent any pipeline stage from being mistaken for an observed financial fact.

## IRIS.EVIDENCE.002 — Exact Evidence Boundary Intelligence
**Name:** Exact Evidence Boundary Intelligence

**Extremely detailed description:** Defines precisely which provider, Item, account, field, observation, timestamp, run, execution, and historical period may legally contribute to a particular intelligence result. It prevents downstream computation from silently reaching outside the evidence actually available to the execution.

## IRIS.EVIDENCE.003 — Evidence Freshness Intelligence
**Name:** Evidence Freshness Intelligence

**Extremely detailed description:** Determines how current an observation is relative to the question being answered, while preserving the difference between stale historical evidence and invalid evidence. Freshness considers observation timestamps, synchronization state, and the requested intelligence time horizon.

## IRIS.EVIDENCE.004 — Evidence Sufficiency Intelligence
**Name:** Evidence Sufficiency Intelligence

**Extremely detailed description:** Determines whether the available evidence is adequate to instantiate a specific intelligence contract. It is contract-specific: evidence sufficient for one intelligence may be insufficient for another. Failure of sufficiency must produce an explicit insufficient/unknown state rather than a fabricated completion.

## IRIS.EVIDENCE.005 — Evidence Lineage Intelligence
**Name:** Evidence Lineage Intelligence

**Extremely detailed description:** Maintains the exact chain from provider observation and source field through canonical state, semantic transformation, upstream intelligence, execution, and downstream result. It allows IRIS to explain not only what it concluded but exactly which evidence and transformations support the conclusion.

---

# 4. CANONICAL STATE INTELLIGENCE

## IRIS.STATE.001 — Canonical Financial-Life State
**Name:** Canonical Financial-Life State Intelligence

**Extremely detailed description:** A reconciled, evidence-qualified representation of the user's observed financial-life state at an explicit boundary. It integrates compatible observations across the eight authoritative domains without manufacturing missing domains or silently treating partial visibility as complete visibility.

## IRIS.STATE.002 — Account State Intelligence
**Name:** Account State Intelligence

**Extremely detailed description:** Represents the governed state of an individual account, including provider identity, account relationships, observed balance state, transaction activity, temporal state, and supported account semantics. Capability metadata is kept distinct from observed activity.

## IRIS.STATE.003 — Transaction Semantic State Intelligence
**Name:** Transaction Semantic State Intelligence

**Extremely detailed description:** Converts an observed transaction into a governed semantic representation covering direction, economic role, category/classification, merchant/entity relationships, timing, and relevant uncertainty. Ambiguity remains explicit rather than being forced into a false category.

## IRIS.STATE.004 — Economic Flow State Intelligence
**Name:** Economic Flow State Intelligence

**Extremely detailed description:** Represents observed inflows, outflows, transfers, reversals, fees, debt activity, investments, and other economic roles after transaction semantics have been established. It separates raw record representation from economic interpretation.

## IRIS.STATE.005 — Financial Entity State Intelligence
**Name:** Financial Entity State Intelligence

**Extremely detailed description:** Represents evidence-qualified state for financial entities such as accounts, merchants, transaction classes, obligations, income sources, liabilities, assets, and investment positions and preserves the relationships among them.

---

# 5. TEMPORAL INTELLIGENCE

## IRIS.TEMP.001 — Observation Span Intelligence
**Name:** Observation Span Intelligence

**Extremely detailed description:** Establishes the actual temporal span represented by available observations, including beginning, ending, gaps, density, and boundary limitations. It prevents IRIS from interpreting missing observations as periods of inactivity.

## IRIS.TEMP.002 — Activity Density Intelligence
**Name:** Activity Density Intelligence

**Extremely detailed description:** Measures the concentration and distribution of actual observations across time so that comparisons, baselines, and patterns account for whether a period contains sufficient observed activity.

## IRIS.TEMP.003 — Evidence-Bound Temporal Aggregation Intelligence
**Name:** Evidence-Bound Temporal Aggregation Intelligence

**Extremely detailed description:** Deterministically aggregates actual observations over an explicitly defined temporal window and evidence boundary. It preserves the difference between observed totals and values unavailable because evidence does not cover the required period.

## IRIS.TEMP.004 — Recurrence Intelligence
**Name:** Recurrence Intelligence

**Extremely detailed description:** Detects repeated financial events or behavior over time by evaluating observed timing, interval regularity, amount stability, semantic consistency, and evidence sufficiency. Recurrence is a derived pattern, not an automatic obligation claim.

## IRIS.TEMP.005 — Historical Baseline Intelligence
**Name:** Historical Baseline Intelligence

**Extremely detailed description:** Constructs an evidence-grounded reference representation of the user's actual historical behavior for comparison with current observations. It must preserve its window, gaps, methodology, and limitations and must adapt when historical behavior genuinely changes.

---

# 6. CORE FINANCIAL-LIFE INTELLIGENCE

## IRIS.FIN.001 — Financial-Life Overview Intelligence
**Name:** Financial-Life Overview Intelligence

**Extremely detailed description:** Synthesizes the most material observed financial state available across relevant domains into a governed state representation. It does not mean complete financial visibility; missing or insufficient domains remain explicit.

## IRIS.FIN.002 — Money and Account Intelligence
**Name:** Money and Account Intelligence

**Extremely detailed description:** Integrates observed account structure, balances, transaction flows, account relationships, and temporal account state to characterize how money is positioned and moving within the evidence boundary.

## IRIS.FIN.003 — Cash-Flow Intelligence
**Name:** Cash-Flow Intelligence

**Extremely detailed description:** Characterizes observed inflows, outflows, transfers, net movement, timing, concentration, stability, and changes over an explicit period after economic transaction semantics have been established.

## IRIS.FIN.004 — Spending Intelligence
**Name:** Spending Intelligence

**Extremely detailed description:** Analyzes observed financial outflows by time, category, merchant/entity, account, economic role, recurrence, concentration, and historical comparison where evidence supports those dimensions.

## IRIS.FIN.005 — Income Intelligence
**Name:** Income Intelligence

**Extremely detailed description:** Analyzes observed inflows that meet governed income criteria, including source, timing, recurrence, concentration, variability, and changes. It does not classify every positive transaction as income.

## IRIS.FIN.006 — Liquidity Intelligence
**Name:** Liquidity Intelligence

**Extremely detailed description:** Evaluates observed resources available for financial obligations and near-term needs using actual balance, flow, and obligation evidence within an explicit time boundary. Observed liquidity is kept separate from projected liquidity.

## IRIS.FIN.007 — Obligation-Candidate Intelligence
**Name:** Obligation-Candidate Intelligence

**Extremely detailed description:** Identifies observed patterns that may represent financial obligations while preserving candidate status until sufficient evidence establishes the obligation's existence and relevant attributes.

## IRIS.FIN.008 — Verified Obligation Intelligence
**Name:** Verified Obligation Intelligence

**Extremely detailed description:** Represents an obligation whose existence and relevant attributes are supported by sufficient evidence within a defined boundary. Verification requires more than a plausible recurring transaction pattern.

## IRIS.FIN.009 — Debt Intelligence
**Name:** Debt Intelligence

**Extremely detailed description:** Represents observed debt state, including liability balances, payment activity, debt relationships, and supported obligation information, while distinguishing provider-observed liabilities from inferred candidates.

## IRIS.FIN.010 — Net-Worth Intelligence
**Name:** Net-Worth Intelligence

**Extremely detailed description:** Derives net worth from compatible observed asset and liability state at an explicit time and evidence boundary. It must expose partial visibility rather than presenting a partial calculation as complete net worth.

---

# 7. RELATIONAL INTELLIGENCE

## IRIS.REL.001 — Financial Relationship Intelligence
**Name:** Financial Relationship Intelligence

**Extremely detailed description:** Identifies and qualifies meaningful relationships among financial entities, events, accounts, merchants, categories, obligations, income sources, assets, liabilities, investments, and temporal states. Relationships become inputs for higher-order reasoning only when their evidence and semantics are preserved.

## IRIS.REL.002 — Transaction Topology Intelligence
**Name:** Transaction Topology Intelligence

**Extremely detailed description:** Represents the structural network formed by observed transactions and their connections to accounts, merchants, categories, entities, economic roles, and time. It enables graph-based reasoning beyond isolated transaction analysis.

## IRIS.REL.003 — Financial Concentration Intelligence
**Name:** Financial Concentration Intelligence

**Extremely detailed description:** Measures how strongly observed activity is concentrated among entities, categories, accounts, income sources, obligations, or other governed dimensions over an explicit period.

---

# 8. BEHAVIORAL AND PATTERN INTELLIGENCE

## IRIS.BEH.001 — Financial Behavior Intelligence
**Name:** Financial Behavior Intelligence

**Extremely detailed description:** Characterizes repeated observed financial behavior across time, including stability, variability, recurrence, drift, concentration, and changes relative to appropriate historical references. It describes financial actions, not personality or psychological traits.

## IRIS.BEH.002 — Category Drift Intelligence
**Name:** Category Drift Intelligence

**Extremely detailed description:** Detects meaningful changes in the distribution or semantic composition of observed activity across categories over time and identifies whether the change is supported by sufficient evidence.

## IRIS.PAT.001 — Pattern Intelligence
**Name:** Pattern Intelligence

**Extremely detailed description:** Detects repeatable structures in observed financial activity that become meaningful when evaluated against temporal, statistical, relational, and semantic evidence rather than arbitrary single-event interpretation.

## IRIS.PAT.002 — Financial Change-Point Intelligence
**Name:** Financial Change-Point Intelligence

**Extremely detailed description:** Identifies a meaningful change in an observed financial series relative to its historical reference, preserving the detection method, comparison window, evidence span, and uncertainty.

---

# 9. STATISTICAL INTELLIGENCE

## IRIS.STAT.001 — Robust Statistical Reference Intelligence
**Name:** Robust Statistical Reference Intelligence

**Extremely detailed description:** Constructs statistical reference measures from actual historical observations while reducing inappropriate distortion from outliers, irregular activity, and evidence gaps where the methodology permits.

## IRIS.STAT.002 — Adaptive Historical Threshold Intelligence
**Name:** Adaptive Historical Threshold Intelligence

**Extremely detailed description:** Derives comparison thresholds from the user's actual historical observations rather than relying solely on arbitrary universal constants. The threshold retains its evidence window, method, and limitations.

## IRIS.STAT.003 — Variability Intelligence
**Name:** Financial Variability Intelligence

**Extremely detailed description:** Quantifies how much an observed financial measure changes over time, distinguishing genuine variability from insufficient observation density or changing evidence coverage.

---

# 10. ANOMALY INTELLIGENCE

## IRIS.ANM.001 — Anomaly Intelligence
**Name:** Anomaly Intelligence

**Extremely detailed description:** Identifies observed activity that materially departs from an appropriate historical, relational, statistical, or semantic reference. Anomaly detection is a statement about unusualness relative to a defined reference, not a declaration of fraud or wrongdoing.

## IRIS.ANM.002 — Material Anomaly Intelligence
**Name:** Material Anomaly Intelligence

**Extremely detailed description:** Determines whether an observed deviation is sufficiently meaningful under the applicable evidence, statistical, temporal, and materiality criteria to warrant higher-order attention or downstream analysis.

---

# 11. CAUSAL AND EXPLANATORY INTELLIGENCE

## IRIS.CAUS.001 — Association Intelligence
**Name:** Financial Association Intelligence

**Extremely detailed description:** Identifies supported relationships between financial variables or events without asserting that one caused another. Association is intentionally weaker than causal inference.

## IRIS.CAUS.002 — Temporal Precedence Intelligence
**Name:** Temporal Precedence Intelligence

**Extremely detailed description:** Determines whether one observed event or state preceded another within a defined temporal boundary. Temporal precedence can support causal investigation but does not establish causation by itself.

## IRIS.CAUS.003 — Causal Evidence Intelligence
**Name:** Evidence-Grounded Causal Intelligence

**Extremely detailed description:** Evaluates whether available evidence and an appropriate reasoning methodology support a causal explanation. It must distinguish correlation, association, temporal precedence, plausible mechanism, confounding, alternative explanations, and actual causal support.

## IRIS.EXPL.001 — Financial Explanation Intelligence
**Name:** Financial Explanation Intelligence

**Extremely detailed description:** Produces an evidence-grounded explanation for an observed state, change, pattern, or anomaly by tracing the relevant upstream observations and derived intelligence. Explanations must distinguish observed facts from interpretations and hypotheses.

---

# 12. FORWARD INTELLIGENCE

## IRIS.PRED.001 — Predictive Intelligence
**Name:** Predictive Intelligence

**Extremely detailed description:** Estimates a future state or event from actual evidence and an explicitly defined methodology, horizon, assumptions, uncertainty, and limitations. Predictions are modeled outputs and never become historical observations.

## IRIS.PRED.002 — Probabilistic Forecast Intelligence
**Name:** Probabilistic Financial Forecast Intelligence

**Extremely detailed description:** Represents a future estimate as a distribution or explicitly bounded range when the available evidence and methodology support probabilistic treatment. It preserves uncertainty rather than presenting a single estimate as certain fact.

## IRIS.PRED.003 — Recursive Uncertainty Propagation Intelligence
**Name:** Recursive Uncertainty Propagation Intelligence

**Extremely detailed description:** Carries uncertainty from upstream intelligence through downstream recursive transformations so that higher-order results cannot silently appear more certain than the evidence and transformations justify.

---

# 13. SCENARIO AND COUNTERFACTUAL INTELLIGENCE

## IRIS.SCEN.001 — Scenario Intelligence
**Name:** Financial Scenario Intelligence

**Extremely detailed description:** Evaluates a defined hypothetical future condition using actual observed state as the starting boundary and explicit assumptions for what is changed. Scenario output is hypothetical and must remain separate from observed state.

## IRIS.SCEN.002 — Counterfactual Intelligence
**Name:** Financial Counterfactual Intelligence

**Extremely detailed description:** Examines what could differ under a specified alternative condition or decision while preserving the distinction between actual history and hypothetical reasoning. Counterfactuals must not rewrite observed history.

## IRIS.SCEN.003 — Scenario Sensitivity Intelligence
**Name:** Scenario Sensitivity Intelligence

**Extremely detailed description:** Determines how scenario outcomes change when explicitly defined assumptions or variables change, allowing IRIS to identify which assumptions materially influence a modeled result.

---

# 14. RISK AND OPPORTUNITY INTELLIGENCE

## IRIS.RISK.001 — Risk Intelligence
**Name:** Financial Risk Intelligence

**Extremely detailed description:** Identifies evidence-supported exposures, vulnerabilities, adverse conditions, or uncertainty that could materially affect a defined financial-life state or objective. Risk must be grounded in actual evidence and explicit assumptions.

## IRIS.RISK.002 — Risk Concentration Intelligence
**Name:** Risk Concentration Intelligence

**Extremely detailed description:** Determines whether material financial exposure is concentrated in a particular account, liability, income source, entity, asset, behavior, or other supported dimension.

## IRIS.OPP.001 — Opportunity Intelligence
**Name:** Financial Opportunity Intelligence

**Extremely detailed description:** Identifies evidence-supported conditions where an alternative action, relationship, resource, or financial configuration may create a meaningful improvement or advantage, without treating a hypothetical benefit as guaranteed.

## IRIS.OPP.002 — Opportunity Constraint Intelligence
**Name:** Opportunity Constraint Intelligence

**Extremely detailed description:** Determines the evidence-supported conditions, limitations, tradeoffs, and dependencies that constrain a potential financial opportunity.

---

# 15. DECISION INTELLIGENCE

## IRIS.DEC.001 — Decision Intelligence
**Name:** Financial Decision Intelligence

**Extremely detailed description:** Evaluates supported choices against explicit objectives, constraints, evidence, projected consequences, risks, opportunities, and uncertainty. Decision intelligence informs a decision; it does not secretly execute a financial action.

## IRIS.DEC.002 — Constraint-Aware Optimization Intelligence
**Name:** Constraint-Aware Financial Optimization Intelligence

**Extremely detailed description:** Searches for better-supported configurations or choices while honoring explicit financial constraints, evidence boundaries, uncertainty, and safety conditions. Optimization must never manufacture missing inputs simply to produce an answer.

## IRIS.DEC.003 — Recommendation Intelligence
**Name:** Financial Recommendation Intelligence

**Extremely detailed description:** Converts supported decision analysis into an actionable recommendation when evidence, objective, constraints, uncertainty, and expected consequences are sufficiently established. Recommendations remain recommendations rather than observations.

---

# 16. CONSEQUENCE AND OUTCOME INTELLIGENCE

## IRIS.CONSEQ.001 — Consequence Intelligence
**Name:** Financial Consequence Intelligence

**Extremely detailed description:** Evaluates the downstream effects of an observed event, decision, recommendation, or scenario using supported relationships and explicit uncertainty. It distinguishes modeled consequences from consequences later confirmed by observation.

## IRIS.OUT.001 — Outcome Intelligence
**Name:** Verified Financial Outcome Intelligence

**Extremely detailed description:** Represents the actual observed result of a prior decision, recommendation, event, or intervention when sufficient evidence establishes the outcome and its relationship to the originating action or condition.

## IRIS.OUT.002 — Outcome Attribution Intelligence
**Name:** Outcome Attribution Intelligence

**Extremely detailed description:** Evaluates how strongly an observed outcome can be connected to a prior decision or event while distinguishing temporal sequence, association, plausible mechanism, alternative explanations, and actual causal support.

---

# 17. LEARNING INTELLIGENCE

## IRIS.LEARN.001 — Verified-Outcome Learning Intelligence

**Name:** Verified-Outcome Learning Intelligence

**Extremely detailed description:** Uses verified observed outcomes, prediction error, changing historical behavior, recurring evidence, and governed feedback to improve future reasoning without silently rewriting historical facts. Every learning change requires provenance, versioning, affected rule/model identification, and a reason for the change.

## IRIS.LEARN.002 — Prediction-Error Intelligence

**Name:** Prediction-Error Intelligence

**Extremely detailed description:** Compares a prior prediction with the subsequently observed result and measures the discrepancy within compatible evidence boundaries. It can inform model improvement but cannot retroactively turn the prediction into an observation.

## IRIS.LEARN.003 — Adaptive Intelligence

**Name:** Adaptive Financial Intelligence

**Extremely detailed description:** Represents governed changes in thresholds, models, interpretations, or composition behavior resulting from verified evidence and learning signals. Adaptation is versioned and auditable.

---

# 18. CROSS-DOMAIN AND HIGHER-ORDER INTELLIGENCE

## IRIS.XD.001 — Cross-Domain Synthesis Intelligence

**Name:** Cross-Domain Financial-Life Synthesis Intelligence

**Extremely detailed description:** Combines compatible intelligence from multiple authoritative domains to derive a higher-order understanding that cannot be represented adequately by any one domain alone. Every contributing domain, node, transformation, and evidence boundary must remain explicit.

## IRIS.XD.002 — Higher-Order Intelligence

**Name:** Higher-Order Financial-Life Intelligence

**Extremely detailed description:** Represents intelligence derived from already-derived intelligence when the downstream semantic relationship is explicitly valid and independently verifiable. Higher-order status does not imply greater truth; it means greater compositional depth.

## IRIS.XD.003 — Emergent Intelligence

**Name:** Emergent Financial-Life Intelligence

**Extremely detailed description:** Represents a materially useful intelligence structure that emerges from valid combinations of multiple existing intelligence nodes and is not adequately represented by a single predefined capability. Emergence must still have exact upstream lineage and semantic justification.

## IRIS.XD.004 — Recursive Composition Intelligence

**Name:** Recursive Intelligence Composition

**Extremely detailed description:** Allows valid intelligence nodes to become inputs to further intelligence recursively without imposing a predetermined maximum number of levels. Composition continues only when semantic compatibility, evidence sufficiency, lineage, safety, resource limits, and usefulness permit it.

## IRIS.XD.005 — Arbitrary Derived Intelligence

**Name:** Arbitrary Derived-Intelligence Node

**Extremely detailed description:** Represents a newly derived intelligence node whose semantic identity is not limited to the finite capability/operator registry. It preserves exact upstream node identifiers, recursive ancestry, derivation operator/version, transformation evidence, execution lineage, and deterministic identity so newly composed intelligence can persist and participate in further reasoning.

## IRIS.XD.006 — Semantic Transformation Intelligence

**Name:** Semantic Transformation Intelligence

**Extremely detailed description:** Describes how specific upstream intelligence is transformed into specific downstream intelligence, including the semantic input, transformation operation, output meaning, operator/version, evidence boundary, and exact lineage. A dependency reference or object read alone is insufficient.

## IRIS.XD.007 — Semantic Sufficiency Intelligence

**Name:** Semantic Sufficiency Intelligence

**Extremely detailed description:** Determines whether the actual inputs and transformations used by an intelligence derivation are sufficient to justify the meaning claimed by the downstream node. It is deliberately stronger than proving that a dependency existed, was read, or was persisted.

---

# 19. INTELLIGENCE GRAPH INTEGRITY

## IRIS.GRAPH.001 — Intelligence Lineage Intelligence

**Name:** Recursive Intelligence Lineage

**Extremely detailed description:** Preserves the complete ancestry of a derived intelligence node through exact upstream node identifiers, source observations, execution context, transformations, versions, and evidence boundaries. Lineage allows IRIS to traverse backward from a result to the evidence that supports it.

## IRIS.GRAPH.002 — Dependency Consumption Intelligence

**Name:** Actual Dependency Consumption Intelligence

**Extremely detailed description:** Establishes which upstream intelligence results were actually consumed by a downstream derivation rather than merely declared, referenced, persisted, or made available. Consumption must be independently observable where the contract requires proof.

## IRIS.GRAPH.003 — Semantic Transformation Edge Intelligence

**Name:** Semantic Transformation Edge Intelligence

**Extremely detailed description:** Represents an explicit graph edge explaining the semantic relationship between an upstream and downstream intelligence node, including the transformation identity and relevant field/path semantics. It exists to make derivation inspectable rather than inferred from proximity.

## IRIS.GRAPH.004 — Recursive Depth Intelligence

**Name:** Recursive Intelligence Depth

**Extremely detailed description:** Represents the actual compositional depth of a derived intelligence node in the graph. Depth is an observed graph property, not a predefined maximum hierarchy level.

## IRIS.GRAPH.005 — Cycle Safety Intelligence

**Name:** Recursive Cycle-Safety Intelligence

**Extremely detailed description:** Detects recursive dependency cycles that could cause non-terminating execution while preserving valid graph relationships. Cycle prevention is an execution-safety mechanism and does not impose an intelligence-depth ceiling.

## IRIS.GRAPH.006 — Intelligence Identity Integrity

**Name:** Derived Intelligence Identity Integrity

**Extremely detailed description:** Ensures that a derived intelligence node has a deterministic identity tied to its semantic inputs, transformation, version, and relevant lineage so that equivalent compositions can be recognized and conflicting derivations can be detected.

---

# 20. CERTIFICATION INTELLIGENCE

## IRIS.CERT.001 — Evidence Certification Intelligence

**Name:** Evidence Certification Intelligence

**Extremely detailed description:** Determines whether the evidence required by a specific intelligence contract has actually been observed, persisted, scoped, and verified sufficiently for the result's intended claim.

## IRIS.CERT.002 — Semantic Certification Intelligence

**Name:** Semantic Certification Intelligence

**Extremely detailed description:** Determines whether the actual semantic transformations and dependency consumption satisfy the downstream intelligence contract rather than merely satisfying structural execution checks.

## IRIS.CERT.003 — Intelligence Certification State

**Name:** Intelligence Certification State

**Extremely detailed description:** Represents the current verification state of an intelligence result, distinguishing conceptual definition, implementation, execution, evidence verification, lineage verification, semantic sufficiency, certification, and publication readiness.

---

# 21. THE UNBOUNDED COMPOSITION RULE

The library intentionally does **not** attempt to enumerate every possible intelligence node.

A new intelligence node may be created when a valid composition establishes a genuinely meaningful downstream semantic result from actual upstream evidence/intelligence. Its identity must preserve:

1. exact upstream node references;
2. exact recursive ancestry;
3. actual dependency consumption;
4. semantic transformation identity;
5. operator and version information;
6. evidence boundary;
7. uncertainty and limitations;
8. deterministic derivation identity;
9. execution/run lineage; and
10. sufficient evidence to support the downstream claim.

Therefore the hierarchy is not:

`Level 1 → Level 2 → Level 3 → ... → Level N → STOP`

It is:

`IRIS → authoritative evidence domains → derived intelligence → higher-order intelligence → recursively derived intelligence → further valid intelligence ...`

There is no artificial final level.

---

# 22. INTELLIGENCE ≠ PRODUCT

This distinction is fundamental.

### Intelligence

An intelligence node is a governed semantic result inside the IRIS intelligence graph. It has meaning, evidence requirements, upstream dependencies, transformations, lineage, uncertainty, and a defined boundary.

### Report product

A report product is a user-facing publication generated by consuming one or more intelligence nodes. It may combine many intelligence concepts and may be instantiated for a specific user, period, account, merchant, event, relationship, scenario, question, or other legitimate context.

### Why the product count can become enormous

A relatively small set of reusable intelligence can generate a very large number of distinct reports because reports can vary by:

- user context;
- time period;
- account;
- merchant/entity;
- category;
- relationship;
- event;
- comparison;
- anomaly;
- forecast horizon;
- scenario assumption;
- decision context;
- evidence boundary;
- question asked;
- combination of intelligence nodes; and
- newly discovered useful compositions.

Those report products belong in the **IRIS Report Product Library/catalog**, not in this intelligence library.

This document therefore defines **what IRIS intelligence means**. A separate product layer defines **what users can receive from that intelligence**.

## Status

This file is a semantic library and architectural source of truth for intelligence naming and meaning. It does not certify implementation. The implementation/certification chain remains governed by `docs/ROADMAP.md` and actual evidence.