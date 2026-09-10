import { createHash } from "node:crypto";
import type { CapabilityExecutionContext, CapabilityOperatorResult, GovernedCapabilityResult } from "./capabilityOperators.js";

type RecursiveNode = {
  capability_id: string;
  evidence_state: CapabilityOperatorResult["evidence_state"];
  output_hash: string;
  dependencies: string[];
  depth: number;
};

export type RecursiveSynthesis = {
  synthesis_version: "IRIS_RECURSIVE_SYNTHESIS_V1";
  composition_depth: number;
  dependency_count: number;
  evidence_profile: {
    calculated: number;
    inferred: number;
    predicted: number;
    scenario: number;
    insufficient_evidence: number;
    complete: boolean;
  };
  recursive_nodes: RecursiveNode[];
  higher_order_findings: Array<{
    id: string;
    kind: "interaction" | "chain" | "evidence_gap" | "cross_domain";
    capabilities: string[];
    statement: string;
    evidence_states: string[];
    limitation: string | null;
  }>;
  unresolved_evidence: string[];
  provenance: {
    source: "certified_capability_outputs";
    provider_observations_created: false;
    financial_values_created: false;
    money_movement_executed: false;
    run_id: string | null;
    evidence_manifest_hash: string | null;
    run_evidence_ids: string[];
    evidence_boundary: string | null;
  };
};

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function resultDependencies(result: GovernedCapabilityResult): string[] {
  const value = result.provenance;
  if (!value || typeof value !== "object") return [];
  const dependencyCapabilities = (value as { dependency_capabilities?: unknown }).dependency_capabilities;
  if (!Array.isArray(dependencyCapabilities)) return [];
  return dependencyCapabilities
    .map(item => item && typeof item === "object" && typeof (item as { capability_id?: unknown }).capability_id === "string" ? (item as { capability_id: string }).capability_id : null)
    .filter((item): item is string => Boolean(item));
}

function walk(results: Record<string, CapabilityOperatorResult>): RecursiveNode[] {
  const nodesByKey = new Map<string, RecursiveNode>();
  const visit = (capabilityId: string, result: CapabilityOperatorResult, depth: number, path: Set<string>) => {
    const nodeKey = `${capabilityId}:${hash(result.result)}`;
    if (path.has(nodeKey)) return;

    const nextPath = new Set(path);
    nextPath.add(nodeKey);
    const dependencies = [...new Set(resultDependencies(result.result))].sort();
    const existing = nodesByKey.get(nodeKey);
    if (!existing || depth > existing.depth) {
      nodesByKey.set(nodeKey, {
        capability_id: capabilityId,
        evidence_state: result.evidence_state,
        output_hash: hash(result.result),
        dependencies,
        depth,
      });
    }

    for (const dependency of dependencies) {
      const child = results[dependency];
      if (child) visit(dependency, child, depth + 1, nextPath);
    }
  };

  // Every node is a possible root. Using a path-local cycle guard rather than
  // a global visited set makes computed depth independent of object ordering.
  for (const [capabilityId, result] of Object.entries(results).sort(([a], [b]) => a.localeCompare(b))) {
    visit(capabilityId, result, 1, new Set());
  }
  return [...nodesByKey.values()].sort((a, b) => a.depth - b.depth || a.capability_id.localeCompare(b.capability_id));
}

function has(results: Record<string, CapabilityOperatorResult>, capabilityId: string, states?: CapabilityOperatorResult["evidence_state"][]) {
  const result = results[capabilityId];
  return Boolean(result && (!states || states.includes(result.evidence_state)));
}

