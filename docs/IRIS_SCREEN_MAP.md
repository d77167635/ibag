# IRIS Screen-by-Screen Consumer Product Map

## Purpose

This document maps the complete IRIS consumer experience from first arrival through connection, evidence formation, understanding, exploration, decision, action, outcome, learning, and return.

The map is a product architecture, not a claim that every surface is currently implemented or certified.

## Global shell

Every authenticated IRIS surface belongs to one continuous experience rather than a collection of disconnected pages.

```text
┌────────────────────────────────────────────────────────────────┐
│ IRIS                                      Evidence / Status     │
├───────────────┬────────────────────────────────────────────────┤
│ IRIS          │                                                │
│ My Financial  │                 ACTIVE SURFACE                  │
│ Life          │                                                │
│ What Matters  │                                                │
│ What Changed  │                                                │
│ Ask IRIS      │                                                │
│ Understand    │                                                │
│ Intelligence  │                                                │
│ Reports       │                                                │
│ Decisions     │                                                │
│ Outcomes      │                                                │
│ Evidence      │                                                │
└───────────────┴────────────────────────────────────────────────┘
```

The navigation is conceptual. The implementation may use responsive navigation, command surfaces, contextual links, or other patterns as long as the user experiences one connected intelligence system.

## Screen 0 — Arrival / First Contact

### Purpose

Introduce IRIS before requesting financial access.

### User questions answered

- What is IRIS?
- What can IRIS do?
- What does IRIS know right now?
- What does IRIS not know?
- Why connect evidence?

### Primary actions

- Connect evidence.
- Explore how IRIS works.
- Ask a general question where supported.

### Visuals

- calm IRIS identity;
- interactive explanation of the intelligence relationship;
- evidence-state explanation;
- no fabricated financial dashboard.

### Trust rule

No user-specific financial conclusion may appear unless the governed publication boundary permits it.

## Screen 1 — Connection Center

### Purpose

Turn provider connection into an understandable evidence journey.

### Primary flow

`Available → Consent → Authorization → Provider response → Observation`

### Interactions

- connect source;
- inspect requested products/evidence scope;
- understand what each connection enables;
- cancel;
- retry failed connection;
- inspect connection status.

### Visual

A progressive evidence-formation rail rather than a generic spinner.

## Screen 2 — Evidence Formation

### Purpose

Show that IRIS is forming a trustworthy evidence foundation without exposing backend implementation noise as the primary experience.

### User can inspect

- source;
- freshness;
- coverage;
- limitations;
- current state;
- whether evidence is certified for intelligence use.

### States

- connecting;
- provider response pending;
- partial observation;
- observation persisted;
- evidence certified;
- failed/retryable;
- insufficient evidence.

## Screen 3 — IRIS Home / What Matters

### Purpose

The primary consumer intelligence surface.

### Layout

```text
IRIS
────────────────────────────────────────────
WHAT MATTERS

[Most material supported understanding]

Why it matters      [Understand]
How Iris knows      [Verify]
What changed        [Explore]

────────────────────────────────────────────
WHAT'S NEXT
[Ask IRIS] [Explore] [Compare] [Decide]
```

### Rules

- lead with meaning, not metrics;
- show only governed intelligence;
- preserve unknown states;
- every meaningful result should have a next exploration;
- report publication remains certification-gated.

## Screen 4 — My Financial Life

### Purpose

Provide the connected-state view across the eight authoritative evidence domains without turning the product into eight disconnected dashboards.

### Domains

- Authentication
- Transactions
- Balance
- Identity
- Assets
- Liabilities
- Investments
- Statements

### Visual

A connected evidence map showing coverage and state.

```text
                  MY FINANCIAL LIFE
                         │
       ┌─────────┬───────┼───────┬─────────┐
       ↓         ↓       ↓       ↓         ↓
   Accounts  Activity  Balance  Assets  Liabilities
       │         │       │       │         │
       └─────────┴───────┼───────┴─────────┘
                         ↓
                   INTELLIGENCE
```

No domain node should be presented as observed merely because its architecture is defined.

## Screen 5 — What Changed

### Purpose

Surface meaningful supported temporal changes.

### Interactions

- open a change;
- compare periods where supported;
- inspect contributors;
- inspect evidence;
- ask IRIS about the change;
- explore recurrence.

### Visual

Interactive timeline with expandable change points.

## Screen 6 — Ask IRIS

### Purpose

Universal natural-language intelligence entry point.

### Interaction model

```text
QUESTION
   ↓
EVIDENCE / CAPABILITY CHECK
   ↓
RESULT CLASS
   ├── Answered
   ├── Partial
   ├── Insufficient evidence
   ├── Unavailable capability
   ├── Scenario
   └── Clarification
```

### Follow-up actions

- understand;
- verify;
- show evidence;
- explore relationships;
- compare;
- scenario;
- decide.

The user should not need to know capability names.

## Screen 7 — Understand

### Purpose

Progressively reveal how IRIS reached a conclusion.

### Default view

Plain-language explanation.

### Expandable layers

```text
CONCLUSION
    ↓
SUPPORTING INTELLIGENCE
    ↓
TRANSFORMATION
    ↓
UPSTREAM INTELLIGENCE
    ↓
EVIDENCE
    ↓
SOURCE OBSERVATION
```

### Interaction

The user can stop at any layer or continue to technical provenance when available.

If lineage is unavailable or unresolved, the screen must state that limitation.

## Screen 8 — Intelligence Explorer

### Purpose

