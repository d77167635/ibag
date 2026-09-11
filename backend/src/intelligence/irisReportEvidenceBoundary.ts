export type ReportEvidenceObservation = {
  evidence_id: string;
  evidence_key: string;
  state: "observed" | "derived" | "unknown" | "unavailable";
};

export type ReportEvidenceBoundary = {
  required_keys: string[];
  observed_evidence_ids: string[];
  missing_keys: string[];
  unknown_keys: string[];
  state: "satisfied" | "partial" | "insufficient";
};

/** Evidence keys are requirements, never observations. Only supplied evidence observations count. */
export function evaluateReportEvidenceBoundary(requiredKeys: string[], observations: ReportEvidenceObservation[]): ReportEvidenceBoundary {
  const required = [...new Set(requiredKeys)].sort();
  const byKey = new Map<string, ReportEvidenceObservation[]>();
  for (const observation of observations) byKey.set(observation.evidence_key, [...(byKey.get(observation.evidence_key) ?? []), observation]);
  const observedEvidenceIds: string[] = [];
  const missingKeys: string[] = [];
  const unknownKeys: string[] = [];
  for (const key of required) {
    const candidates = byKey.get(key) ?? [];
    const observed = candidates.filter((item) => item.state === "observed" || item.state === "derived");
    if (observed.length) observedEvidenceIds.push(...observed.map((item) => item.evidence_id));
    else if (candidates.some((item) => item.state === "unknown")) unknownKeys.push(key);
    else missingKeys.push(key);
  }
  const state = missingKeys.length === 0 && unknownKeys.length === 0 ? "satisfied" : observedEvidenceIds.length ? "partial" : "insufficient";
  return { required_keys: required, observed_evidence_ids: [...new Set(observedEvidenceIds)].sort(), missing_keys: missingKeys, unknown_keys: unknownKeys, state };
}
