import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";

export const irisSummaryRouter = Router();

irisSummaryRouter.get("/iris/summary", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const full = await computeFullIntelligence(req.userId!);
    const metrics = full.layer_metrics;
    res.json({
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
