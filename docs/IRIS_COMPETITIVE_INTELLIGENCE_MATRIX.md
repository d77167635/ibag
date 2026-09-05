# Iris Competitive Capability & Simulation Matrix

**Status:** Living product architecture document  
**Product:** Iris  
**Savings / round-up destination:** iBag  
**Principle:** competitor parity is the floor; evidence-grounded intelligence is the differentiator.

## 1. Research boundary

This matrix treats leading consumer-finance products as capability benchmarks, not as architectural authorities. Features are verified against current public product documentation where available. The benchmark must be periodically refreshed because competitor products change continuously.

Iris should not copy competitors' UX literally. It should understand the underlying job each capability performs, implement the capability where useful, then add deeper evidence, relationships, explanations, scenarios, consequences, and education.

## 2. Capability benchmark

### Acorns

Observed public capabilities include Round-Ups, automated investing, diversified portfolios, retirement accounts, checking/debit, emergency savings, recurring investments, one-time investments, and educational content. Acorns describes Round-Ups as rounding linked purchases to the next dollar and investing accumulated spare change; its current product surface also includes checking and emergency savings. 

**Iris parity:** round-up analysis, savings goals, cash-flow-aware saving, investment visibility where supported by evidence, financial education.

**Iris advantage:** do not stop at automation. Explain the observed opportunity, affordability, timing, source transactions, account impact, alternatives, risks, and consequences. Keep actual money movement behind explicit production funding/authorization gates.

### Monarch Money

Observed public capabilities include account aggregation, net worth, transactions, AI categorization, reports, recurring bills/subscriptions, investments, dashboard customization, budgets, goals, planning, and collaboration. 

**Iris parity:** unified financial picture, spending, cash flow, net worth, recurring analysis, investments, goals, household context.

**Iris advantage:** a relational intelligence layer that can connect an observed merchant/category/account/time pattern to liquidity, behavior, debt, forecasts, scenarios, decisions, evidence quality, and next investigations instead of presenting those as isolated modules.

### Rocket Money

Observed public capabilities include account linking, balance alerts, subscription detection/management, spending tracking, budgeting, net worth, financial goals/automated savings, credit monitoring, and bill negotiation/cancellation services. 

**Iris parity:** recurring/subscription intelligence, alerts, spending, goals, net worth, credit/debt analysis, savings opportunities.

**Iris advantage:** identify *why* a recurring or bill pattern matters to the user's broader financial state, show evidence and uncertainty, compare alternatives, model consequences, and educate before any action. External negotiation/action should be treated as a separately authorized funded capability rather than assumed to exist merely because the analysis exists.

### YNAB

Observed public capabilities include goal/target tracking, loan planning, spending and net-worth reports, and a strong zero-based budgeting methodology. 

**Iris parity:** budgeting concepts, goals, debt planning, reporting, allocation/priority analysis.

**Iris advantage:** users should not have to manually model every relationship before Iris can reveal it. Iris can infer only when evidence supports inference, preserve uncertainty, and construct investigations dynamically from actual observations.

### Quicken Simplifi / Quicken

Observed public capabilities include dashboard tiles for spending plans, net worth, transactions, bills/income, top spending categories, savings goals, watchlists, investments and related reports. Watchlists can monitor categories, payees, tags, project likely monthly totals, compare with averages, and alert near/over targets. Quicken also documents customizable spending, income, net-income, savings, investing, net-worth, credit-score, tax and monthly-summary reports, plus investment performance reporting. 

**Iris parity:** dashboards, reports, watchlists, investment visibility, goals, recurring/bills, net worth.

**Iris advantage:** replace report hunting with investigation generation. A watchlist is an input; Iris should be able to explain the drivers, identify connected accounts/merchants/categories, test scenarios, expose uncertainty, and recommend the next most informative question.

### Copilot Money

Current public documentation describes spending, budgets, investments, savings, cash flow, subscriptions, net worth, recurring transactions, alerts, transaction categorization, goals and investment performance. Its Money Assistant beta can answer questions over user financial data and can create/update/delete categories, budgets, transactions, recurrings and rules, plus surface proactive suggestions. Copilot also documents a demo mode and MCP access. 

**Iris parity:** conversational financial questions, categorization, budgets, recurring analysis, goals, cash flow, investment tracking, alerts, proactive suggestions.

**Iris advantage:** conversation is only one interface. Iris's underlying composition engine should be capable of constructing evidence-valid analyses even when the user does not know which feature to ask for. Every answer should be able to expose the evidence graph, confidence, limitations, reasoning path, related investigations and consequences. Any write/action capability must be separately authorized and state-aware.

### Empower Personal Dashboard

Observed public capabilities include connected financial accounts, budgeting/planning guidance, retirement decisions, investment allocation visibility and access to professional help. 

**Iris parity:** financial aggregation, planning, retirement/investment visibility, allocation and education.

**Iris advantage:** continuous relational synthesis rather than a collection of planning tools. Iris should be able to explain how current observed behavior affects future states and which additional evidence would most reduce uncertainty.

## 3. Cross-competitor capability taxonomy

The benchmark should continuously cover at least these domains:

