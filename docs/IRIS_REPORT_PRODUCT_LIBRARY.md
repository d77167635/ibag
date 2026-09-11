# IRIS Report Product Library

## 0. Purpose

This document defines the **IRIS report-product layer**.

It is intentionally separate from `docs/IRIS_LIBRARY.md`.

`IRIS_LIBRARY.md` defines **what IRIS intelligence is**.

This document defines **what users can receive from that intelligence**.

IRIS report products are not fixed hierarchy levels. They are publication compositions generated from one or more intelligence nodes, within a user's actual evidence boundary, subscription entitlements, selected preferences, and requested context.

The report catalog is therefore expected to become enormous.

A report product can be:

- a point-in-time state report;
- a historical report;
- a change report;
- a comparison;
- an explanation;
- an anomaly investigation;
- a relationship report;
- a forecast;
- a scenario;
- a decision analysis;
- a recommendation;
- an outcome review;
- a learning report;
- a cross-domain synthesis;
- a question-specific report;
- a personalized educational report; or
- a recursively composed report created from a combination of intelligence nodes that did not previously have a dedicated named report.

The catalog must never manufacture a report merely because a product name exists. A report becomes available for a user only when its required evidence and intelligence dependencies are actually present and valid.

---

# 1. Product naming principle

## The most important or empowering fact leads the name

IRIS report names should not primarily be generic analytical labels such as:

- Monthly Analysis
- Spending Report
- Cash Flow Report
- Financial Summary

Those names describe a category but do not tell the user why the report matters.

Instead, the product naming engine should identify the **most important, material, actionable, explanatory, educational, or empowering intelligence in the report** and make that intelligence the semantic center of the title.

Examples of the naming pattern:

`[Most Important Finding] — [Useful Context]`

`[Empowering Financial State] — [Time/Scope]`

`[Meaningful Change] — [What Changed and Why]`

`[Major Opportunity] — [Expected Benefit / Constraint]`

`[Important Risk] — [Exposure and Time Horizon]`

`[Important Answer] — [Question Context]`

The name must be generated from actual evidence and the report's highest-materiality intelligence. It must never invent a positive, negative, numerical, or causal claim merely to make the title compelling.

If no defensible headline intelligence exists, IRIS should use a neutral descriptive name rather than fabricate importance.

### Naming objective

The report title should allow a user to understand **why this report deserves their attention before opening it**.

The report title is therefore itself an intelligence-derived publication artifact.

---

# 2. Report product object

Every report product should ultimately have a governed identity containing at least:

- `report_product_id`
- `report_product_type`
- `report_product_name`
- `report_product_description`
- `headline_intelligence_node_id`
- `headline_reason`
- `supporting_intelligence_node_ids`
- `evidence_boundary`
- `temporal_scope`
- `generated_at`
- `freshness_state`
- `uncertainty`
- `limitations`
- `subscription_requirement`
- `beta_access_state`
- `user_activation_state`
- `display_priority`
- `educational_value`
- `empowerment_value`
- `actionability`
- `materiality`
- `lineage`
- `report_version`
- `catalog_version`

A report product must not contain unsupported claims simply because a template expects them.

---

# 3. User-controlled IRIS Library experience

The user should be able to open the **IRIS Library** as an interactive intelligence/product ecosystem rather than a static settings page.

The interface should allow the user to:

1. browse intelligence domains;
2. browse intelligence concepts;
3. browse available report products;
4. read extremely detailed explanations of what each intelligence/report means;
5. understand what evidence powers each report;
6. see why a report is currently available, unavailable, or limited;
7. activate or deactivate report products;
8. activate or deactivate appropriate intelligence surfaces where subscription rules permit;
9. see which products are included in the current subscription;
10. see locked products available in higher subscription tiers;
11. understand what upgrading would unlock;
12. search the library and catalog;
13. filter by financial-life domain, purpose, time horizon, educational value, actionability, risk, opportunity, or report type;
14. open a report and inspect its underlying intelligence;
15. inspect the evidence boundary and important limitations;
16. navigate from a report to its contributing intelligence;
17. navigate from intelligence back to reports that use it; and
18. ask IRIS for a report or explanation directly.

