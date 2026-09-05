export type MetaIntelligence = {
  architecture_version: "IRIS_META_INTELLIGENCE_V1";
  quality: {
    evidence_coverage: number;
    analytical_coverage: number;
    higher_order_readiness: boolean;
    bottleneck_count: number;
    label: "strong" | "moderate" | "limited" | "insufficient";
  };
  bottlenecks: Array<{
    input: string;
    analyses_blocked: number;
    analysis_ids: string[];
    leverage: "very_high" | "high" | "medium" | "low";
    statement: string;
  }>;
  highest_leverage_next_steps: string[];
  integrity_signals: Array<{
    key: string;
    status: "pass" | "limited" | "fail";
    statement: string;
  }>;
  composition_readiness: {
    possible_combinations: number;
    evaluable_combinations: number;
    evidence_ready_combinations: number;
  };
  lifecycle: ["Evidence", "Analysis", "Reasoning", "Simulation", "Decision", "Validation", "Learning", "Adaptation"];
  generation: {
    source: "Iris evidence, atlas readiness, lineage, uncertainty, investigations, and composition metadata";
    financial_values_created: false;
    fake_mock_or_seeded_data: false;
    execution_capability: false;
  };
};

type AtlasDefinition = {
  id: string;
  family?: string;
  name?: string;
  inputs?: string[];
  evidence_ready?: boolean;
  missing_inputs?: string[];
};

type Input = {
  atlas?: { definitions?: AtlasDefinition[] };
  sourceFidelity?: { status?: string; ready_for_higher_order_intelligence?: boolean };
  integrity?: { valid?: boolean; errors?: string[] };
  uncertainty?: unknown;
  investigations?: Array<{ status?: string }>;
  composition?: { counts?: { possible_combinations?: number; evaluable_combinations?: number; evidence_ready_combinations?: number } };
};

function label(score: number): MetaIntelligence["quality"]["label"] {
  if (score >= 0.85) return "strong";
  if (score >= 0.65) return "moderate";
  if (score >= 0.35) return "limited";
  return "insufficient";
}

/**
 * Meta-intelligence does not add financial facts. It measures the system's ability
 * to reason from the evidence already available and identifies the highest-leverage
 * evidence gaps that would unlock additional analyses.
 */
export function buildMetaIntelligence(input: Input): MetaIntelligence {
  const definitions = input.atlas?.definitions ?? [];
  const ready = definitions.filter(d => d.evidence_ready === true).length;
  const evidenceCoverage = definitions.length ? ready / definitions.length : 0;

  const missingMap = new Map<string, string[]>();
  for (const definition of definitions) {
    if (definition.evidence_ready === true) continue;
    for (const missing of definition.missing_inputs ?? []) {
      const list = missingMap.get(missing) ?? [];
      list.push(definition.id);
      missingMap.set(missing, list);
    }
  }

  const bottlenecks = [...missingMap.entries()]
    .map(([inputKey, analysisIds]) => ({ input: inputKey, analysisIds: [...new Set(analysisIds)], analyses_blocked: new Set(analysisIds).size }))
    .sort((a, b) => b.analyses_blocked - a.analyses_blocked || a.input.localeCompare(b.input))
    .slice(0, 12)
    .map(x => {
      const leverage: MetaIntelligence["bottlenecks"][number]["leverage"] = x.analyses_blocked >= 8 ? "very_high" : x.analyses_blocked >= 5 ? "high" : x.analyses_blocked >= 3 ? "medium" : "low";
      return {
        ...x,
        leverage,
        statement: `${x.input} is the highest-leverage missing evidence input in ${x.analyses_blocked} currently limited analysis definition${x.analyses_blocked === 1 ? "" : "s"}.`,
      };
    });

  const higherOrderReady = input.sourceFidelity?.ready_for_higher_order_intelligence === true;
  const integrityPass = input.integrity?.valid !== false;
  const investigationLimited = (input.investigations ?? []).some(x => x.status === "evidence_limited");
  const composition = input.composition?.counts ?? {};
  const possible = Number(composition.possible_combinations ?? 0);
  const evaluable = Number(composition.evaluable_combinations ?? 0);
  const evidenceReadyCombinations = Number(composition.evidence_ready_combinations ?? 0);
  const analyticalCoverage = definitions.length ? Math.min(1, (ready + (higherOrderReady ? 0.5 : 0)) / (definitions.length + 0.5)) : 0;
  const score = Math.max(0, Math.min(1, (evidenceCoverage * 0.55) + (higherOrderReady ? 0.2 : 0) + (integrityPass ? 0.15 : 0) + (evaluable > 0 ? 0.1 : 0)));

  const nextSteps = bottlenecks.slice(0, 5).map(b => `Acquire or certify ${b.input} evidence through the existing provider/canonical pipeline; this can unlock up to ${b.analyses_blocked} analysis${b.analyses_blocked === 1 ? "" : "es"}.`);
  if (!nextSteps.length) nextSteps.push("Increase independent evidence coverage across additional certified windows and provider domains before expanding conclusions.");

  return {
    architecture_version: "IRIS_META_INTELLIGENCE_V1",
    quality: {
      evidence_coverage: Math.round(evidenceCoverage * 1000) / 1000,
      analytical_coverage: Math.round(analyticalCoverage * 1000) / 1000,
      higher_order_readiness: higherOrderReady,
      bottleneck_count: bottlenecks.length,
      label: label(score),
    },
    bottlenecks,
    highest_leverage_next_steps: nextSteps,
    integrity_signals: [
      { key: "canonical_integrity", status: integrityPass ? "pass" : "fail", statement: integrityPass ? "Canonical intelligence input passed its integrity gate." : "Canonical intelligence input reported an integrity failure; downstream conclusions must remain constrained." },
      { key: "higher_order_gate", status: higherOrderReady ? "pass" : "limited", statement: higherOrderReady ? "Source fidelity is sufficient for higher-order composition." : "Higher-order composition remains constrained by source completeness, lineage, or certification." },
      { key: "investigation_coverage", status: investigationLimited ? "limited" : "pass", statement: investigationLimited ? "At least one investigation remains evidence-limited." : "No evidence-limited investigation was reported in the current result set." },
    ],
    composition_readiness: {
      possible_combinations: possible,
      evaluable_combinations: evaluable,
      evidence_ready_combinations: evidenceReadyCombinations,
    },
    lifecycle: ["Evidence", "Analysis", "Reasoning", "Simulation", "Decision", "Validation", "Learning", "Adaptation"],
    generation: {
      source: "Iris evidence, atlas readiness, lineage, uncertainty, investigations, and composition metadata",
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      execution_capability: false,
    },
  };
}
