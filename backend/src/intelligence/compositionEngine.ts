import type { IrisAnalysisDefinition } from "./analysisAtlas.js";
import { IRIS_CATALOG, IRIS_CATALOG_VERSION, IRIS_STANDARD_CAPABILITY_IDS } from "./irisCatalog.js";
import { IRIS_CATALOG_EXPANSION } from "./irisCatalogExpansion.js";

type CanonicalLike = { id: string; account_id?: string | null; merchant_name?: string | null; domain?: { key?: string | null; label?: string | null } | null; subdomain?: { key?: string | null; label?: string | null } | null; plaid_category_primary?: string | null; plaid_category_detailed?: string | null; transaction_class?: string | null; posted_date?: string | null };
export type IrisDimension = { key: string; label: string; cardinality: number; values: string[]; evidence_required: boolean };
export type IrisComposition = { analysis_id: string; analysis_name: string; family: string; output: string; context: Record<string, string>; evidence_ready: boolean; rank: number };

const CATALOG = [...IRIS_CATALOG, ...IRIS_CATALOG_EXPANSION];
function unique(values: Array<string | null | undefined>) { return [...new Set(values.filter((v): v is string => Boolean(v && v.trim())))]; }
function dimensionsFrom(canonical: CanonicalLike[]) {
  const accounts = unique(canonical.map(tx => tx.account_id)), merchants = unique(canonical.map(tx => tx.merchant_name)), domains = unique(canonical.map(tx => tx.domain?.key ?? tx.domain?.label)), categories = unique(canonical.map(tx => tx.plaid_category_detailed ?? tx.plaid_category_primary)), classes = unique(canonical.map(tx => tx.transaction_class));
  const dates = canonical.map(tx => tx.posted_date).filter((d): d is string => Boolean(d)).sort();
  const span = dates.length ? Math.floor((new Date(`${dates.at(-1)}T00:00:00Z`).getTime() - new Date(`${dates[0]}T00:00:00Z`).getTime()) / 86_400_000) : 0;
  const windows = [30, 60, 90].filter(days => span >= days - 1).map(String);
  return [
    { key: "account", label: "Account", values: accounts, evidence_required: true }, { key: "merchant", label: "Merchant", values: merchants, evidence_required: true }, { key: "domain", label: "Spending domain", values: domains, evidence_required: true }, { key: "category", label: "Category", values: categories, evidence_required: true }, { key: "transaction_class", label: "Transaction class", values: classes, evidence_required: true }, { key: "window_days", label: "Observed window", values: windows, evidence_required: true },
  ].map(d => ({ ...d, cardinality: d.values.length })) as IrisDimension[];
}
function keysFor(definition: IrisAnalysisDefinition) {
  switch (definition.family) {
    case "state": return ["account", "window_days"]; case "cash_flow": return ["account", "transaction_class", "window_days"]; case "spending": return ["account", "merchant", "domain", "category", "window_days"]; case "temporal": return ["account", "domain", "category", "window_days"]; case "behavior": return ["account", "merchant", "category", "window_days"]; case "debt": return ["account", "window_days"]; case "roundups": return ["account", "merchant", "category", "window_days"]; case "forecast": return ["account", "window_days"]; case "causal": return ["account", "merchant", "domain", "category", "window_days"]; case "decisions": return ["account", "domain", "category", "window_days"]; case "evidence": return ["account", "merchant", "domain", "category", "window_days"]; default: return ["account", "domain", "category", "window_days"];
  }
}
function valueFor(tx: CanonicalLike, key: string) { if (key === "account") return tx.account_id ?? null; if (key === "merchant") return tx.merchant_name ?? null; if (key === "domain") return tx.domain?.key ?? tx.domain?.label ?? null; if (key === "category") return tx.plaid_category_detailed ?? tx.plaid_category_primary ?? null; if (key === "transaction_class") return tx.transaction_class ?? null; return null; }
function contextKey(context: Record<string, string>) { return Object.entries(context).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&"); }

/** Relationship-aware lazy composition. Counts are generated from compatible observed tuples, never global cardinality products. */
export function buildIrisCompositionEngine(canonical: CanonicalLike[], atlas: ReturnType<typeof import("./analysisAtlas.js").buildIrisAnalysisAtlas>, maxPreview = 48) {
  const dimensions = dimensionsFrom(canonical), readyDefinitions = atlas.definitions.filter(d => d.evidence_ready), limitedDefinitions = atlas.definitions.filter(d => !d.evidence_ready), allDates = canonical.map(tx => tx.posted_date).filter((d): d is string => Boolean(d)).sort(), newest = allDates.length ? new Date(`${allDates.at(-1)}T00:00:00Z`).getTime() : 0, validWindows = dimensions.find(d => d.key === "window_days")?.values ?? [];
  const definitionCounts: Array<{ definition: IrisAnalysisDefinition; combinations: number }> = [], previews: IrisComposition[] = [];
  let evidenceLimitedCombinations = 0;
  for (const definition of atlas.definitions) {
    const keys = keysFor(definition);
    if (!definition.evidence_ready) { evidenceLimitedCombinations += Math.max(1, validWindows.length); continue; }
    const contexts = new Set<string>();
    for (const tx of canonical) {
      if (!tx.posted_date) continue;
      const txTime = new Date(`${tx.posted_date}T00:00:00Z`).getTime();
      for (const window of validWindows) {
        if (newest - txTime > Number(window) * 86_400_000) continue;
        const context: Record<string, string> = {}; let complete = true;
        for (const key of keys) { const value = key === "window_days" ? window : valueFor(tx, key); if (!value) { complete = false; break; } context[key] = value; }
        if (complete) contexts.add(contextKey(context));
      }
    }
    definitionCounts.push({ definition, combinations: contexts.size });
    if (previews.length < maxPreview) {
      for (const key of contexts) {
        const context = Object.fromEntries(key.split("&").map(pair => { const [k, v] = pair.split("="); return [k, decodeURIComponent(v ?? "")]; }));
        previews.push({ analysis_id: definition.id, analysis_name: definition.name, family: definition.family, output: definition.output, context, evidence_ready: true, rank: (definition.family === "synthesis" ? 140 : 100) + (context.merchant ? 10 : 0) + (context.category || context.domain ? 5 : 0) }); break;
      }
    }
  }
  const possibleCombinations = definitionCounts.reduce((sum, item) => sum + item.combinations, 0), familyMap = new Map<string, number>();
  for (const item of definitionCounts) familyMap.set(item.definition.family, (familyMap.get(item.definition.family) ?? 0) + item.combinations);
  return { engine_version: "IRIS_COMPOSITION_V2_RELATIONAL", hierarchy: "Iris > synthesis > intelligence catalog > analytical families > evidence-valid compositions > canonical evidence > Plaid source observations", catalog_version: IRIS_CATALOG_VERSION, catalog: CATALOG, standard_selection: { count: IRIS_STANDARD_CAPABILITY_IDS.length, capability_ids: IRIS_STANDARD_CAPABILITY_IDS, selection_is_preference_not_ceiling: true }, dimensions, counts: { defined_analyses: atlas.counts.total_defined, evidence_ready_analyses: readyDefinitions.length, evidence_limited_analyses: limitedDefinitions.length, possible_combinations: possibleCombinations, evidence_ready_combinations: possibleCombinations, evidence_limited_combinations: evidenceLimitedCombinations, materialized_preview: previews.length }, family_combinations: [...familyMap.entries()].map(([family, combinations]) => ({ family, combinations })).sort((a, b) => b.combinations - a.combinations), preview: previews.sort((a, b) => b.rank - a.rank), generation: { mode: "lazy_relational", max_materialized_preview: maxPreview, source: "canonical evidence relationships and observed windows", financial_values_created: false, fake_mock_or_seeded_data: false, invalid_global_cardinality_products: false, combinations_are_context_compatible: true } };
}