The UI should make the system feel like **the user's own financial-life intelligence ecosystem**, not a collection of disconnected banking widgets.

---

# 4. Subscription and beta governance

## Beta

During beta testing, the report catalog and relevant intelligence surfaces are intended to be **free and fully accessible**, subject to actual evidence availability and technical implementation state.

Free beta access does not mean that missing evidence is fabricated.

A user can have access to a report definition while receiving:

- complete report;
- partial report;
- insufficient-evidence state;
- unavailable state;
- historical-only state; or
- not-applicable state.

The system must never convert a subscription entitlement into evidence entitlement.

## Post-beta subscription model

Subscription entitlements should control access to report products and other intentionally user-facing capabilities without changing the underlying truth of the intelligence graph.

Conceptually:

`Evidence → Intelligence → Product Eligibility → Subscription Gate → User Activation → Report Publication`

Subscription state must never alter factual results.

A paid tier can unlock a report that the user already has sufficient evidence to generate; it cannot cause the report to invent missing evidence.

---

# 5. Core report-product families

These are **product families**, not limits on the number of reports. Each family can contain a very large number of named and dynamically composed reports.

## RP.STATE — Financial-Life State Reports

Reports that tell the user what their financial life currently looks like based on observed evidence.

### RP.STATE.001 — Your Financial Life Right Now
**Description:** A current evidence-bound synthesis of the user's most important observed financial state across available domains. The report headline is selected from the most material current intelligence rather than a fixed template.

### RP.STATE.002 — What Changed in Your Financial Life
**Description:** Identifies the most meaningful supported changes between two compatible evidence periods and explains the strongest contributing intelligence.

### RP.STATE.003 — Your Strongest Financial Position
**Description:** Identifies the strongest defensible financial position currently supported by evidence, such as improved liquidity, reduced obligations, stronger recurring income, or another material positive state. The specific headline must be evidence-derived.

### RP.STATE.004 — Your Biggest Financial Pressure
**Description:** Identifies the most material supported pressure affecting the user's current financial state and explains the evidence behind it without overstating risk.

### RP.STATE.005 — Your Financial Life at a Glance
**Description:** A concise high-level state report designed for rapid orientation while preserving links to deeper underlying intelligence.

---

# 6. Cash-flow and money-movement reports

## RP.CASH — Cash-Flow Reports

### RP.CASH.001 — Where Your Money Is Coming From
**Description:** Identifies the most important observed inflow sources and their recurrence, concentration, variability, and historical changes.

### RP.CASH.002 — Where Your Money Is Going
**Description:** Identifies the most material observed outflow destinations and economic categories over the selected period.

### RP.CASH.003 — What Is Driving Your Cash Flow
**Description:** Explains the highest-impact observed drivers of net cash movement using transaction semantics, relationships, temporal patterns, and supporting evidence.

### RP.CASH.004 — Your Cash-Flow Turning Point
**Description:** Identifies a supported change point where the user's cash-flow behavior materially shifted and explains what changed.

### RP.CASH.005 — Your Cash-Flow Stability
**Description:** Measures the stability and variability of observed inflows and outflows over an explicit period.

### RP.CASH.006 — Your Next Cash-Flow Pressure
**Description:** A predictive/obligation-aware report identifying supported future pressure points while clearly separating prediction from observed state.

---

# 7. Spending reports

## RP.SPEND — Spending Intelligence Products

### RP.SPEND.001 — Your Biggest Spending Driver
**Description:** Identifies the most material category, merchant, entity, or economic role driving observed spending in the selected period.

### RP.SPEND.002 — What Changed Your Spending
**Description:** Explains the strongest evidence-supported changes in spending relative to an appropriate historical reference.

### RP.SPEND.003 — Your Spending Pattern
**Description:** Describes meaningful recurring structures in observed spending behavior.

### RP.SPEND.004 — Your Spending Drift
**Description:** Identifies material movement in spending distribution or category behavior over time.

