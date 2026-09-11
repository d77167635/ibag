import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { buildIrisPublicationContext } from "../intelligence/irisPublicationContext.js";
import { getFeatureFlags } from "../services/features.js";

export const irisIntelligenceRouter = Router();

/**
 * Canonical Iris intelligence read path.
 * Reads the latest persisted governed run; it never silently starts a new
 * intelligence execution. Execution belongs to POST /iris/runs so a user
 * action or explicit caller controls when a new evidence boundary is created.
 */
irisIntelligenceRouter.get("/iris/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data: run, error: runError } = await supabaseAdmin
      .from("iris_runs")
      .select("id,status,execution_id,certification_hash,created_at,completed_at,failure_code,failure_message")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (runError) throw runError;
    if (!run) return res.status(503).json({ error: "Iris has not executed a governed intelligence run yet", certified: false, run_id: null, status: "NOT_RUN" });

    const { data: execution } = await supabaseAdmin
      .from("iris_execution_records")
      .select("id")
      .eq("run_id", run.id)
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!execution) return res.status(503).json({ error: "The latest Iris run has no execution record", certified: false, run_id: run.id, status: run.status });

    const { data: output, error: outputError } = await supabaseAdmin
      .from("iris_execution_outputs")
      .select("value,hash,evidence_state")
      .eq("execution_id", execution.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (outputError) throw outputError;
    if (!output?.value) return res.status(503).json({ error: "The latest Iris run has no persisted intelligence output", certified: false, run_id: run.id, execution_id: execution.id, status: run.status, failure_code: run.failure_code ?? null, failure_message: run.failure_message ?? null });

    const full = output.value as any;
    const metrics = full.layer_metrics ?? {};
    const atlasDefinitions = full.intelligence_atlas?.definitions ?? [];
    const publication = await buildIrisPublicationContext(req.userId!, atlasDefinitions, { runId: run.id, executionId: execution.id, executionStatus: run.status });
    const featureFlags = await getFeatureFlags(req.userId!);
    return res.json({ ...full, run_id: run.id, execution_id: execution.id, run_status: run.status, certified: run.status === "CERTIFIED", certification_hash: run.certification_hash ?? null, failure_code: run.failure_code ?? null, failure_message: run.failure_message ?? null, output_hash: output.hash, output_evidence_state: output.evidence_state, net_worth: metrics.net_worth, debt_health: { ...metrics.debt_health, interest_cost_attribution: full.layer_debt_cost }, cash_flow_safety: metrics.cash_flow_safety, roundup_projection: metrics.roundup_projection, cash_flow: metrics.cash_flow, spending_by_domain: metrics.spending_by_domain, balance_history: metrics.balance_history, forward_projection: metrics.forward_projection, anomalies: metrics.anomalies, spending_hierarchy: metrics.spending_hierarchy, category_drift: full.layer_behavioral?.categoryDrift, reasoning: full.layer_reasoning, maximum_intelligence: full.layer_max_intelligence, feature_flags: featureFlags, selected_report_ids: publication.selected_report_ids, report_catalog: publication.report_catalog, feature_runtime: publication.feature_runtime, intelligence_output_runtime: publication.intelligence_output_runtime, report_certification_runtime: publication.report_certification_runtime, publication_boundary: publication.publication_boundary });
  } catch (err) {
    console.error("iris/intelligence error:", err);
    return res.status(500).json({ error: "Iris intelligence could not be read" });
  }
});