function buildGenericRecursiveFindings(nodes: RecursiveNode[], maxFindings: number): RecursiveSynthesis["higher_order_findings"] {
  const byId = new Map(nodes.map(node => [node.capability_id, node]));
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    for (const dependency of node.dependencies) {
      if (!byId.has(dependency)) continue;
      const list = children.get(node.capability_id) ?? [];
      list.push(dependency);
      children.set(node.capability_id, list);
    }
  }

  const findings: RecursiveSynthesis["higher_order_findings"] = [];
  const seenPaths = new Set<string>();
  // The execution graph itself is the finite boundary for this pure synthesis
  // call. There is deliberately no hard-coded semantic depth ceiling here.
  // Runtime resource budgets may limit how many nodes/compositions are executed;
  // they must not redefine Iris's intelligence hierarchy.
  const maxPathDepth = Math.max(2, nodes.length);
  const visit = (path: string[]) => {
    if (findings.length >= maxFindings) return;
    const next = children.get(path[path.length - 1]) ?? [];
    for (const child of [...next].sort()) {
      if (path.includes(child)) continue;
      const nextPath = [...path, child];
      const key = nextPath.join("->");
      if (!seenPaths.has(key)) {
        seenPaths.add(key);
        const states = nextPath.map(id => byId.get(id)?.evidence_state ?? "INSUFFICIENT_EVIDENCE");
        const complete = !states.includes("INSUFFICIENT_EVIDENCE");
        findings.push({
          id: `recursive-chain-${hash(nextPath).slice(0, 16)}`,
          kind: nextPath.length === 2 ? "interaction" : "chain",
          capabilities: nextPath,
          statement: complete
            ? `A recursively composable evidence pathway connects ${nextPath.join(" → ")}; each upstream output is available in the current execution graph.`
            : `A recursively composable pathway connects ${nextPath.join(" → ")}, but at least one capability in the pathway remains evidence-limited.`,
          evidence_states: states,
          limitation: complete
            ? "Composition describes the governed analytical dependency graph; it does not convert inferred, predicted, or scenario outputs into observed facts."
            : "Missing evidence prevents a fully evidenced higher-order conclusion; Iris preserves the limitation rather than substituting a value.",
        });
      }
      if (nextPath.length < maxPathDepth) visit(nextPath);
      if (findings.length >= maxFindings) return;
    }
  };

  for (const node of nodes.sort((a, b) => a.capability_id.localeCompare(b.capability_id))) {
    if (findings.length >= maxFindings) break;
    visit([node.capability_id]);
  }
  return findings;
}

/**
 * Composes already-certified capability outputs into deeper intelligence.
 * Named high-value relationships are retained, while the dependency graph is
 * also explored generically so new governed capabilities can participate in
 * higher-order reasoning without requiring a new hard-coded pair/triple rule.
 * Recursion is bounded by execution resources outside this pure synthesis step,
 * not by a semantic maximum hierarchy depth.
 */
