# IRIS Visual Interaction System

## Purpose

This is the visual and interaction contract for the IRIS consumer experience. It translates the IRIS Experience Standard and Full Consumer User Journey into a coherent visual language that can accommodate finite and arbitrarily deep intelligence without making the interface feel technical or fragmented.

This document defines interaction semantics, visual states, progressive disclosure, motion, evidence visualization, graph exploration, conversational interaction, scenario interaction, decision interaction, outcome/learning interaction, accessibility, and anti-fabrication rules. It does not certify runtime behavior.

## 1. Core experience equation

IRIS should continuously help the user move through:

`See → Understand → Verify → Explore → Compare → Ask → Decide → Observe → Learn`

A meaningful object should expose the next useful action when the corresponding governed capability exists. The interface must not imply that an unavailable action has completed.

## 2. Visual hierarchy

The visual hierarchy is semantic, not decorative:

1. **Meaning** — what matters to the user.
2. **State** — whether the information is observed, inferred, modeled, limited, unavailable, or otherwise governed.
3. **Evidence** — why the system can say it.
4. **Relationship** — what the information connects to.
5. **Change** — what differs over a supported comparison period.
6. **Possibility** — what could happen under an explicitly labeled scenario.
7. **Decision** — what choices and tradeoffs can be considered.
8. **Outcome** — what actually happened afterward.
9. **Learning** — what newly observed reality permits IRIS to understand.

The interface must never reverse this hierarchy by leading with implementation metadata, capability names, or provider terminology when a human-readable explanation is available.

## 3. Universal IRIS object

Every material intelligence object should have a consistent interaction anatomy when applicable:

```text
┌─────────────────────────────────────────────┐
│ MEANING                                     │
│ Human-readable conclusion or observation    │
│                                             │
│ STATE                                       │
│ Observed / Derived / Scenario / Limited     │
│                                             │
│ WHY IT MATTERS                              │
│ Short contextual explanation                │
│                                             │
│ [Understand] [Verify] [Explore] [Ask]      │
└─────────────────────────────────────────────┘
                         │
                         ▼
              progressive disclosure
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      reasoning       evidence       relationships
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    [Compare]
                         │
                         ▼
                    [Decide]
```

Controls only appear when their backend contract exists.

## 4. Evidence-state visual language

Evidence state is part of the product's meaning and must remain distinguishable from presentation state.

```text
AVAILABLE
   ↓
CONSENTED
   ↓
AUTHORIZED
   ↓
PROVIDER RESPONSE RECEIVED
   ↓
OBSERVATION PERSISTED
   ↓
EVIDENCE CERTIFIED
   ↓
INTELLIGENCE CONSUMABLE
   ↓
INTELLIGENCE CONSUMED
   ↓
REPORT PUBLISHABLE
```

These states should be represented with a restrained progression indicator, not a misleading completion animation.

Required behavior:

- **Available** never means observed.
- **Consented** never means provider response received.
- **Authorized** never means evidence certified.
- **Observed** never automatically means semantically sufficient.
- **Publishable** must come from the governed publication boundary.

Unknown and insufficient states must have deliberate visual treatment and must never be represented as zero.

## 5. Reality versus interpretation

IRIS must visually separate epistemic classes:

```text
OBSERVED
What the evidence directly establishes.

DERIVED
What governed transformations establish from upstream evidence/intelligence.

INFERRED
An interpretation that is not itself a direct observation.

SCENARIO
A hypothetical or counterfactual result.

PREDICTION
A forward-looking estimate when the governed capability supports it.

OUTCOME
A later real-world observation.
```

The same visual language must not be reused in a way that makes these classes appear equivalent.

## 6. Progressive disclosure layers

### Layer 1 — Human

The user sees the meaning in plain language.

### Layer 2 — Context

The user sees why it matters, what changed, and what to do next.

### Layer 3 — Intelligence

The user sees supporting intelligence and relationships.

### Layer 4 — Reasoning

The user sees transformations, assumptions, uncertainty, and dependencies where available.

### Layer 5 — Evidence

The user sees exact evidence boundary, freshness, source observation, and provenance where available.

### Layer 6 — Technical provenance

Authorized/appropriate inspection surfaces may expose exact node IDs, run IDs, execution boundaries, hashes, and lineage metadata. These are inspection details, not the primary consumer experience.

No layer may invent missing information merely to make disclosure appear complete.

## 7. Intelligence graph visualization

The recursive intelligence graph must not be rendered as a fixed hierarchy of numbered levels.

Preferred representation:

```text
                  [Meaning]
                      │
              ┌───────┴───────┐
              ▼               ▼
        [Intelligence]   [Intelligence]
              │               │
        ┌─────┴─────┐         │
        ▼           ▼         ▼
     [Node]       [Node]    [Node]
        └───────────┬─────────┘
                    ▼
              [Higher-order]
                    │
                    ▼
               [Report]
```

Interaction requirements:

