import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";
import { buildIrisPublicationContext } from "../intelligence/irisPublicationContext.js";

export const irisIntelligenceRouter = Router();

/**
 * Canonical Iris intelligence read path.
 *
 * The UI never dispatches the raw intelligence orchestrator directly. Every
 * request enters the governed IrisRun lifecycle so planning, execution,
 * evidence capture, validation, and certification remain one execution path.
 */
irisIntelligenceRouter.get("/iris/intelligence", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await executeIrisRun({
      userId: req.userId!,
      requestId: typeof req.header("x-iris-request-id") === "string" ? req.header("x-iris-request-id")! : undefined,
      surface: "iris",
      mode: "full_intelligence",
    });
    if (!result.result) {
      return res.status(result.status === "VALIDATION_FAILED" ? 422 : 503).json({
        error: "Iris intelligence is not currently available from a completed governed run",
        run_id: result.id,
        status: result.status,
        certification_gate: result.certification_gate ?? null,
      });
    }

    const full = result.result as any;
    const metrics = full.layer_metrics ?? {};
    const atlasDefinitions = full.intelligence_atlas?.definitions ?? [];
    const publication = await buildIrisPublicationContext(req.userId!, atlasDefinitions);

    return res.json({
      ...full,
      run_id: result.id,
      execution_id: result.execution_id,
      run_status: result.status,
      certified: result.certified,
      certification_gate: result.certification_gate ?? null,
      narrative: full.narrative,
      generated_at: full.generated_at,
      net_worth: metrics.net_worth,
      debt_health: { ...metrics.debt_health, interest_cost_attribution: full.layer_debt_cost },
      cash_flow_safety: metrics.cash_flow_safety,
      roundup_projection: metrics.roundup_projection,
      cash_flow: metrics.cash_flow,
      spending_by_domain: metrics.spending_by_domain,
      balance_history: metrics.balance_history,
      forward_projection: metrics.forward_projection,
      anomalies: metrics.anomalies,
      spending_hierarchy: metrics.spending_hierarchy,
      category_drift: full.layer_behavioral?.categoryDrift,
      reasoning: full.layer_reasoning,
      maximum_intelligence: full.layer_max_intelligence,
      selected_capability_ids: publication.selected_capability_ids,
      feature_runtime: publication.feature_runtime,
      intelligence_output_runtime: publication.intelligence_output_runtime,
      publication_boundary: publication.publication_boundary,
    });
  } catch (err) {
    console.error("iris/intelligence error:", err);
    return res.status(500).json({ error: "Iris intelligence is temporarily unavailable" });
  }
});
