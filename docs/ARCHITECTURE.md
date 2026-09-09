# Iris Architecture

## Authoritative system boundary

```text
                    IRIS
                     │
             determines information needs
                     ↓
             PLAID PRODUCT SELECTION
                     │
              provider observations
                     ↓
                  PLAID DATA
                     │
              canonicalization
                     ↓
          FINANCIAL LIFE STATE
                     │
            relational ontology
                     ↓
            IRIS INTELLIGENCE
                     │
              IRIS FEATURES
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
   IRIS DASHBOARD        IRIS WORKSPACES
```

## Surface separation

### Plaid Dashboard
Provider observability only. It maps the complete supported Plaid product catalog and displays what is available, connected, observed, unavailable, limited, or otherwise evidenced for the user's connections. Product-specific data stays in its source/product context. No Iris interpretation is presented as provider data.

### Iris Dashboard
Synthesized financial-life intelligence. It presents calculations, relationships, patterns, changes, forecasts, risks, opportunities, decisions, and education only when their evidence requirements are satisfied.

### Iris Features
First-class capabilities independent of Plaid products. A feature can consume multiple provider domains and can span multiple pages/workspaces. Features are independently activatable/deactivatable by the user.

## Product-selection pipeline

```text
Plaid Product Universe
        ↓
Product Catalog / Capability Matrix
        ↓
Availability + Institution Support
        ×
User Consent
        ×
Plan Entitlement
        ×
Product Cost
        ×
Incremental Intelligence Value
        ↓
Iris Eligible Product Set
        ↓
Provider Observations
        ↓
Financial Life State
        ↓
Feature Evidence Coverage
        ↓
Iris Intelligence
```

Selection is adaptive. Iris may determine that additional provider evidence would materially improve a capability. If the required product is supported, consented, entitled, and economically allowed, it may be selected. If not, Iris must explain the evidence limitation rather than simulate the missing information.

## Feature architecture

```text
Feature
├── Identity
├── Availability
├── User control
├── Evidence prerequisites
├── Observations
├── Calculations
├── Relationships
├── Patterns
├── Forecasts
├── Risks
├── Opportunities
├── Decisions
├── Education
├── Provenance
├── Freshness
├── Lineage
└── UI/workspaces
```

## Recursive intelligence

The workspace model is not a fixed list of pages. The preferred traversal is:

`Domain → Subdomain → Entity → Detail → Evidence → Relationships → Intelligence`

Examples:
- Account → observations → transactions → relationships → changes → evidence → Iris interpretation
- Merchant → transactions → spending pattern → baseline → anomaly → explanation → evidence
- Cash flow → inflows/outflows → obligations → liquidity → forecast → supporting observations

## Economic boundary

Plaid product cost and iBag/user charges are configuration, not intelligence logic. The initial commercial rule is that a product is included unless Plaid charges iBag for it; where Plaid charges iBag, the corresponding user-plan/cost policy determines whether and how it is made available.

## Verification principle

A feature is not complete because a UI surface exists. It requires its evidence contract, backend/read model, frontend contract, lineage, user control, explainability, and deployment verification to agree.
