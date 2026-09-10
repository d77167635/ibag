# Iris Session Handoff

This file is the compact bridge between sessions. It must reflect verified repository/runtime state, not older chat assumptions.

## Current verified state

- Repository: `d77167635/iris`
- Branch: `main`
- Product: **Iris**
- Iris intelligence hierarchy: recursive and unbounded semantically; it is internal reasoning/composition machinery.
- User products: evidence-grounded **reports and analytics** produced by the hierarchy.
- Connected Supabase project: `uhcrdehjwaghqvydaqnn`
- Connected Supabase currently has zero `iris_run_evidence` rows.
- Current scope remains read-only intelligence; no money movement.

## Current report-product implementation

- `backend/src/intelligence/irisReportCatalog.ts` defines the user-facing report product catalog from the authoritative analytical atlas.
- `backend/src/routes/irisCatalog.ts` exposes the report catalog and user activation/deactivation/reset controls.
- `backend/src/intelligence/irisIntelligenceOutputRuntime.ts` treats report activation as a publication control and keeps internal intelligence capability execution separate.
- `backend/src/intelligence/irisPublicationContext.ts` loads per-user report activation from Supabase and applies it at the report publication boundary.
- `supabase/migrations/080_iris_report_product_preferences.sql` persists per-user report activation state with RLS.
- `frontend/src/components/IrisCatalog.tsx` now presents reports/analytics as the user products rather than exposing the internal intelligence capability hierarchy as the product catalog.
- Report contextual naming uses only runtime information that actually exists.

## Critical product rule

**Do not call the intelligence hierarchy itself the product catalog.**

The hierarchy contains domains, evidence, canonical facts, operators, relationships, dependencies, recursive compositions, and higher-order intelligence. Those are internal machinery.

The product catalog contains the **reports and analytics returned by that machinery**. As valid recursive intelligence expands, the number of report products can become extremely large. New products must come from real governed analytical definitions or evidence-supported recursive compositions.

Users control those report products individually by activating or deactivating them. This does not activate/deactivate Plaid products and does not constrain Iris's semantic intelligence depth.

## Anti-fabrication rule

No fake AI financial data is permitted.

Never create or present as user financial truth:
- fake AI-generated values;
- mock/seeded/synthetic/copy/pasted financial observations;
- hardcoded balances, transactions, income, debt, spending, or provider records;
- invented report results;
- invented confidence/probability values;
- catalog metadata as evidence;
- provider availability/consent/authorization/entitlement as observations;
- missing evidence as zero.

Technical mocks are permitted only where they isolate infrastructure behavior in tests. They must never be promoted to production evidence or shown as a user's financial state.

## Certification gap

The implementation is not end-to-end certified because the connected Supabase project currently contains no run evidence. A report/capability requires real provider evidence, exact evidence-bound execution, complete lineage, artifact validation, atomic certification, active publication enforcement, user interaction verification, deployment verification, and full journey verification before it can be certified.

## Next dependency-complete block

1. Verify the report-product implementation against the current deployed commit.
2. Run backend/frontend tests and build verification.
3. Inspect for any remaining user-facing capability-as-product language or hardcoded/fabricated financial presentation paths.
4. Reconcile the full report catalog with the analytical atlas and recursive composition engine.
5. Ensure active report selection is the sole user publication control for report products.
6. Continue toward real provider-evidence execution and certification without importing synthetic financial data.

Always cross-check GitHub, Render, and Supabase directly before claiming current state.
