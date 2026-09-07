import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisFullIntelligenceRun } from "../intelligence/irisRunService.js";

export const irisExecutionRouter = Router();

irisExecutionRouter.post("/dashboard/intelligence/run", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = (req.body ?? {}) as {
      request_id?: string;
      request_surface?: string;
      request_mode?: string;
      requested_capabilities?: string[];
      as_of?: string;
    };
    const execution = await executeIrisFullIntelligenceRun({
      userId: req.userId!,
      requestId: body.request_id,
      requestSurface: body.request_surface,
      requestMode: body.request_mode,
      requestedCapabilities: body.requested_capabilities,
      asOf: body.as_of,
    });
    const full: any = execution.intelligence;
    const metrics = full.layer_metrics;
    res.json({
      ...execution.result,
      run: execution.run,
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
      category_drift: full.layer_behavioral.categoryDrift,
      reasoning: full.layer_reasoning,
      temporal: full.layer_temporal,
      maximum_intelligence: full.layer_max_intelligence,
      feature_flags: full.feature_flags,
      provider_lineage: full.provider_lineage,
      integrity: full.integrity,
      source_fidelity: full.source_fidelity,
      intelligence_gate: full.intelligence_gate,
      evidence_boundary: full.evidence_boundary,
      evidence_graph: full.evidence_graph,
      intelligence_graph: full.intelligence_graph,
      investigations: full.investigations,
      uncertainty: full.uncertainty,
      financial_state: full.financial_state,
      causal_analysis: full.causal_analysis,
      decision_graph: full.decision_graph,
      decision_intelligence: full.decision_intelligence,
      consequence_model: full.consequence_model,
      optimization_intelligence: full.optimization_intelligence,
      goal_intelligence: full.goal_intelligence,
      intelligence_atlas: full.intelligence_atlas,
      intelligence_composition: full.intelligence_composition,
      layer_composition: full.layer_composition,
      higher_order_synthesis: full.higher_order_synthesis,
      adversarial_reasoning: full.adversarial_reasoning,
      counterfactual_intelligence: full.counterfactual_intelligence,
      meta_intelligence: full.meta_intelligence,
    });
  } catch (err) {
    console.error("dashboard/intelligence/run error:", err);
    res.status(500).json({ error: "Failed to execute governed Iris intelligence run" });
  }
});