### RP.SPEND.005 — Spending You May Want to Understand
**Description:** Surfaces unusual or materially changed spending for educational review without assuming that unusual means wrong or harmful.

---

# 8. Income reports

## RP.INCOME — Income Intelligence Products

### RP.INCOME.001 — Your Most Reliable Income Source
**Description:** Identifies the strongest evidence-supported recurring income source based on observed recurrence, timing, stability, and concentration.

### RP.INCOME.002 — What Changed Your Income
**Description:** Explains material changes in observed income behavior.

### RP.INCOME.003 — Your Income Stability
**Description:** Describes observed income variability and recurrence within the evidence boundary.

### RP.INCOME.004 — Your Income Concentration
**Description:** Shows how dependent observed inflows are on particular sources or entities.

---

# 9. Liquidity and resilience reports

## RP.LIQ — Liquidity Intelligence Products

### RP.LIQ.001 — What You Can Reliably Cover
**Description:** Evaluates observed liquidity against supported obligations and near-term requirements, explicitly distinguishing current evidence from projections.

### RP.LIQ.002 — Your Strongest Liquidity Position
**Description:** Identifies the most favorable evidence-supported liquidity condition within the selected period.

### RP.LIQ.003 — Your Next Liquidity Pressure
**Description:** Identifies supported future liquidity pressure using actual balances, flows, obligations, and governed forecasts.

### RP.LIQ.004 — Your Financial Resilience
**Description:** Evaluates the user's ability to absorb supported changes or pressures using observed liquidity, income stability, obligations, variability, and other compatible intelligence.

---

# 10. Obligations and debt reports

## RP.OBL — Obligation Intelligence Products

### RP.OBL.001 — What You Must Cover
**Description:** Presents verified obligations supported by sufficient evidence and separates them from obligation candidates.

### RP.OBL.002 — Your Largest Financial Obligation
**Description:** Identifies the most material verified obligation within the selected boundary.

### RP.OBL.003 — Your Recurring Financial Commitments
**Description:** Shows supported recurring obligations and their temporal patterns.

## RP.DEBT — Debt Intelligence Products

### RP.DEBT.001 — What Is Driving Your Debt
**Description:** Identifies the strongest observed contributors to debt state and debt-related cash-flow pressure.

### RP.DEBT.002 — Your Debt Pressure
**Description:** Evaluates material debt-related pressure using verified liability and payment evidence.

### RP.DEBT.003 — What Changed Your Debt Position
**Description:** Explains material observed changes in liability state or debt-related activity.

---

# 11. Net-worth and asset reports

## RP.NET — Net-Worth Intelligence Products

### RP.NET.001 — Your Net-Worth Position
**Description:** Presents the mathematically derived net-worth state supported by observed assets and liabilities at an explicit time boundary, with visibility limitations clearly shown.

### RP.NET.002 — What Changed Your Net Worth
**Description:** Explains the largest observed contributors to a net-worth change.

### RP.NET.003 — What Is Building Your Net Worth
**Description:** Identifies supported asset growth or liability reduction contributing to net-worth improvement.

## RP.ASSET — Asset Intelligence Products

### RP.ASSET.001 — Where Your Wealth Is Concentrated
**Description:** Identifies major observed asset concentrations and relationships.

### RP.ASSET.002 — Your Largest Asset Position
**Description:** Identifies the largest supported asset position within the selected boundary.

---

# 12. Investment reports

## RP.INV — Investment Intelligence Products

### RP.INV.001 — Where Your Investments Are Concentrated
**Description:** Identifies supported concentration across observed investment positions.

### RP.INV.002 — What Is Driving Your Investment Position
**Description:** Explains observed contributors to investment state while separating observation from modeled performance.

### RP.INV.003 — Your Investment Risk Concentration
**Description:** Identifies supported investment exposure concentrations and their limitations.

### RP.INV.004 — What Your Investment Future Could Look Like
**Description:** A scenario/forecast report clearly labeled as modeled rather than observed.

---

# 13. Relationship and behavior reports

## RP.REL — Financial Relationship Products

