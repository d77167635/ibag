import { createHash } from "node:crypto";

export type IntelligenceOperation = "select" | "join" | "aggregate" | "compare" | "transform" | "derive" | "correlate" | "sequence" | "simulate" | "evaluate";

export type FieldLineageStep = {
  operation: IntelligenceOperation;
  input_field_ids: string[];
  input_paths: string[];
  output_path: string;
  evidence_state: string;
  rationale: string;
};

function id(parts: string[]) {
  return `iris-lineage-${createHash("sha256").update(parts.join("|"), "utf8").digest("hex").slice(0, 24)}`;
}

const operationFor = (root: string): IntelligenceOperation => {
  if (/^layer_/i.test(root)) return "aggregate";
  if (/graph|correlat|causal|relationship/i.test(root)) return "correlate";
  if (/counterfactual|simulation|simulate/i.test(root)) return "simulate";
  if (/decision|evaluate|validation|govern/i.test(root)) return "evaluate";
  if (/temporal|history|sequence|trajectory/i.test(root)) return "sequence";
  if (/compare|drift|variance/i.test(root)) return "compare";
  return "derive";
};

function sourceFieldsForPath(path: string, sourceFields: any[]) {
  const tokens = path.toLowerCase().split(/[.:[\]]/).filter(Boolean);
  const exact = sourceFields.filter((field: any) => {
    const fieldName = String(field.field_name ?? "").toLowerCase();
    const providerName = String(field.exact_provider_field_name ?? "").toLowerCase();
    const sourcePath = String(field.path ?? "").toLowerCase();
    return tokens.some(token => token === fieldName || token === providerName || sourcePath.endsWith(`.${token}`) || sourcePath === token);
  });
  return exact.length ? exact : sourceFields.filter((field: any) => String(field.path ?? "").toLowerCase().split(/[.:[\]]/).some((token: string) => tokens.includes(token))).slice(0, 32);
}

/**
 * Converts computed intelligence paths into an explicit source-field lineage
 * graph. This is conservative: it never invents a source field when a match
 * cannot be established, and unresolved dependencies are marked limited.
 */
export function buildFieldLineageGraph(intelligence: Record<string, unknown>, plaidArchitecture: any) {
  const sourceFields = Array.isArray(plaidArchitecture?.fields) ? plaidArchitecture.fields : [];
  const derivedFields: any[] = [];
  const steps: FieldLineageStep[] = [];

  const walk = (value: unknown, path: string, evidenceState: string) => {
    if (value === null || typeof value !== "object") {
      const root = path.split(".")[0];
      if (["generated_at", "architecture_version"].includes(path)) return;
      const matches = sourceFieldsForPath(path, sourceFields);
      const operation = operationFor(root);
      const inputIds = matches.map((field: any) => String(field.field_id));
      const inputPaths = matches.map((field: any) => String(field.path));
      const resolved = inputIds.length > 0;
      const step: FieldLineageStep = {
        operation,
        input_field_ids: inputIds,
        input_paths: inputPaths,
        output_path: path,
        evidence_state: resolved ? evidenceState : "limited",
        rationale: resolved ? `Matched computed path tokens to observed Plaid source fields.` : `No exact source-field dependency could be established for this computed path; dependency remains limited.`,
      };
      steps.push(step);
      derivedFields.push({
        field_id: id(["derived", path]),
        field_name: path.split(".").pop()?.replace(/\[\d+\]$/, "") ?? path,
        path,
        value,
        value_type: value === null ? "null" : typeof value,
        evidence_state: resolved ? evidenceState : "limited",
        operation,
        source_field_ids: inputIds,
        source_field_paths: inputPaths,
        lineage_step_id: id(["step", path, operation]),
      });
      return;
    }
    if (Array.isArray(value)) value.forEach((child, index) => walk(child, `${path}[${index}]`, evidenceState));
    else Object.entries(value as Record<string, unknown>).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key, evidenceState));
  };

  const evidenceState = intelligence.intelligence_gate && (intelligence.intelligence_gate as any).higher_order_conclusions_enabled === false ? "limited" : "calculated";
  for (const [key, value] of Object.entries(intelligence)) {
    if (["plaid_iris_field_map", "plaid_complete_field_architecture", "iris_field_architecture", "feature_flags", "intelligence_gate"].includes(key)) continue;
    walk(value, key, evidenceState);
  }

  const unresolved = derivedFields.filter(field => field.evidence_state === "limited").length;
  return {
    architecture_version: "IRIS_EXACT_FIELD_LINEAGE_V1",
    source_field_universe: "Plaid observed provider fields",
    derived_fields: derivedFields,
    lineage_steps: steps,
    counts: {
      source_fields_available: sourceFields.length,
      derived_fields: derivedFields.length,
      resolved_dependencies: derivedFields.length - unresolved,
      unresolved_dependencies: unresolved,
      resolution_rate: derivedFields.length ? (derivedFields.length - unresolved) / derivedFields.length : 1,
    },
    rules: [
      "Plaid source fields remain the authoritative inputs to Iris intelligence.",
      "Every derived field carries source field IDs and source paths when a dependency can be established.",
      "Unresolved dependencies are explicitly limited rather than guessed.",
      "Operations are explicit and may be composed; composition itself is not evidence.",
      "No source field values are rewritten or fabricated.",
    ],
  };
}