export function buildRecursiveIntelligenceSynthesis(
  results: Record<string, CapabilityOperatorResult>,
  context?: CapabilityExecutionContext,
): RecursiveSynthesis {
  const nodes = walk(results);
  const counts = {
    calculated: nodes.filter(node => node.evidence_state === "CALCULATED").length,
    inferred: nodes.filter(node => node.evidence_state === "INFERRED").length,
    predicted: nodes.filter(node => node.evidence_state === "PREDICTED").length,
    scenario: nodes.filter(node => node.evidence_state === "SCENARIO").length,
    insufficient_evidence: nodes.filter(node => node.evidence_state === "INSUFFICIENT_EVIDENCE").length,
  };
  const findings: RecursiveSynthesis["higher_order_findings"] = [];
  const add = (id: string, kind: RecursiveSynthesis["higher_order_findings"][number]["kind"], capabilities: string[], statement: string, limitation: string | null = null) => {
    findings.push({ id, kind, capabilities, statement, evidence_states: capabilities.map(capability => results[capability]?.evidence_state ?? "INSUFFICIENT_EVIDENCE"), limitation });
  };

  if (has(results, "financial_life_state") && has(results, "relational_ontology")) {
    add("life-state-ontology-foundation", "chain", ["financial_life_state", "relational_ontology"], "Canonical financial-life state can feed relational ontology expansion so individual facts and their observed relationships remain part of the same governed intelligence graph.", "Relationships are calculated from available evidence and do not establish causation, intent, necessity, or future behavior.");
  }
  if (has(results, "causal") && has(results, "relationship") && has(results, "causal", ["INFERRED"])) {
    add("causal-relationship-chain", "chain", ["relationship", "causal"], "Observed relationships can be passed into observational causal-candidate analysis without converting association into causation.", "The causal capability remains observational and does not establish a causal effect.");
  }
  if (has(results, "behavioral") && has(results, "anomaly") && has(results, "anomaly", ["CALCULATED"])) {
    add("behavior-anomaly-interaction", "interaction", ["behavioral", "anomaly"], "Behavioral concentration and transaction-level anomaly evidence can be jointly inspected to distinguish repeated activity from unusual activity.", "The interaction does not establish why an unusual transaction occurred.");
  }
  if (has(results, "predictive") && has(results, "scenario")) {
    add("prediction-scenario-chain", "chain", ["predictive", "scenario"], "A constrained forward projection can serve as the baseline context for explicitly modeled counterfactual scenarios.", "Scenario results remain assumptions applied to evidence and are not forecasts of behavior change.");
  }
  if (has(results, "scenario") && has(results, "decision") && has(results, "decision", ["INFERRED"])) {
    add("scenario-decision-chain", "chain", ["scenario", "decision"], "Scenario outputs can inform analytical decision options while keeping the decision separate from any executed action.", "No financial action is executed and the analytical option is not a guaranteed outcome.");
  }
  if (has(results, "decision") && has(results, "recommendation")) {
    add("decision-recommendation-chain", "chain", ["decision", "recommendation"], "Decision alternatives can be transformed into user-reviewable recommendations while preserving the upstream analytical context.", "A recommendation is advisory and does not imply authorization or execution.");
  }
  if (has(results, "risk") && has(results, "opportunity")) {
    add("risk-opportunity-interaction", "interaction", ["risk", "opportunity"], "Risk signals and opportunity candidates can be jointly inspected so Iris can evaluate improvement possibilities in the context of observed pressure signals.", "Risk and opportunity signals are analytical and do not establish that a proposed change will produce a particular outcome.");
  }
  if (has(results, "risk") && has(results, "opportunity") && has(results, "consequence")) {
    add("risk-opportunity-consequence-chain", "chain", ["risk", "opportunity", "consequence"], "Risk signals and opportunity candidates can feed conditional consequence analysis, preserving the distinction between observed evidence, analytical options, and modeled implications.", "Consequences are conditional analytical implications, not guaranteed future outcomes.");
  }
  if (has(results, "outcome") && has(results, "learning")) {
    add("outcome-learning-chain", "chain", ["outcome", "learning"], "Validated outcomes are the required evidence bridge for future learning rather than inferred learning from activity alone.", "Current learning remains evidence-limited until durable observed outcomes exist.");
  }
  if (has(results, "temporal") && has(results, "analysis")) {
    add("temporal-analysis-cross-domain", "cross_domain", ["temporal", "analysis"], "Temporal windows can be combined with canonical semantic analysis so changes are interpreted against the same evidence boundary.", "A temporal relationship does not by itself establish a cause.");
  }
  if (nodes.length >= 4) {
    add("multi-capability-synthesis", "interaction", nodes.slice(0, Math.min(nodes.length, 8)).map(node => node.capability_id), "Multiple governed capability outputs are available as a recursively composable evidence graph rather than isolated analytical cards.", "Only capability outputs present in the current run can be composed; missing evidence remains explicit.");
  }

  const genericFindings = buildGenericRecursiveFindings(nodes, 256);
  const existingKeys = new Set(findings.map(f => `${f.kind}:${f.capabilities.join("->")}`));
  for (const finding of genericFindings) {
    const key = `${finding.kind}:${finding.capabilities.join("->")}`;
    if (!existingKeys.has(key)) findings.push(finding);
    if (findings.length >= 320) break;
  }

  const expected = [
    "financial_life_state", "relational_ontology", "temporal", "analysis", "behavioral", "pattern",
    "relationship", "anomaly", "causal", "predictive", "scenario", "decision", "recommendation",
    "risk", "opportunity", "consequence", "outcome", "learning",
  ];
  for (const capability of expected) {
    if (!results[capability] || results[capability].evidence_state === "INSUFFICIENT_EVIDENCE") {
      findings.push({ id: `evidence-gap-${capability}`, kind: "evidence_gap", capabilities: [capability], statement: `${capability} cannot contribute a fully evidenced higher-order conclusion in this run until its required evidence is available.`, evidence_states: [results[capability]?.evidence_state ?? "INSUFFICIENT_EVIDENCE"], limitation: "Iris does not convert missing evidence into a zero, observed fact, or inferred conclusion." });
    }
  }

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
  return {
    synthesis_version: "IRIS_RECURSIVE_SYNTHESIS_V1",
    composition_depth: maxDepth,
    dependency_count: nodes.length,
    evidence_profile: { ...counts, complete: counts.insufficient_evidence === 0 && nodes.length > 0 },
    recursive_nodes: nodes,
    higher_order_findings: findings.sort((a, b) => a.id.localeCompare(b.id)).slice(0, 320),
    unresolved_evidence: [...new Set(findings.filter(f => f.kind === "evidence_gap").map(f => f.statement))].slice(0, 64),
    provenance: {
      source: "certified_capability_outputs",
      provider_observations_created: false,
      financial_values_created: false,
      money_movement_executed: false,
      run_id: context?.runId ?? null,
      evidence_manifest_hash: context?.evidenceManifestHash ?? null,
      run_evidence_ids: [...(context?.runEvidenceIds ?? [])].sort(),
      evidence_boundary: context?.evidenceBoundary ?? context?.asOf ?? null,
    },
  };
}
