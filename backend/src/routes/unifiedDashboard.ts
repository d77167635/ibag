import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";
import { buildIrisPublicationContext } from "../intelligence/irisPublicationContext.js";
import { UNIFIED_DASHBOARD_SCHEMA_VERSION, type UnifiedDashboardResponse } from "../contracts/unifiedDashboard.js";

export const unifiedDashboardRouter = Router();

/**
 * Single read boundary for the user-facing Iris workspace.
 * It combines observed financial state with the governed intelligence result
 * without creating provider observations, financial values, or side effects.
 */
unifiedDashboardRouter.get("/dashboard/unified", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  try {
    const [{ data: accounts, error: accountsError }, { data: transactions, error: transactionsError }] = await Promise.all([
      supabaseAdmin.from("plaid_accounts").select("id, item_id, name, official_name, mask, type, subtype, current_balance, available_balance, credit_limit, balance_updated_at, roundup_enabled, created_at").eq("user_id", userId),
      supabaseAdmin.from("transactions").select("id, account_id, amount, iso_currency_code, merchant_name, merchant_id, plaid_category_primary, plaid_category_detailed, posted_date, transaction_class, classification_evidence, classification_version, pending, is_active, merchants(canonical_name), subdomains(label, domains(key, label))").eq("user_id", userId).eq("is_active", true).eq("pending", false).order("posted_date", { ascending: false }).limit(200),
    ]);
    if (accountsError) throw accountsError;
    if (transactionsError) throw transactionsError;

    const run = await executeIrisRun({
      userId,
      requestId: typeof req.header("x-iris-request-id") === "string" ? req.header("x-iris-request-id")! : undefined,
      surface: "iris_dashboard",
      mode: "full_intelligence",
    });
    const full = run.result;
    if (!full) {
      return res.status(run.status === "VALIDATION_FAILED" ? 422 : 503).json({
        schema_version: UNIFIED_DASHBOARD_SCHEMA_VERSION,
        generated_at: new Date().toISOString(),
        user_id: userId,
        error: "Iris intelligence is not currently available from a completed governed run",
        run_id: run.id ?? null,
        run_status: run.status,
        certification_gate: run.certification_gate ?? null,
      });
    }

    const publication = await buildIrisPublicationContext(userId, full.intelligence_atlas?.definitions ?? []);
    const response: UnifiedDashboardResponse = {
      schema_version: UNIFIED_DASHBOARD_SCHEMA_VERSION,
      generated_at: full.generated_at ?? new Date().toISOString(),
      user_id: userId,
      observed_financial_state: {
        accounts: accounts ?? [],
        recent_transactions: transactions ?? [],
      },
      intelligence: {
        run_id: run.id ?? null,
        execution_id: run.execution_id ?? null,
        run_status: run.status,
        certified: run.certified === true,
        certification_gate: run.certification_gate ?? null,
        result: full,
      },
      publication: {
        selected_capability_ids: publication.selected_capability_ids,
        feature_runtime: publication.feature_runtime,
        intelligence_output_runtime: publication.intelligence_output_runtime,
        publication_boundary: publication.publication_boundary,
      },
      evidence_boundary: full.evidence_boundary ?? null,
      provider_lineage: full.provider_lineage ?? null,
      integrity: full.integrity ?? null,
    };
    return res.json(response);
  } catch (error) {
    console.error("dashboard/unified error:", error);
    return res.status(500).json({ schema_version: UNIFIED_DASHBOARD_SCHEMA_VERSION, user_id: userId, error: "Unable to build unified Iris dashboard" });
  }
});
