import { createHash } from "node:crypto";

export type IrisEvidenceManifestRow = {
  raw_observation_id: string;
  product: string;
  effective_at: string;
  acquired_at: string;
  evidence_hash: string;
};

export function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function canonicalizeEvidenceRows<T extends IrisEvidenceManifestRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rawObservation = a.raw_observation_id.localeCompare(b.raw_observation_id);
    if (rawObservation !== 0) return rawObservation;
    const product = a.product.localeCompare(b.product);
    if (product !== 0) return product;
    const effective = a.effective_at.localeCompare(b.effective_at);
    if (effective !== 0) return effective;
    const acquired = a.acquired_at.localeCompare(b.acquired_at);
    if (acquired !== 0) return acquired;
    return a.evidence_hash.localeCompare(b.evidence_hash);
  });
}

export function buildEvidenceManifest(initialManifest: Record<string, unknown>, rows: IrisEvidenceManifestRow[]) {
  return {
    ...initialManifest,
    evidence: canonicalizeEvidenceRows(rows).map(row => ({
      raw_observation_id: row.raw_observation_id,
      product: row.product,
      effective_at: row.effective_at,
      acquired_at: row.acquired_at,
      evidence_hash: row.evidence_hash,
    })),
  };
}

export function buildCertificationHash({
  runId,
  userId,
  executionId,
  inputHash,
  outputHash,
  financialContextHash,
  evidenceManifestHash,
  asOf,
  evidenceBoundary,
  policyVersion,
  evidenceSnapshot,
  reconciliationSnapshot,
}: {
  runId: string;
  userId: string;
  executionId: string;
  inputHash: string;
  outputHash: string;
  financialContextHash: string | null | undefined;
  evidenceManifestHash: string | null | undefined;
  asOf: string;
  evidenceBoundary: string | null | undefined;
  policyVersion: string;
  evidenceSnapshot: unknown;
  reconciliationSnapshot: unknown;
}): string {
  return hash({
    run_id: runId,
    user_id: userId,
    execution_id: executionId,
    input_hash: inputHash,
    output_hash: outputHash,
    financial_context_hash: financialContextHash ?? null,
    evidence_manifest_hash: evidenceManifestHash ?? null,
    as_of: asOf,
    evidence_boundary: evidenceBoundary ?? null,
    policy: policyVersion,
    evidence: evidenceSnapshot,
    reconciliation: reconciliationSnapshot,
  });
}