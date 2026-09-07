import { createHash } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { IrisEvidenceReference } from "./irisExecutionTypes.js";

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map(k => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(",`)}}`;
}

export function hashEvidenceManifest(manifest: IrisEvidenceReference[]): string {
  return createHash("sha256").update(stable(manifest)).digest("hex");
}

export async function buildEvidenceManifest(userId: string, evidenceBoundary: string | null): Promise<{ references: IrisEvidenceReference[]; hash: string }> {
  const boundary = evidenceBoundary ? new Date(evidenceBoundary).getTime() : Number.POSITIVE_INFINITY;
  const { data, error } = await supabaseAdmin
    .from("plaid_product_observations")
    .select("id, provider, product, observed_at, effective_at, acquired_at, evidence_state, observation_hash, is_current")
    .eq("user_id", userId)
    .eq("is_current", true)
    .order("acquired_at", { ascending: true });
  if (error) throw error;

  const references: IrisEvidenceReference[] = (data ?? [])
    .filter((row: any) => row.acquired_at == null || new Date(row.acquired_at).getTime() <= boundary)
    .map((row: any) => ({
      evidence_type: "product_observation",
      provider: row.provider ?? null,
      product: row.product ?? null,
      product_observation_id: row.id,
      effective_at: row.effective_at ?? row.observed_at ?? null,
      acquired_at: row.acquired_at ?? null,
      evidence_hash: row.observation_hash ?? createHash("sha256").update(stable({ id: row.id, product: row.product, evidence_state: row.evidence_state, acquired_at: row.acquired_at })).digest("hex"),
    }));

  references.sort((a, b) => `${a.product ?? ""}:${a.product_observation_id ?? ""}`.localeCompare(`${b.product ?? ""}:${b.product_observation_id ?? ""}`));
  return { references, hash: hashEvidenceManifest(references) };
}

export async function persistRunEvidence(runId: string, userId: string, references: IrisEvidenceReference[]): Promise<void> {
  if (!references.length) return;
  const rows = references.map(reference => ({
    run_id: runId,
    user_id: userId,
    evidence_type: reference.evidence_type,
    provider: reference.provider ?? null,
    product: reference.product ?? null,
    receipt_id: reference.receipt_id ?? null,
    product_observation_id: reference.product_observation_id ?? null,
    raw_observation_id: reference.raw_observation_id ?? null,
    source_field_id: reference.source_field_id ?? null,
    effective_at: reference.effective_at ?? null,
    acquired_at: reference.acquired_at ?? null,
    evidence_hash: reference.evidence_hash,
  }));
  const { error } = await supabaseAdmin.from("iris_run_evidence").insert(rows);
  if (error) throw error;
}
