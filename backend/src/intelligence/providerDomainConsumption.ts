import { supabaseAdmin } from "../config/supabase.js";

const ANALYSIS_BY_PRODUCT: Record<string, string[]> = {
  auth: ["account_integrity"],
  identity: ["account_integrity", "identity_context"],
  assets: ["asset_position", "net_worth"],
  investments: ["portfolio", "net_worth"],
  liabilities: ["debt_health", "net_worth"],
  statements: ["statement_reconciliation", "history", "cash_flow"],
  transactions: ["cash_flow", "history", "statement_reconciliation"],
  balance: ["liquidity", "net_worth", "statement_reconciliation"],
};

/** Records only calculations that providerDomainIntelligence actually executed. */
export async function recordProviderDomainConsumption(userId: string, provider: any) {
  if (!provider?.evidence_ready || !provider.selected_item_id) return { recorded: 0 };
  const rows: any[] = [];
  for (const [product, analyses] of Object.entries(ANALYSIS_BY_PRODUCT)) {
    const domain = provider.domains?.[product];
    if (!domain) continue;
    const sourceIds = Array.isArray(domain.source_observation_ids) ? domain.source_observation_ids : [];
    if (!sourceIds.length) continue;
    for (const analysisKey of analyses) {
      rows.push({
        user_id: userId,
        item_id: provider.selected_item_id,
        product,
        analysis_key: analysisKey,
        evidence_observation_id: null,
        raw_observation_id: sourceIds[0],
        dedupe_observation_id: sourceIds[0],
        details: {
          evidence_state: "observed",
          consumption: "provider_domain_calculation",
          authoritative_source: true,
          same_item: true,
          selected_item_id: provider.selected_item_id,
          source_observation_ids: sourceIds,
          provider_architecture_version: provider.architecture_version,
        },
      });
    }
  }
  if (!rows.length) return { recorded: 0 };
  const { error } = await supabaseAdmin.from("iris_product_consumption").upsert(rows, {
    onConflict: "user_id,item_id,product,analysis_key,dedupe_observation_id",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return { recorded: rows.length };
}
