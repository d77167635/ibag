export type AdversarialChallenge = {
  id: string;
  target: string;
  challenge: string;
  alternative_explanation: string;
  falsification_test: string;
  status: "challengeable" | "evidence_limited";
  limitation: string | null;
};

type FindingLike = {
  id?: string;
  title?: string;
  conclusion?: string;
  limitation?: string | null;
  confidence?: string;
};

type CausalLike = {
  hypotheses?: Array<{
    id?: string;
    statement?: string;
    alternative_explanations?: string[];
    falsification_tests?: string[];
    missing_evidence?: string[];
  }>;
};

/**
 * Adversarial reasoning over existing Iris conclusions.
 * This layer attacks conclusions; it never creates provider evidence or financial facts.
 */
export function buildAdversarialReasoning(input: {
  causalAnalysis?: CausalLike;
  findings?: FindingLike[];
  investigations?: Array<{ question?: string; rationale?: string; status?: string }>;
}) {
  const challenges: AdversarialChallenge[] = [];

  for (const hypothesis of (input.causalAnalysis?.hypotheses ?? []).slice(0, 12)) {
    const statement = hypothesis.statement ?? "Causal hypothesis";
    const alternatives = hypothesis.alternative_explanations ?? [];
    const tests = hypothesis.falsification_tests ?? [];
    const missing = hypothesis.missing_evidence ?? [];

    challenges.push({
      id: `causal-${hypothesis.id ?? challenges.length}`,
      target: statement,
      challenge: "Could the same observed pattern be explained without the proposed causal relationship?",
      alternative_explanation: alternatives[0] ?? "An unobserved confounder, timing effect, classification limitation, or coincident change may explain the pattern.",
      falsification_test: tests[0] ?? "Seek additional time-aligned evidence capable of distinguishing the hypothesis from its strongest alternative explanation.",
      status: missing.length ? "evidence_limited" : "challengeable",
      limitation: missing.length ? `The challenge remains evidence-limited because required evidence is missing: ${missing.slice(0, 4).join(", ")}.` : "A falsification test can challenge the hypothesis but cannot establish causation by itself.",
    });
  }

  for (const finding of (input.findings ?? []).slice(0, Math.max(0, 20 - challenges.length))) {
    if (finding.confidence !== "calculated") continue;
    const target = finding.title ?? finding.id ?? "Calculated finding";
    challenges.push({
      id: `finding-${finding.id ?? challenges.length}`,
      target,
      challenge: "Would this conclusion remain materially unchanged if its strongest assumption were wrong?",
      alternative_explanation: "The observed association may reflect concentration, timing, classification, or another correlated factor rather than the interpretation attached to it.",
      falsification_test: "Perturb the material assumption and compare the resulting conclusion with the baseline calculation.",
      status: "challengeable",
      limitation: finding.limitation ?? "Sensitivity to assumptions must be evaluated before treating the conclusion as decision-robust.",
    });
  }

  const investigationGaps = (input.investigations ?? []).filter(item => item.status !== "ready").slice(0, 8);
  return {
    engine_version: "IRIS_ADVERSARIAL_REASONING_V1",
    challenges: challenges.slice(0, 24),
    unresolved_investigation_count: investigationGaps.length,
    principles: [
      "Challenge conclusions rather than manufacture contrary facts.",
      "Alternative explanations are hypotheses, not observations.",
      "Falsification tests identify what evidence could weaken a conclusion.",
      "Evidence-limited conclusions must remain evidence-limited.",
      "No adversarial challenge authorizes financial execution in Phase 1.",
    ],
    generation: {
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
      provider_observations_created: false,
      execution_capability: false,
    },
  };
}
