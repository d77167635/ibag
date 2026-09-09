import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { IRIS_FEATURE_REGISTRY } from "../contracts/irisFeatureRegistry.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";
import { buildIrisFeatureRuntime } from "../intelligence/irisFeatureRuntime.js";
import { buildIrisIntelligenceOutputRuntime } from "../intelligence/irisIntelligenceOutputRuntime.js";

export const irisIntelligenceRouter = Router();

const IRIS_STANDARD_CAPABILITY_IDS = [
  "roundups",
  "financial-state",
  "cash-flow",
  "spending",
  "liquidity",
  "debt",
  "forecast",
  "recurrence",
  "causality",
  "decision-lab",
];

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
    const readyAtlasIds = new Set(
      atlasDefinitions.filter((definition: any) => definition.evidence_ready === true).map((definition: any) => definition.id),
    );

    const { data: preference, error: preferenceError } = await supabaseAdmin
      .from("iris_user_intelligence_preferences")
      .select("selected_capability_ids")
      .eq("user_id", req.userId!)
      .maybeSingle();
    if (preferenceError) throw preferenceError;

    const hasStoredPreference = !!preference;
    const selectedIds = hasStoredPreference && Array.isArray(preference?.selected_capability_ids)
      ? preference.selected_capability_ids.filter((id: unknown): id is string => typeof id === "string")
      : [...IRIS_STANDARD_CAPABILITY_IDS];
    const activations = Object.fromEntries(
      IRIS_FEATURE_REGISTRY.map((feature) => [
        feature.featureId,
        selectedIds.includes(feature.capabilityId) ? "enabled" : "disabled",
      ]),
    );
    const evidenceCoverage = Object.fromEntries(
      IRIS_FEATURE_REGISTRY.map((feature) => {
        const required = feature.requiredEvidence;
        if (required.length === 0) return [feature.featureId, 0];
        const satisfied = required.filter((id) => readyAtlasIds.has(id)).length;
        return [feature.featureId, satisfied / required.length];
      }),
    );
    const featureRuntime = buildIrisFeatureRuntime({ activations, evidenceCoverage });
    const intelligenceOutputRuntime = buildIrisIntelligenceOutputRuntime(
      { definitions: atlasDefinitions },
      featureRuntime,
    );

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
      feature_runtime: featureRuntime,
      intelligence_output_runtime: intelligenceOutputRuntime,
    });
  } catch (err) {
    console.error("iris/intelligence error:", err);
    return res.status(500).json({ error: "Iris intelligence is temporarily unavailable" });
  }
});
