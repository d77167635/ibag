export type MetaIntelligence = {
  architecture_version: "IRIS_META_INTELLIGENCE_V2";
  quality: { evidence_coverage: number; analytical_coverage: number; higher_order_readiness: boolean; bottleneck_count: number; evidence_strength: number; label: "strong" | "moderate" | "limited" | "insufficient" };
  bottlenecks: Array<{ input: string; analyses_blocked: number; analysis_ids: string[]; leverage: "very_high" | "high" | "medium" | "low"; information_value: number; statement: string }>;
  highest_leverage_next_steps: string[];
  integrity_signals: Array<{ key: string; status: "pass" | "limited" | "fail"; statement: string }>;
  composition_readiness: { possible_combinations: number; evaluable_combinations: number; evidence_ready_combinations: number };
  uncertainty_policy: { state: "evidence_bounded"; propagation: "downstream certainty cannot exceed upstream evidence"; probability_claims_allowed: false };
  lifecycle: ["Evidence", "Analysis", "Reasoning", "Simulation", "Decision", "Validation", "Learning", "Adaptation"];
  generation: { source: "Iris evidence, atlas readiness, lineage, uncertainty, investigations, composition metadata"; financial_values_created: false; fake_mock_or_seeded_data: false; execution_capability: false };
};
type AtlasDefinition = { id: string; family?: string; name?: string; inputs?: string[]; evidence_ready?: boolean; missing_inputs?: string[] };
type Input = {
  atlas?: { definitions?: AtlasDefinition[] };
  sourceFidelity?: { status?: string; ready_for_higher_order_intelligence?: boolean };
  integrity?: { status?: string; limitations?: string[] };
  uncertainty?: { evidence_strength?: number; state?: string; known_unknowns?: string[]; blocked_conclusions?: string[] };
  investigations?: { investigations?: Array<{ status?: string }> };
  composition?: { counts?: { possible_combinations?: number; evaluable_combinations?: number; evidence_ready_combinations?: number } };
};
function label(score: number): MetaIntelligence["quality"]["label"] { if (score >= 0.85) return "strong"; if (score >= 0.65) return "moderate"; if (score >= 0.35) return "limited"; return "insufficient"; }

/**
 * Meta-intelligence does not invent probabilities or financial facts. It estimates
 * information value from how many currently blocked analytical definitions share
 * the same missing evidence input, while preserving the upstream evidence boundary.
 */
