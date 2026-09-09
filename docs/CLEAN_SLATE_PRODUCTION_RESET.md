# Iris Clean-Slate Production Reset Protocol

## Purpose

The current repository and connected development evidence are engineering material used to build, inspect, reconcile, and validate Iris. They are not the final user's financial state.

The production Iris financial state must begin from a clean database/provider state. Current development data may expose defects and validate logic, but it must never be promoted into the final user's financial history, balances, observations, or intelligence state.

## Non-negotiable boundary

- No development, mock, seeded, synthetic, copied, or manually invented financial data may become production financial evidence.
- Provider observations are created only from an authorized real provider connection.
- Existing development financial records are disposable validation material.
- Cleaning the database is a separate destructive phase and must not occur as an incidental side effect of engineering changes.
- No money movement is part of this reset protocol.

## Reset phases

### 1. Freeze

Stop ingestion, sync, webhook processing, scheduled financial jobs, and any process that can create new financial observations for the development dataset.

### 2. Snapshot engineering state

Record the exact production-bound Git commit, migration set, schema version, contract versions, intelligence registry versions, and certification results. Preserve logs and test evidence separately from financial records.

### 3. Verify dependency closure

Before deletion, identify all tables and storage objects that can contain or reference financial state, including provider connections, raw provider observations, canonical accounts, transactions, liabilities, investments, income, round-up records, sync state, evidence, lineage, intelligence snapshots, runs, outputs, and user financial preferences where appropriate.

Verify foreign keys, views, materialized views, functions, triggers, caches, and storage objects so no stale financial record can survive outside the intended reset boundary.

### 4. Destructive financial-state reset

Delete development financial/provider state only through an explicit, reviewed reset operation. The operation must be ordered according to foreign-key dependencies and must verify post-delete counts. It must not silently delete unrelated application configuration, code, audit documentation, or deployment configuration.

The reset must cover both source evidence and all derived/canonical state so that no historical development financial fact remains available to Iris after reset.

### 5. Post-reset zero-state certification

Prove that the financial-state surfaces are empty:

- no provider Items
- no provider observations
- no raw financial observations
- no canonical accounts
- no canonical transactions
- no liabilities/investments/income financial records
- no round-up financial history
- no stale sync state capable of presenting development evidence as current
- no orphaned evidence/lineage referencing deleted financial objects
- no intelligence snapshot containing development financial values that can be presented as current user state

The exact table inventory must be generated from the final schema rather than assumed from this document.

### 6. Reinitialize production evidence boundary

Create the clean production runtime with no financial observations. Product catalog metadata, intelligence definitions, UI structure, policies, and capability contracts may exist, but they are not financial evidence.

The first real user's state begins only after that user authorizes a provider connection and Iris receives real provider observations.

### 7. First-user certification

For the first real user, prove the complete lineage:

`authorized provider connection → provider observation → canonical state → governed Iris run → evidence boundary → intelligence → publication`

No stage may inherit financial state from the development environment.

## Required safeguards

The reset operation must be:

- explicitly authorized before execution
- deterministic and auditable
- idempotent or safely repeatable
- protected against accidental production execution against the wrong environment
- followed by zero-state verification
- followed by fresh provider authorization/evidence before financial intelligence can become ready

## What this protocol does not authorize

This document does **not** authorize an immediate destructive wipe. Engineering work continues against the current development evidence until the architecture and certification work reaches the deliberate clean-slate transition point.

When the reset is eventually executed, it is a distinct production-readiness action, not a normal build step.