### RP.REL.001 — The Financial Relationship That Matters Most
**Description:** Identifies the most material supported relationship among accounts, entities, transactions, obligations, income, assets, or other financial nodes.

### RP.REL.002 — What Connects Your Financial Life
**Description:** Explains meaningful cross-domain relationships visible in the user's evidence.

## RP.BEH — Behavioral Products

### RP.BEH.001 — Your Strongest Financial Pattern
**Description:** Identifies the most meaningful recurring behavior supported by actual history.

### RP.BEH.002 — The Financial Habit Changing Most
**Description:** Identifies the most significant supported behavioral drift.

### RP.BEH.003 — Your Financial Rhythm
**Description:** Describes recurring timing structures in observed income, spending, obligations, and other supported activity.

---

# 14. Anomaly and attention reports

## RP.ANM — Anomaly Products

### RP.ANM.001 — The Biggest Change in Your Financial Life
**Description:** Surfaces the most material observed deviation from an appropriate historical or relational reference.

### RP.ANM.002 — What Looks Different Right Now
**Description:** Provides an educational anomaly overview without assuming that unusual activity is erroneous or fraudulent.

### RP.ANM.003 — The Change That Deserves Your Attention
**Description:** Prioritizes material anomalies using evidence, materiality, uncertainty, and user relevance.

---

# 15. Explanation reports

## RP.EXPL — Explanatory Products

### RP.EXPL.001 — Why Your Financial Position Changed
**Description:** Traces the strongest supported upstream intelligence explaining a material change in financial state.

### RP.EXPL.002 — Why Your Spending Changed
**Description:** Explains material spending changes through category, merchant, recurrence, timing, and relationship intelligence.

### RP.EXPL.003 — Why Your Cash Flow Changed
**Description:** Explains material cash-flow changes using exact supporting flows and temporal relationships.

### RP.EXPL.004 — What Is Behind This Number
**Description:** Lets the user drill from a headline value into the exact intelligence and evidence that produced it.

---

# 16. Forecast and future-state products

## RP.FUTURE — Predictive Products

### RP.FUTURE.001 — Where Your Current Financial Path Leads
**Description:** Projects a supported future state from current observed conditions and explicit methodology, horizon, uncertainty, and assumptions.

### RP.FUTURE.002 — What Is Most Likely to Change Next
**Description:** Identifies supported predicted changes with explicit uncertainty.

### RP.FUTURE.003 — Your Next Financial Pressure Point
**Description:** Forecasts the most material supported future pressure point.

### RP.FUTURE.004 — Your Financial Outlook
**Description:** A broad evidence-bound forward-looking synthesis of predicted state.

---

# 17. Scenario and counterfactual products

## RP.SCEN — Scenario Products

### RP.SCEN.001 — If Nothing Changes
**Description:** Projects a hypothetical continuation of supported current conditions and clearly labels assumptions and uncertainty.

### RP.SCEN.002 — If You Change This
**Description:** Shows modeled consequences of an explicit hypothetical change selected by the user.

### RP.SCEN.003 — The Choice With the Strongest Supported Advantage
**Description:** Compares supported alternatives and identifies the option with the strongest modeled advantage under the stated objectives and constraints.

### RP.SCEN.004 — What Would Happen If Your Income Changed
**Description:** Evaluates explicit hypothetical income changes and their modeled downstream effects.

### RP.SCEN.005 — What Would Happen If Your Spending Changed
**Description:** Evaluates explicit hypothetical spending changes and their modeled downstream effects.

---

# 18. Risk products

## RP.RISK — Risk Intelligence Products

### RP.RISK.001 — The Biggest Financial Risk You Can See
**Description:** Identifies the largest supported current risk exposure under the selected evidence boundary.

### RP.RISK.002 — What Could Put Pressure on Your Financial Life
**Description:** Connects observed vulnerabilities, obligations, variability, and forecast conditions into an evidence-qualified risk view.

### RP.RISK.003 — Where Your Risk Is Concentrated
**Description:** Identifies concentrated exposures across supported financial dimensions.