Expose recursive intelligence as an explorable relationship system.

### Interactions

- zoom/explore supported relationships;
- open upstream intelligence;
- traverse downstream reports;
- inspect evidence;
- ask about a relationship;
- compare related intelligence.

### Critical constraint

There is no fixed semantic depth ceiling. The UI therefore uses graph traversal and progressive disclosure rather than Level 1/2/3/4 screens.

## Screen 9 — Reports & Analytics

### Purpose

Present user-facing products generated from governed intelligence.

### User controls

- browse;
- search;
- filter;
- inspect dependencies;
- activate/deactivate supported products;
- inspect publication state;
- traverse report → intelligence → evidence;
- traverse evidence → intelligence → reports where supported.

### Report card anatomy

```text
REPORT
Headline intelligence

State / evidence boundary
Why this report exists
[Open]
[Understand]
[Evidence]
```

A report title must never make a stronger claim than its underlying intelligence.

## Screen 10 — Evidence Explorer

### Purpose

Make trust inspectable without forcing technical detail on every user.

### Views

- source;
- observation;
- freshness;
- evidence boundary;
- intelligence consuming it;
- reports depending on it;
- unresolved limitations.

### Core traversal

`Evidence → Intelligence → Report`

and

`Report → Intelligence → Evidence`

## Screen 11 — Scenario Lab

### Purpose

Explore hypothetical outcomes while clearly separating possibility from reality.

### Structure

```text
CURRENT OBSERVED STATE
          ↓
       ASSUMPTIONS
          ↓
       SCENARIO A
          ↓
     MODELED RESULT

       SCENARIO B
          ↓
     MODELED RESULT
```

### Controls

Only scenario variables supported by the governing runtime are interactive.

### State labeling

Every scenario result is explicitly hypothetical.

## Screen 12 — Decision Space

### Purpose

Turn supported intelligence into user-controlled decision support.

### Decision model

- decision question;
- evidence;
- alternatives;
- tradeoffs;
- modeled consequences;
- uncertainty;
- assumptions;
- what would change the recommendation;
- user-selected action.

### Visual

Interactive comparison matrix or decision tree, not a single unexplained recommendation.

## Screen 13 — Action / Confirmation

### Purpose

Separate understanding and decision from external action.

### Current read-only scope

IRIS may guide, prepare, explain, simulate, compare, or organize next steps. It must not claim to have moved money or completed an external financial action when it has not.

### Future extensibility

If real action capabilities are introduced later, the UI must preserve distinct states:

`Proposed → User confirmed → Submitted → Provider acknowledged → Completed → Outcome observed`

## Screen 14 — Outcomes

### Purpose

Observe what actually happened after a decision or scenario.

### Visual

```text
DECISION
   ↓
EXPECTED / MODELED POSSIBILITY
   ↓
NEW EVIDENCE
   ↓
OBSERVED OUTCOME
   ↓
COMPARE
```

The system must not manufacture an outcome because a recommendation or action interface was shown.

## Screen 15 — Learning

### Purpose

Use new real-world observations to support new intelligence and higher-order compositions.

### User experience

The user can see:

- what became newly known;
- what changed in understanding;
- which previous scenario can now be compared with reality;
- what remains unresolved;
- what new questions are now answerable.

Learning is grounded in observed outcomes and new evidence, not self-reported success invented by the system.

## Screen 16 — Return / Continuation

### Purpose

Make the next session feel like continuation rather than reset.

### Entry message structure

```text
SINCE YOU WERE LAST HERE

What changed
What became newly knowable
What remains unresolved
What decisions remain open
What outcomes were observed

[Continue]
[Show what changed]
[Ask IRIS]
```

No historical claim is shown unless supported by persisted evidence/intelligence state.

## Context-preserving interaction model

Across every screen, IRIS should preserve the active context where supported:

- current question;
- selected intelligence;
- selected evidence;
- comparison period;
- scenario assumptions;
- decision;
- outcome.

The user should be able to move laterally without losing the semantic thread.

## Cross-screen intelligence actions

A common action rail should appear contextually where applicable:

`Understand | Verify | Explore | Compare | Ask | Scenario | Decide`

Not every action appears everywhere. Availability is governed by the actual backend contract and current evidence state.

## Failure journey

Every screen has an explicit failure/insufficient state.

```text
FAILURE
  ↓
WHAT HAPPENED?
  ↓
WHAT IRIS STILL KNOWS
  ↓
WHAT IRIS CANNOT ESTABLISH
  ↓
CAN IT BE RETRIED?
  ↓
WHAT CAN THE USER DO NEXT?
```

Failure must remain part of the product experience, not a technical afterthought.

## Responsive composition

### Mobile

Prioritize:

`Meaning → State → Next action → Evidence → Deeper exploration`

Use bottom sheets, expandable sections, horizontal timelines, and focused graph traversal instead of attempting to show the entire intelligence graph simultaneously.

### Desktop

Use:

- persistent contextual navigation;
- multi-column evidence/explanation layouts;
- larger relationship visualizations;
- side-by-side comparisons;
- persistent Ask IRIS entry point.

Both modes represent the same semantic model.

## Certification map

The existence of a screen does not certify the journey. Certification must verify:

1. actual frontend/backend contract;
2. real provider evidence;
3. exact user/run/execution boundaries;
4. persisted intelligence;
5. semantic sufficiency;
6. exact lineage;
7. publication controls;
8. interaction behavior;
9. deployed services;
10. end-to-end observable user journey.
