# iBag / Iris

Iris is the user-facing financial intelligence system. **Supabase is the canonical application source of truth. Plaid is only the authorized connection/ingestion mechanism.** Users connect accounts through Plaid Link from the Iris dashboard and return to Iris; there is no separate Plaid dashboard or Plaid data-screen experience.

## Data plane

```text
User → Iris dashboard → Plaid Link → Plaid → Supabase raw evidence
                                      ↓
                              Supabase canonical model
                                      ↓
                              Iris data presentation
                                      ↓
                              Iris intelligence
```

The system must never manufacture, seed, mock, or hardcode financial facts. Provider observations are preserved as evidence; Supabase canonical records are the application source of truth; Iris derives intelligence without silently rewriting source truth.

## Intelligence plane

Iris is the supreme intelligence and supervisory control plane over a hybrid intelligence substrate:

```text
                         IRIS
              supreme intelligence
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      GOVERNANCE    COMPOSITION      LEARNING
          └──────────────┼──────────────┘
                         ↓
                 INTELLIGENCE GRAPH
                         ↓
        hierarchy · graph · recursion
        composition · cross-domain
                         ↓
                    VALIDATION
                         ↓
                    USER OUTPUT
```

The hierarchy is progressive rather than a fixed execution pipeline. The graph permits lateral relationships. The composition engine chooses valid intelligence combinations and execution order. Recursive paths may reuse validated outputs. Outcome, learning, adaptation, discovery, and meta-intelligence feed back into Iris governance.

### Intelligence capability families

The registry is extensible and is not a hard intelligence-depth ceiling. Current architecture covers data integrity, semantics, relationships, temporal reasoning, behavior, patterns/anomalies, explanation, causal/mechanistic reasoning, prediction, scenarios/counterfactuals, decisions, recommendations, action planning, outcomes, learning, adaptation, emergent discovery, and meta-intelligence.

Every operation is evidence-gated and lineage-aware. Observed facts, calculated values, inferences, limitations, and insufficient evidence remain distinct.

## 100% data integrity contract

Intelligence certification is downstream of data certification. The implementation must prove, in order:

1. Plaid transmitted the authorized data expected for the connected institution/account.
2. Supabase received the transmitted observations.
3. Supabase preserved the observations without unexplained loss, duplication, or corruption.
4. Supabase canonicalization mapped source observations correctly.
5. Supabase supplied all required canonical data to Iris.
6. Iris received the required canonical fields.
7. Every applicable user-data field is mapped to the Iris presentation model.
8. Every applicable displayed value reconciles to Supabase or to an explicitly declared deterministic derivation.
9. Every intelligence input and output is traceable through bidirectional lineage.
10. Known integrity failures are surfaced, constrained, or blocked; Iris never guesses through an evidence failure.

“All data” means all applicable user financial data represented by the canonical Supabase model, not irrelevant implementation metadata or protected credentials.

## Lineage contract

```text
provider observation
  → Supabase raw evidence
  → Supabase canonical field/record
  → Iris input
  → intelligence node(s)
  → derived result
  → validation
  → Iris output
  → rendered value
```

The reverse path must also be possible:

```text
rendered value → API output → intelligence → inputs → canonical Supabase field → raw observation
```

No intelligence result may be presented as a provider observation when it is actually calculated or inferred.

## Governance contract

Iris governs selection, composition, ordering, evidence sufficiency, contradiction handling, validation, explanation, monitoring, learning, improvement discovery, and revalidation. There is no separate customer-facing or admin-only intelligence system.

Learning can propose improvements, but production intelligence cannot silently self-modify. Candidate changes require validation and governed promotion. Intelligence cannot mutate Supabase source truth merely because a derived conclusion changed.

## Connection

The only financial-provider interaction exposed to the user is the connection flow in the Iris dashboard. Plaid Link creates the authorized connection; backend ingestion persists provider observations into Supabase. Users then return to Iris for all data, intelligence, evidence, and explanations.

## Safety boundary

This remains read-only financial intelligence. No money movement is enabled by the intelligence engine. No fake/mock/seeded financial values are permitted. External knowledge is never silently treated as user financial evidence.

## Development

Backend: `backend/` — Express + TypeScript, provider ingestion, Supabase persistence, canonicalization, intelligence orchestration, lineage, validation, and Iris APIs.

Frontend: `frontend/` — React + Vite, Supabase authentication, Iris dashboard, Plaid Link connection control, financial data presentation, and intelligence presentation.

Database: `supabase/` — PostgreSQL schema and migrations.

Before declaring the system 100% live, execute the runtime proof across the real authorized ingestion path and then perform the full line-by-line system audit and final Iris-top-layer audit.
