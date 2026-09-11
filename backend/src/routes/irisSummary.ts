import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const irisSummaryRouter = Router();

irisSummaryRouter.get("/iris/summary", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data: run, error: runError } = await supabaseAdmin
      .from("iris_runs")
      .select("id,status,created_at,completed_at,failure_code,failure_message")
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
    res.json({
      run_id: run.id ?? null,
      execution_id: execution.id ?? null,
      certified: run.status === "CERTIFIED",
      run_status: run.status,
      failure_code: run.failure_code ?? null,
      failure_message: run.failure_message ?? null,
      output_hash: output.hash,
      output_evidence_state: output.evidence_state,
      generated_at: full.generated_at,
      narrative: full.narrative,
      intelligence_gate: full.intelligence_gate,
      source_fidelity: full.source_fidelity,
      evidence_boundary: full.evidence_boundary,
      net_worth: metrics.net_worth,
      debt_health: metrics.debt_health,
      cash_flow: metrics.cash_flow,
      cash_flow_safety: metrics.cash_flow_safety,
      roundup_projection: metrics.roundup_projection,
      spending_by_domain: metrics.spending_by_domain,
      anomalies: metrics.anomalies,
      category_drift: full.layer_behavioral?.categoryDrift,
      reasoning: full.layer_reasoning,
      provider_lineage: full.provider_lineage,
      uncertainty: full.uncertainty,
      intelligence_atlas: full.intelligence_atlas,
      higher_order_synthesis: full.higher_order_synthesis,
      meta_intelligence: full.meta_intelligence,
    });
  } catch (err) {
    console.error("iris/summary error:", err);
    res.status(500).json({ error: "Iris intelligence could not be read" });
  }
});