### RP.RISK.004 — What Risk Is Increasing
**Description:** Detects supported changes in risk conditions over time.

---

# 19. Opportunity products

## RP.OPP — Opportunity Intelligence Products

### RP.OPP.001 — Your Biggest Financial Opportunity
**Description:** Identifies the most material supported opportunity visible in the user's financial state, with assumptions and constraints exposed.

### RP.OPP.002 — Where You Have Room to Improve
**Description:** Identifies evidence-supported improvement opportunities without assuming the user wants a particular outcome.

### RP.OPP.003 — What Could Improve Your Financial Position Most
**Description:** Compares supported potential improvements and identifies the strongest modeled opportunity.

---

# 20. Decision and recommendation products

## RP.DEC — Decision Products

### RP.DEC.001 — Your Best Supported Financial Choice
**Description:** Evaluates available alternatives against explicit objectives, constraints, evidence, risks, opportunities, and modeled consequences.

### RP.DEC.002 — The Tradeoff You Need to Know
**Description:** Explains the most important supported tradeoff between competing financial choices.

### RP.DEC.003 — What I Would Watch Before You Decide
**Description:** Identifies evidence, uncertainty, or future conditions that materially affect a decision without pretending certainty.

## RP.REC — Recommendation Products

### RP.REC.001 — The Financial Move With the Strongest Evidence
**Description:** Produces an evidence-grounded recommendation when sufficient evidence and objective context exist. It is advice-like intelligence, not automatic execution.

### RP.REC.002 — What Could Help You Most Right Now
**Description:** Identifies the strongest supported recommendation based on current materiality, opportunity, risk, and user-controlled objectives.

---

# 21. Outcome and learning products

## RP.OUT — Outcome Products

### RP.OUT.001 — What Happened After Your Decision
**Description:** Compares a prior decision or recommendation with the subsequently observed outcome where sufficient evidence exists.

### RP.OUT.002 — Did the Prediction Hold Up
**Description:** Compares predicted state with later observed state and exposes prediction error and limitations.

## RP.LEARN — Learning Products

### RP.LEARN.001 — What IRIS Learned About Your Financial Patterns
**Description:** Explains governed changes in understanding resulting from verified evidence and observed outcomes.

### RP.LEARN.002 — What Changed in IRIS's Understanding
**Description:** Shows versioned changes in thresholds, interpretations, or models that affect the user's future intelligence.

---

# 22. Cross-domain and educational products

## RP.XD — Cross-Domain Products

### RP.XD.001 — The Most Important Connection in Your Financial Life
**Description:** Identifies the highest-materiality supported relationship spanning multiple financial domains.

### RP.XD.002 — What Your Financial Life Is Really Telling You
**Description:** A higher-order educational synthesis that connects multiple intelligence layers while clearly separating observations, derivations, predictions, and hypotheses.

### RP.XD.003 — Your Complete Financial-Life State
**Description:** The broadest evidence-qualified synthesis available for the user's currently observed financial domains. It must clearly expose missing domains and evidence limitations.

### RP.XD.004 — The One Thing That Matters Most Right Now
**Description:** Selects the most materially important supported intelligence across the user's available financial-life state and explains why it matters.

### RP.XD.005 — Your Financial Life, Explained
**Description:** An educational traversal of the user's financial state from observations through higher-order intelligence, allowing the user to understand not just what IRIS knows but why.

---

# 23. Question-generated report products

The catalog is not restricted to predefined names.

A user can ask a legitimate question such as:

- “Why did my financial position change?”
- “Where is most of my money going?”
- “What is putting the most pressure on me?”
- “What could improve my position?”
- “What changed this month?”
- “What should I understand before I make this decision?”
- “What is unusual?”
- “What happens if this continues?”

IRIS can compose a report product from the intelligence graph when the required evidence and semantic dependencies exist.

Such a report receives a governed product identity and a human-readable name derived from the most important supported intelligence in the resulting report.

This allows the catalog to grow beyond manually enumerated templates without turning the system into an uncontrolled report generator.

---

# 24. Headline-intelligence naming engine

The report title should be selected by evaluating candidate intelligence within the report against at least:

