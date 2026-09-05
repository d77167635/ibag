import type { IrisAnalysisDefinition } from "./analysisAtlas.js";
import { IRIS_ANALYSIS_ATLAS } from "./analysisAtlas.js";

type CanonicalLike = {
  id: string;
  account_id?: string | null;
  merchant_name?: string | null;
  domain?: { key?: string | null; label?: string | null } | null;
  subdomain?: { key?: string | null; label?: string | null } | null;
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

const STANDARD_CATALOG: Array<{ name: string; description: string; match: (d: IrisAnalysisDefinition) => boolean }> = [
  { name: "Financial State", description: "Understand where you actually stand financially.", match: d => d.name === "Financial State" },
  { name: "Cash Flow", description: "Understand money entering, leaving, and changing over time.", match: d => d.name === "Cash-flow analysis" },
  { name: "Spending", description: "Understand where observed money is going.", match: d => d.name === "Spending analysis" },
  { name: "Behavior", description: "Understand recurring and changing financial behavior.", match: d => d.name === "Behavior analysis" },
  { name: "Trends", description: "Understand what is changing and whether it persists.", match: d => d.name === "Multi-window comparison" },
  { name: "Liquidity", description: "Understand available financial capacity and pressure.", match: d => d.name === "Liquidity position" },
  { name: "Debt", description: "Understand debt pressure, cost, utilization, and trajectory.", match: d => d.family === "debt" && d.name === "Debt trajectory" },
  { name: "Anomalies", description: "Find unusual observed financial activity worth examining.", match: d => d.name === "Anomaly analysis" },
  { name: "Round-Ups", description: "Understand observed round-up opportunity and behavior.", match: d => d.name === "Round-Up opportunity" },
  { name: "Forecast", description: "Understand what the evidence supports about what may happen next.", match: d => d.name === "Forward balance projection" },
  { name: "Causality", description: "Separate evidence-linked drivers from correlation and unknowns.", match: d => d.name === "Causal analysis" },
  { name: "Decisions", description: "Compare evidence-linked choices and their implications.", match: d => d.name === "Decision analysis" },
  { name: "Consequences", description: "Understand modeled downstream consequences of choices.", match: d => d.name === "Consequence analysis" },
  { name: "Optimization", description: "Identify evidence-supported opportunities to improve outcomes.", match: d => d.name === "Optimization analysis" },
  { name: "Goals", description: "Connect financial intelligence to declared objectives.", match: d => d.name === "Goal intelligence" },
  { name: "Evidence", description: "See exactly what evidence supports Iris's conclusions.", match: d => d.name === "Evidence graph" },
  { name: "Education", description: "Learn what the observed financial evidence means.", match: d => d.name === "Personalized education" },
  { name: "Investigation", description: "Discover the next question most likely to improve intelligence.", match: d => d.name === "Iris investigation" },
  { name: "Relationships", description: "Understand connections across financial entities and layers.", match: d => d.name === "Relational reasoning" },
  { name: "Synthesis", description: "Combine multiple intelligence layers into a coherent picture.", match: d => d.name === "Financial intelligence map" },
];

export const IRIS_STANDARD_SELECTION = STANDARD_CATALOG.map(({ name, description, match }) => {
  const definition = IRIS_ANALYSIS_ATLAS.find(match);
  return { name, description, analysis_id: definition?.id ?? null };
});

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function windowsFor(canonical: CanonicalLike[]) {
  if (!canonical.length) return [];
  const dates = canonical.map((tx) => tx.posted_date).filter((d): d is string => Boolean(d)).sort();
  if (!dates.length) return [];
  const oldest = new Date(`${dates[0]}T00:00:00Z`).getTime();
  const newest = new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime();
  const spanDays = Math.floor((newest - oldest) / 86_400_000);
  return [30, 60, 90].filter((days) => spanDays >= days - 1).map(String);
}

export function buildIrisDimensions(canonical: CanonicalLike[]): IrisDimension[] {
  const accounts = unique(canonical.map((tx) => tx.account_id));
  const merchants = unique(canonical.map((tx) => tx.merchant_name));
  const domains = unique(canonical.map((tx) => tx.domain?.key ?? tx.domain?.label));
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
  const common = ["window_days"];
  switch (definition.family) {
    case "state": return ["account", ...common];
    case "cash_flow": return ["account", "transaction_class", ...common];
    case "spending": return ["account", "merchant", "domain", "category", ...common];
    case "temporal": return ["account", "domain", "category", ...common];
    case "behavior": return ["account", "merchant", "category", ...common];
    case "debt": return ["account", ...common];
    case "roundups": return ["account", "merchant", "category", ...common];
    case "forecast": return ["account", ...common];
    case "causal": return ["account", "merchant", "domain", "category", ...common];
    case "decisions": return ["account", "domain", "category", ...common];
    case "evidence": return ["account", "merchant", "domain", "category", ...common];
    default: return ["account", "domain", "category", ...common];
  }
}

function cardinality(definition: IrisAnalysisDefinition, dimensions: IrisDimension[]) {
  const byKey = new Map(dimensions.map((d) => [d.key, d]));
  return dimensionKeys(definition).reduce((total, key) => total * (byKey.get(key)?.cardinality ?? 0), 1);
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
 * Calculates Iris's compositional intelligence space from real canonical
 * evidence. It intentionally counts the space without materializing it.
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

  for (const { definition } of [...counts].sort((a, b) => b.combinations - a.combinations)) {
    if (preview.length >= maxPreview) break;
    const context: Record<string, string> = {};
    for (const key of dimensionKeys(definition)) {
      const dimension = dimensionMap.get(key);
      if (dimension?.values[0]) context[key] = dimension.values[0];
    }
    preview.push({ analysis_id: definition.id, analysis_name: definition.name, family: definition.family, output: definition.output, context, evidence_ready: true, rank: rankComposition(definition, context) });
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
