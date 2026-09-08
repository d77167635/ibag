import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";

export const irisSummaryRouter = Router();

irisSummaryRouter.get("/iris/summary", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const fullRun = await executeIrisRun({
      userId: req.userId!,
      requestId: typeof req.header("x-iris-request-id") === "string" ? req.header("x-iris-request-id")! : undefined,
      surface: "iris_summary",
      mode: "full_intelligence",
    });
    const full = fullRun.result;
    if (!full) return res.status(503).json({ error: "Iris intelligence is temporarily unavailable", certified: false, run_id: fullRun.id ?? null });
    const metrics = full.layer_metrics;
    res.json({
      run_id: fullRun.id ?? null,
      execution_id: fullRun.execution_id ?? null,
      certified: fullRun.certified === true,
      certification_gate: fullRun.certification_gate ?? null,
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
      category_drift: full.layer_behavioral.categoryDrift,
      reasoning: full.layer_reasoning,
      provider_lineage: full.provider_lineage,
      uncertainty: full.uncertainty,
      intelligence_atlas: full.intelligence_atlas,
      higher_order_synthesis: full.higher_order_synthesis,
      meta_intelligence: full.meta_intelligence,
    });
  } catch (err) {
    console.error("iris/summary error:", err);
    res.status(500).json({ error: "Iris intelligence is temporarily unavailable" });
  }
});