- Tap/click a node to inspect its human meaning.
- Expand to upstream intelligence when lineage exists.
- Traverse to evidence when exact evidence lineage exists.
- Traverse forward to supported reports.
- Show unresolved or ambiguous edges explicitly.
- Prevent cross-user, cross-run, or cross-execution traversal.
- Never render a graph edge merely because two concepts sound related.
- Never imply that visual proximity proves causation.

The graph is a semantic navigation surface, not a decorative network animation.

## 8. Timeline interaction

Temporal intelligence should use a stable timeline model:

```text
PAST                         COMPARISON                 NOW
 ●──────────────●──────────────●────────────────────────●
                 │
                 └── meaningful supported change
```

A change can be opened into:

`What changed → What contributed → What evidence supports it → Is it recurring? → What could happen?`

A comparison must only be presented when the required temporal evidence exists.

## 9. Ask IRIS interaction

Ask IRIS is a universal intelligence entry point, not merely a chat window.

Each answer must preserve the governed result class:

- answered;
- partially answered;
- insufficient evidence;
- unavailable capability;
- scenario/hypothetical;
- clarification required.

A conversational answer must expose useful next actions when supported:

`Understand → Show evidence → Explore relationship → Compare → Scenario → Decide`

The system must not fill evidence gaps with invented numbers, transactions, dates, institutions, probabilities, outcomes, or conclusions.

## 10. Scenario interaction

Scenario UI must make the distinction between reality and possibility visually unmistakable.

```text
REALITY
Observed evidence
     │
     ▼
BASELINE
Governed current state
     │
     ▼
SCENARIO
Hypothetical change
     │
     ▼
MODELED RESULT
Explicitly hypothetical
```

User-controlled scenario variables must be visibly labeled as assumptions. Scenario outputs must not become observations merely because the user interacts with them.

## 11. Decision interaction

Decision support should expose:

- decision question;
- supported evidence;
- alternatives;
- modeled consequences where supported;
- uncertainty;
- assumptions;
- tradeoffs;
- what would change the decision;
- user-selected next action.

Preferred visual model:

```text
                 DECISION
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      OPTION A     OPTION B     OPTION C
        │            │            │
     tradeoffs    tradeoffs    tradeoffs
        └────────────┼────────────┘
                     ▼
              WHAT CHANGES IT?
```

Recommendations are never proof of outcomes.

## 12. Outcome and learning interaction

Outcomes must be temporally separated from prior scenarios or recommendations.

```text
EARLIER
Decision / scenario
       ↓
LATER
New real-world evidence
       ↓
OBSERVED OUTCOME
       ↓
COMPARISON
       ↓
LEARNING
```

IRIS must not claim an outcome occurred solely because an action or recommendation was displayed.

## 13. Motion

Motion communicates state and spatial relationship.

Use motion to:

- show evidence formation progress;
- reveal deeper explanation layers;
- preserve graph traversal orientation;
- connect a conclusion to its upstream evidence;
- show temporal movement;
- make transitions between reality, scenario, and outcome understandable.

Do not use motion to:

- imply certainty;
- make missing data look populated;
- disguise loading as completed intelligence;
- create fake financial activity;
- imply that a recommendation was executed.

Reduced-motion preferences must receive an equivalent non-animated representation.

## 14. Visuals and imagery

IRIS should prefer information-bearing visuals over stock decoration.

Useful visual classes include:

- evidence/provenance graphs;
- temporal timelines;
- relationship maps;
- scenario diagrams;
- decision matrices;
- outcome comparisons;
- account/source relationship diagrams;
- empty-state illustrations that communicate absence without inventing financial facts.

Decorative imagery may establish emotional tone, but it must never be mistaken for financial evidence or user-specific state.

## 15. Interaction continuity

Every surface should preserve the user's current intelligence context:

- the question they asked;
- the intelligence object they opened;
- the evidence boundary being inspected;
- the comparison period;
- the scenario assumptions;
- the decision under consideration;
- the last known outcome state.

Returning to a previous surface should restore meaningful context where safe and supported.

## 16. Failure as a first-class visual state

Failure states should explain:

1. what failed;
2. what IRIS knows despite the failure;
3. what IRIS cannot establish;
4. whether retrying is valid;
5. what the user can do next.

A failed provider sync, incomplete evidence boundary, unresolved lineage, insufficient semantic evidence, or suppressed report must never look like a successful empty dashboard.

## 17. Accessibility

Required across all surfaces:

- keyboard-complete navigation;
- visible focus;
- semantic headings;
- screen-reader labels for interactive intelligence objects;
- touch targets appropriate for mobile;
- sufficient contrast;
- reduced-motion support;
- non-color-only state communication;
- graph alternatives for users who cannot inspect spatial diagrams;
- text equivalents for important visual relationships.

## 18. Performance and trust

Loading states must communicate what IRIS is actually doing. Stale data must be distinguishable from current data. Progressive rendering must never display a placeholder value as though it were a financial observation.

## 19. Certification boundary

This visual system defines intended behavior. It does not certify that any surface currently implements it. Certification requires actual frontend/backend contracts, live evidence behavior, interaction verification, deployment verification, and end-to-end verification against real provider evidence.
