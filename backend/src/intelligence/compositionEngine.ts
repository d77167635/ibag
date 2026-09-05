import type { IrisAnalysisDefinition } from "./analysisAtlas.js";
import { IRIS_ANALYSIS_ATLAS } from "./analysisAtlas.js";

type CanonicalLike = {
  id: string;
  account_id?: string | null;
  merchant_name?: string | null;
  subdomain?: { label?: string | null; domains?: { key?: string | null; label?: string | null } | null } | null;
  plaid_category_primary?: string | null;
  plaid_category_detailed?: string | null;
  transaction_class?: string | null;
  posted_date?: string | null;
};

export type IrisDimension = {
  key: string;
  label: string;
  cardinality: number;
  values: string[];
  evidence_required: boolean;
};

export type IrisComposition = {
  analysis_id: string;
  analysis_name: string;
  family: string;
  output: string;
  context: Record<string, string>;
  evidence_ready: boolean;
  rank: number;
};

const STANDARD_NAMES = [
  "Financial State", "Cash Flow", "Spending", "Behavior", "Trends", "Liquidity", "Debt",
  "Anomalies", "Round-Ups", "Forecast", "Causality", "Decisions", "Consequences",
  "Optimization", "Goals", "Evidence", "Education", "Investigation", "Relationships", "Synthesis",
] as const;

export const IRIS_STANDARD_SELECTION = STANDARD_NAMES.map((name) => {
  const definition = IRIS_ANALYSIS_ATLAS.find((entry) => entry.name === name || entry.family === name.toLowerCase());
  return { name, description: definition?.purpose ?? `Iris intelligence focused on ${name.toLowerCase()}.`, analysis_id: definition?.id ?? null };
});

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function windowsFor(canonical: CanonicalLike[]) {
  if (!canonical.length) return [];
  const dates = canonical.map((tx) => tx.posted_date).filter((d): d is string => Boolean(d)).sort();
  if (!dates.length) return [];
  const newest = new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime();
  return [30, 60, 90].filter((days) => newest - new Date(`${dates[0]}T00:00:00Z`).getTime() >= Math.min(days - 1, 1) * 86_400_000).map(String);
}

export function buildIrisDimensions(canonical: CanonicalLike[]): IrisDimension[] {
  const accounts = unique(canonical.map((tx) => tx.account_id));
  const merchants = unique(canonical.map((tx) => tx.merchant_name));
  const domains = unique(canonical.map((tx) => tx.subdomain?.domains?.key ?? tx.subdomain?.domains?.label));
  const categories = unique(canonical.map((tx) => tx.plaid_category_detailed ?? tx.plaid_category_primary));
  const classes = unique(canonical.map((tx) => tx.transaction_class));
  const windows = windowsFor(canonical);
  return [
    { key: "account", label: "Account", cardinality: accounts.length, values: accounts.slice(0, 500), evidence_required: true },
    { key: "merchant", label: "Merchant", cardinality: merchants.length, values: merchants.slice(0, 500), evidence_required: true },
    { key: "domain", label: "Spending domain", cardinality: domains.length, values: domains.slice(0, 500), evidence_required: true },
    { key: "category", label: "Category", cardinality: categories.length, values: categories.slice(0, 500), evidence_required: true },
    { key: "transaction_class", label: "Transaction class", cardinality: classes.length, values: classes.slice(0, 100), evidence_required: true },
    { key: "window_days", label: "Observed window", cardinality: windows.length, values: windows, evidence_required: true },
  ];
}

