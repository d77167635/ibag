import { supabaseAdmin } from "../config/supabase.js";

export async function recordRuntimeAudit(input: {
  userId: string;
  runId: string;
  layerId: string;
  analysisId?: string | null;
  inputManifest: Record<string, unknown>;
  inputHash: string;
  outputHash: string;
  outputSnapshot: Record<string, unknown>;
  evidenceState: string;
  deliveryVerified?: boolean;
  postUsageVerified?: boolean;
  populatedVerified?: boolean;
  verificationErrors?: string[];
}): Promise<void> {
  const { error } = await supabaseAdmin.from("iris_runtime_intelligence_audits").insert({
    user_id: input.userId,
    run_id: input.runId,
    layer_id: input.layerId,
    analysis_id: input.analysisId ?? null,
    input_manifest: input.inputManifest,
    input_hash: input.inputHash,
    output_hash: input.outputHash,
    output_snapshot: input.outputSnapshot,
    evidence_state: input.evidenceState,
    delivery_verified: input.deliveryVerified ?? false,
    post_usage_verified: input.postUsageVerified ?? false,
    populated_verified: input.populatedVerified ?? true,
    verification_errors: input.verificationErrors ?? [],
  });
  if (error) throw error;
}