export function buildMetaIntelligence(input: Input): MetaIntelligence {
  const definitions = input.atlas?.definitions ?? [];
  const ready = definitions.filter(d => d.evidence_ready === true).length;
  const evidenceCoverage = definitions.length ? ready / definitions.length : 0;
  const missingMap = new Map<string, string[]>();
  for (const definition of definitions) {
    if (definition.evidence_ready === true) continue;
    for (const missing of definition.missing_inputs ?? []) {
      const current = missingMap.get(missing) ?? [];
      current.push(definition.id);
      missingMap.set(missing, current);
    }
  }
  const maxBlocked = Math.max(1, ...[...missingMap.values()].map(ids => new Set(ids).size));
  const bottlenecks = [...missingMap.entries()]
    .map(([inputKey, analysisIds]) => {
      const uniqueIds = [...new Set(analysisIds)];
      const blocked = uniqueIds.length;
      const normalized = blocked / maxBlocked;
      const leverage: MetaIntelligence["bottlenecks"][number]["leverage"] = blocked >= 8 ? "very_high" : blocked >= 5 ? "high" : blocked >= 3 ? "medium" : "low";
      // Relative information value is a prioritization signal, not a probability.
      const informationValue = Number(normalized.toFixed(3));
      return { input: inputKey, analysis_ids: uniqueIds, analyses_blocked: blocked, leverage, information_value: informationValue, statement: `${inputKey} is a high-leverage missing evidence input for ${blocked} currently limited analysis definition${blocked === 1 ? "" : "s"}. Its value is measured by analytical unlock potential, not by an assumed financial probability.` };
    })
    .sort((a, b) => b.information_value - a.information_value || a.input.localeCompare(b.input))
    .slice(0, 12);
  const higherOrderReady = input.sourceFidelity?.ready_for_higher_order_intelligence === true;
  const integrityPass = input.integrity?.status !== "fail";
  const investigationLimited = (input.investigations?.investigations ?? []).some(x => x.status === "evidence_limited");
  const composition = input.composition?.counts ?? {};
  const possible = Number(composition.possible_combinations ?? 0);
  const evaluable = Number(composition.evaluable_combinations ?? 0);
  const evidenceReadyCombinations = Number(composition.evidence_ready_combinations ?? 0);
  const uncertaintyStrength = typeof input.uncertainty?.evidence_strength === "number" ? Math.max(0, Math.min(1, input.uncertainty.evidence_strength)) : evidenceCoverage;
  const analyticalCoverage = definitions.length ? Math.min(1, ready / definitions.length) : 0;
  const score = Math.max(0, Math.min(1,
    evidenceCoverage * 0.45 + analyticalCoverage * 0.20 + uncertaintyStrength * 0.15 + (higherOrderReady ? 0.10 : 0) + (integrityPass ? 0.10 : 0),
  ));
  const nextSteps = bottlenecks.slice(0, 5).map(b => `Acquire or certify ${b.input} through the existing provider/canonical evidence pipeline; its current information value is ${b.information_value} and it can unlock up to ${b.analyses_blocked} analysis${b.analyses_blocked === 1 ? "" : "es"}.`);
  if (!nextSteps.length) nextSteps.push("Increase independent evidence coverage across additional certified windows and provider domains before expanding conclusions.");
  const knownUnknowns = input.uncertainty?.known_unknowns?.length ?? 0;
  const blockedConclusions = input.uncertainty?.blocked_conclusions?.length ?? 0;
  return {
    architecture_version: "IRIS_META_INTELLIGENCE_V2",
    quality: { evidence_coverage: Math.round(evidenceCoverage * 1000) / 1000, analytical_coverage: Math.round(analyticalCoverage * 1000) / 1000, higher_order_readiness: higherOrderReady, bottleneck_count: bottlenecks.length, evidence_strength: Math.round(uncertaintyStrength * 1000) / 1000, label: label(score) },
    bottlenecks,
    highest_leverage_next_steps: nextSteps,
    integrity_signals: [
      { key: "canonical_integrity", status: integrityPass ? "pass" : "fail", statement: integrityPass ? "Canonical intelligence input passed its integrity gate." : "Canonical intelligence input reported an integrity failure; downstream conclusions must remain constrained." },
      { key: "higher_order_gate", status: higherOrderReady ? "pass" : "limited", statement: higherOrderReady ? "Source fidelity is sufficient for higher-order composition." : "Higher-order composition remains constrained by source completeness, lineage, or certification." },
      { key: "investigation_coverage", status: investigationLimited ? "limited" : "pass", statement: investigationLimited ? "At least one investigation remains evidence-limited." : "No evidence-limited investigation was reported in the current result set." },
      { key: "uncertainty_propagation", status: blockedConclusions > 0 || knownUnknowns > 0 ? "limited" : "pass", statement: blockedConclusions > 0 ? `${blockedConclusions} conclusion boundary${blockedConclusions === 1 ? "" : "s"} is explicitly blocked by insufficient evidence.` : "No blocked conclusion was reported by the current uncertainty graph." },
    ],
    composition_readiness: { possible_combinations: possible, evaluable_combinations: evaluable, evidence_ready_combinations: evidenceReadyCombinations },
    uncertainty_policy: { state: "evidence_bounded", propagation: "downstream certainty cannot exceed upstream evidence", probability_claims_allowed: false },
    lifecycle: ["Evidence", "Analysis", "Reasoning", "Simulation", "Decision", "Validation", "Learning", "Adaptation"],
    generation: { source: "Iris evidence, atlas readiness, lineage, uncertainty, investigations, composition metadata", financial_values_created: false, fake_mock_or_seeded_data: false, execution_capability: false },
  };
}