function dimensionKeys(definition: IrisAnalysisDefinition) {
  const family = definition.family;
  const common = ["window_days"];
  if (family === "state") return ["account", "window_days"];
  if (family === "cash_flow") return ["account", "transaction_class", ...common];
  if (family === "spending") return ["account", "merchant", "domain", "category", ...common];
  if (family === "temporal") return ["account", "domain", "category", ...common];
  if (family === "behavior") return ["account", "merchant", "category", ...common];
  if (family === "debt") return ["account", ...common];
  if (family === "roundups") return ["account", "merchant", "category", ...common];
  if (family === "forecast") return ["account", ...common];
  if (family === "causal") return ["account", "merchant", "domain", "category", ...common];
  if (family === "decisions") return ["account", "domain", "category", ...common];
  if (family === "evidence") return ["account", "merchant", "domain", "category", ...common];
  return ["account", "domain", "category", ...common];
}

function cardinality(definition: IrisAnalysisDefinition, dimensions: IrisDimension[]) {
  const byKey = new Map(dimensions.map((d) => [d.key, d]));
  return dimensionKeys(definition).reduce((total, key) => total * Math.max(1, byKey.get(key)?.cardinality ?? 0), 1);
}

function rankComposition(definition: IrisAnalysisDefinition, context: Record<string, string>) {
  let rank = 100;
  if (definition.family === "synthesis") rank += 40;
  if (definition.family === "evidence") rank += 30;
  if (context.merchant) rank += 10;
  if (context.category || context.domain) rank += 5;
  return rank;
}

/**
 * Generates the size and highest-value portion of Iris's compositional search
 * space without materializing every possible combination. The count is derived
 * from real canonical evidence cardinalities; no financial values are created.
 */
export function buildIrisCompositionEngine(
  canonical: CanonicalLike[],
  atlas: ReturnType<typeof import("./analysisAtlas.js").buildIrisAnalysisAtlas>,
  maxPreview = 48,
) {
  const dimensions = buildIrisDimensions(canonical);
  const dimensionMap = new Map(dimensions.map((d) => [d.key, d]));
  const readyDefinitions = atlas.definitions.filter((definition) => definition.evidence_ready);
  const limitedDefinitions = atlas.definitions.filter((definition) => !definition.evidence_ready);
  const counts = readyDefinitions.map((definition) => ({ definition, combinations: cardinality(definition, dimensions) }));
  const possibleCombinations = counts.reduce((sum, item) => sum + item.combinations, 0);
  const preview: IrisComposition[] = [];

  for (const { definition } of counts.sort((a, b) => b.combinations - a.combinations)) {
    if (preview.length >= maxPreview) break;
    const keys = dimensionKeys(definition);
    const context: Record<string, string> = {};
    for (const key of keys) {
      const dimension = dimensionMap.get(key);
      if (dimension?.values[0]) context[key] = dimension.values[0];
    }
    preview.push({
      analysis_id: definition.id,
      analysis_name: definition.name,
      family: definition.family,
      output: definition.output,
      context,
      evidence_ready: true,
      rank: rankComposition(definition, context),
    });
  }

  const familyCounts = new Map<string, number>();
  for (const item of counts) familyCounts.set(item.definition.family, (familyCounts.get(item.definition.family) ?? 0) + item.combinations);

  return {
    engine_version: "IRIS_COMPOSITION_V1",
    hierarchy: "Iris > synthesis > analytical families > compositions > canonical evidence > Plaid source observations",
    catalog: IRIS_STANDARD_SELECTION,
    dimensions,
    counts: {
      defined_analyses: atlas.counts.total_defined,
      evidence_ready_analyses: readyDefinitions.length,
      evidence_limited_analyses: limitedDefinitions.length,
      possible_combinations: possibleCombinations,
      evidence_ready_combinations: possibleCombinations,
      evidence_limited_combinations: limitedDefinitions.length,
      materialized_preview: preview.length,
    },
    family_combinations: [...familyCounts.entries()].map(([family, combinations]) => ({ family, combinations })).sort((a, b) => b.combinations - a.combinations),
    preview,
    generation: {
      mode: "lazy",
      max_materialized_preview: maxPreview,
      source: "canonical evidence cardinalities",
      financial_values_created: false,
      fake_mock_or_seeded_data: false,
    },
  };
}