1. Account aggregation and synchronization
2. Transaction search and review
3. Categorization and merchant intelligence
4. Spending analysis
5. Cash-flow analysis
6. Income analysis
7. Recurring bills and subscriptions
8. Budgeting and rollovers
9. Goals and savings planning
10. Round-ups and automated saving
11. Net worth
12. Debt and loan planning
13. Credit monitoring where a lawful/authorized data source exists
14. Investment and retirement visibility where a lawful/authorized data source exists
15. Alerts and proactive monitoring
16. Reports and custom views
17. Household/collaboration
18. Education
19. Conversational financial assistance
20. Recommendations and optimization
21. Scenario/counterfactual modeling
22. Action execution
23. Negotiation/cancellation services
24. Data export/interoperability
25. Security, authentication and session controls
26. Explainability and evidence provenance

The first 20 are common product capabilities. The last several are where Iris should distinguish **capability** from **intelligence depth** and **analysis** from **execution**.

## 4. Iris's required competitive architecture

Every benchmarked capability should map through this chain:

`source observation -> canonical evidence -> relationship graph -> analytical primitives -> contextual composition -> evidence gate -> synthesis -> education/decision -> optional simulation -> optional funded execution`

Competitor parity therefore does not require duplicating every competitor's implementation. It requires matching the user outcome while preserving Iris's stronger evidence and reasoning model.

## 5. Simulation-first execution architecture

Iris should support a **Simulation Mode** that can reproduce the decision/action logic of production capabilities without moving real money or changing external financial state.

Simulation is not fake financial data. It is an explicit, labeled scenario/action projection operating on real observed evidence and user-selected hypothetical parameters.

### Simulation rules

- Real provider observations remain immutable source evidence.
- Simulation never writes to a bank, card, brokerage, lender, biller, or payment rail.
- Simulation never silently changes canonical financial facts.
- Every simulated output is labeled as simulated/scenario/counterfactual.
- The system stores inputs, assumptions, constraints, formulas/rules, evidence references, and outputs for reproducibility.
- Simulations can be compared against observed history when actual outcomes later arrive.
- A simulated action cannot be represented as completed execution.
- Moving from simulation to execution requires an explicit production capability gate, authorization, funding/availability checks, risk checks, idempotency, audit logging, and a user confirmation step appropriate to the action.

### Examples

**Round-ups:** calculate exactly what would accumulate from eligible observed purchases; simulate deposit timing and affordability; do not transfer money in Phase 1.

**Subscription cancellation:** identify the recurring expense and estimate impact; simulate savings if cancelled; only invoke real cancellation through a separately authorized execution integration.

**Bill negotiation:** estimate potential savings from observed bill history; simulate cash-flow impact; do not represent a negotiated rate as real unless an authorized service actually completes it.

**Debt payoff:** simulate avalanche/snowball/extra-payment alternatives using observed balances, rates and payments where evidence exists; do not submit a payment in simulation.

**Savings goals:** simulate contribution schedules, runway and goal completion; do not move funds.

**Investment decisions:** simulate allocation/return scenarios using explicitly labeled assumptions and permitted market/investment evidence; do not execute trades unless a separately authorized production investment capability exists.

**Budget changes:** simulate how a category or spending change affects cash flow, liquidity and goals before any real write.

## 6. Production activation gate

The fact that a capability works perfectly in simulation is not sufficient to activate money movement.

Execution requires all of:

- capability explicitly enabled for production;
- required provider/integration available;
- current source evidence sufficient for the action;
- user authorization for the specific action class;
- funds/availability/limits validated;
- risk and policy checks passed;
- idempotency key and durable execution record established;
- clear before/after state;
- confirmation UX appropriate to materiality;
- provider acknowledgement recorded;
- reconciliation after execution;
- failure/rollback or compensating-action strategy where applicable.

Until all gates pass, Iris remains analytical/simulated even if the simulated path is fully tested.

## 7. Maximum-intelligence requirement

The benchmark does **not** define a final number of Iris features.

A competitor feature becomes one or more Iris analytical primitives. Those primitives can compose across:

- account
- institution
- merchant
- category
- domain
- transaction class
- time window
- recurring behavior
- income
- liquidity
- debt
- goals
- round-ups
- anomalies
- causal hypotheses
- forecast state
- scenario variables
- decisions
- consequences
- evidence quality
- user questions

The valid composition space must be computed from relationships and constraints. It must never be inflated by multiplying unrelated dimensions.

## 8. Competitive advantage test

For every competitor capability, Iris should be able to answer:

1. What is happening?
2. What evidence proves it?
3. How certain are we?
4. What relationships explain it?
5. Why does it matter?
6. What is likely to happen next?
7. What could change the outcome?
8. What are the available alternatives?
9. What would each alternative cause?
10. What information is still missing?
11. What is the next best investigation?
12. What can be simulated safely?
13. What, if anything, can be executed in production?

That is the intended difference between a personal-finance feature set and Iris as a financial intelligence system.

## 9. Current source references

- Acorns: public product and Round-Ups documentation.
- Monarch Money: public product/features documentation.
- Rocket Money: public FAQ/product documentation.
- YNAB: public features documentation.
- Quicken Simplifi/Quicken: public dashboard, watchlist, investment and reporting documentation.
- Copilot Money: public FAQ, help center and product update documentation.
- Empower: public financial tools documentation.

This document is intentionally a living benchmark. New competitors and newly released capabilities should be added without weakening the source/evidence/simulation boundaries above.