- materiality;
- user relevance;
- explanatory power;
- actionability;
- educational value;
- magnitude where meaningful;
- confidence;
- evidence sufficiency;
- recency;
- temporal importance;
- cross-domain significance;
- opportunity value;
- risk significance; and
- novelty relative to what the user already knows.

The selected headline intelligence becomes:

`headline_intelligence_node_id`

The title generator may then convert that intelligence into natural language.

### Critical rule

**The title must never be more certain than the underlying intelligence.**

If the underlying intelligence says:

`predicted`

the title cannot say:

`will happen`.

If the underlying intelligence says:

`possible causal relationship`

it cannot say:

`caused by`.

If evidence is insufficient, the title must reflect uncertainty or the report must remain unavailable.

---

# 25. Activation model

The user-facing library should expose two related but distinct controls:

### Intelligence visibility / activation

Where product design and subscription policy permit, users can control which intelligence surfaces they want IRIS to actively emphasize, monitor, explain, or present.

### Report-product activation

Users can activate or deactivate report products, report families, or notification surfaces.

Deactivation means:

**do not actively surface this product to me.**

It must not mean:

**erase the underlying evidence or intelligence.**

The distinction is essential for preserving the integrity of the user's intelligence ecosystem.

---

# 26. Subscription model

During beta:

**All report products are intended to be free.**

After beta, subscription entitlements may expose different portions of the catalog.

The subscription system must support at minimum:

- product entitlement;
- family entitlement;
- intelligence-surface entitlement where applicable;
- beta override;
- user activation;
- product availability;
- evidence sufficiency;
- implementation state;
- certification state.

A product can therefore be:

- Included and available
- Included but insufficient evidence
- Included but temporarily unavailable
- Included but not yet implemented
- Locked by subscription
- Available but deactivated by the user
- Historical only
- Not applicable

These states must never be collapsed into a single boolean.

---

# 27. User experience objective

The intended experience is not:

> “Here are some banking reports.”

It is:

> **“Here is your own living, interactive financial-life intelligence ecosystem. Explore what IRIS knows, understand why it knows it, discover what your financial life means, see what matters most, learn how the pieces connect, explore what could happen next, and decide what you want IRIS to keep watching or explaining.”**

The library and catalog should therefore feel like an explorable map of the user's own financial intelligence.

A user should be able to move naturally:

`Report → Headline Intelligence → Supporting Intelligence → Evidence → Relationship → Higher-Order Intelligence → Related Reports`

and in the opposite direction:

`Evidence → Intelligence → Higher-Order Intelligence → Available Reports`

That bidirectional traversal is a core part of the product experience.

---

# 28. Product generation boundary

A report product may only be generated when:

1. required evidence exists;
2. the evidence is within the exact allowed boundary;
3. required upstream intelligence exists;
4. semantic dependencies are actually consumed;
5. required transformations are satisfied;
6. lineage is preserved;
7. uncertainty is represented;
8. the report's claims are supported;
9. its publication state is known; and
10. subscription/user activation rules permit publication.

No template may bypass these requirements.

---

# 29. The report catalog is intentionally unbounded

The named products in this document are foundational examples and stable product identities, not a maximum report count.

New reports can emerge from:

- new intelligence;
- new cross-domain relationships;
- new temporal contexts;
- new user questions;
- new scenario variables;
- new educational views;
- new comparison dimensions;
- new verified outcomes;
- new recursive compositions; and
- new combinations of existing intelligence that produce a materially different and useful report.

The product catalog therefore follows the intelligence graph rather than constraining it.

## Governing distinction

**Intelligence answers: “What does this mean?”**

**A report product answers: “How should this meaningful intelligence be presented to this user for this purpose?”**

The user owns the experience: they can explore, learn, activate, deactivate, compare, drill down, ask questions, and move between intelligence and products according to their subscription and evidence availability.

The truth boundary remains absolute:

**No evidence → no factual report claim.**

**No valid intelligence → no derived report claim.**

**No certification → no certification claim.**

**No fabricated data, intelligence, or report content.**