import { supabaseAdmin } from "../config/supabase.js";

/**
 * Persists only real observed/calculated intelligence state so later runs can
 * validate model outputs against subsequently observed provider evidence.
 * This is a validation substrate, not synthetic training data.
 */
export async function recordIntelligenceSnapshot(userId: string, input: {
  evidenceBoundary: string | null;
  liquidAssets: number | null;
  cashFlowNet: number | null;
  safeToSpend: number | null;
  revolvingDebt: number | null;
  creditUtilization: number | null;
  forwardProjectedLiquidPosition: number | null;
  roundupProjected: number | null;
  sourceFidelityStatus: string | null;
  higherOrderReady: boolean;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("iris_intelligence_snapshots").insert({
    user_id: userId,
    evidence_boundary: input.evidenceBoundary,
    model_version: "IRIS_VALIDATION_SNAPSHOT_V1",
    liquid_assets: input.liquidAssets,
    cash_flow_net: input.cashFlowNet,
    safe_to_spend: input.safeToSpend,
    revolving_debt: input.revolvingDebt,
    credit_utilization: input.creditUtilization,
    forward_projected_liquid_position: input.forwardProjectedLiquidPosition,
    roundup_projected: input.roundupProjected,
    source_fidelity_status: input.sourceFidelityStatus,
    higher_order_ready: input.higherOrderReady,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
