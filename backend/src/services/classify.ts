import { supabaseAdmin } from "../config/supabase.js";

/**
 * Rule-based merchant name cleanup. This is deliberately plain regex, not a
 * claimed entity-resolution model — it strips the noise patterns actually
 * observed in Plaid sandbox data (trailing reference numbers, **POOL**
 * style markers, stray punctuation) and title-cases what's left.
 *
 * Known limitation, stated plainly rather than hidden: bank ACH descriptor
 * text (e.g. "ACH Electronic CreditGUSTO PAY") and Plaid's own truncated or
 * abbreviated strings (e.g. "INTRST PYMNT") pass through mostly as-is. This
 * function cleans noise; it does not know what abbreviations mean.
 */
export function normalizeMerchantName(raw: string): string {
  let s = raw;
  s = s.replace(/\*\*[A-Za-z]+\*\*/g, " "); // **POOL** style markers
  s = s.replace(/\*+\/+/g, " "); // *// style noise
  s = s.replace(/\b\d{4,}\b/g, " "); // standalone 4+ digit reference/date codes
  s = s.replace(/[._]+/g, " "); // stray periods/underscores
  s = s.replace(/-+/g, " "); // dashes
  s = s.replace(/\s{2,}/g, " ").trim();

  if (!s) return raw.trim();

  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Resolves a raw merchant/description string to a stable merchant_id.
 * Every raw variant seen is kept in merchant_aliases (even after resolving
 * to an existing merchant) so the mapping stays fully auditable — you can
 * always see which raw strings collapsed into which canonical merchant.
 */
export async function resolveMerchant(rawName: string): Promise<string | null> {
  const raw = rawName.trim();
  if (!raw) return null;

  // Exact raw string already seen before — fast path, no renormalization.
  const { data: existingAlias } = await supabaseAdmin
    .from("merchant_aliases")
    .select("merchant_id")
    .eq("raw_pattern", raw)
    .maybeSingle();

  if (existingAlias) return existingAlias.merchant_id;

  const canonicalName = normalizeMerchantName(raw);

  let merchantId: string;
  const { data: existingMerchant } = await supabaseAdmin
    .from("merchants")
    .select("id")
    .eq("canonical_name", canonicalName)
    .maybeSingle();

  if (existingMerchant) {
    merchantId = existingMerchant.id;
  } else {
    const { data: newMerchant, error } = await supabaseAdmin
      .from("merchants")
      .insert({ canonical_name: canonicalName })
      .select("id")
      .single();
    if (error) {
      // Race with a concurrent sync inserting the same canonical name —
      // re-fetch rather than fail the whole transaction sync over it.
      const { data: retry } = await supabaseAdmin
        .from("merchants")
        .select("id")
        .eq("canonical_name", canonicalName)
        .maybeSingle();
      if (!retry) throw error;
      merchantId = retry.id;
    } else {
      merchantId = newMerchant.id;
    }
  }

  await supabaseAdmin
    .from("merchant_aliases")
    .insert({ merchant_id: merchantId, raw_pattern: raw })
    .then(() => {}, () => {}); // ignore unique-violation races on raw_pattern

  return merchantId;
}

let categoryMapCache: Map<string, string> | null = null;

async function getCategoryMap(): Promise<Map<string, string>> {
  if (categoryMapCache) return categoryMapCache;
  const { data, error } = await supabaseAdmin
    .from("category_mapping")
    .select("plaid_category_detailed, subdomain_id");
  if (error) throw error;
  categoryMapCache = new Map(data.map((row) => [row.plaid_category_detailed, row.subdomain_id]));
  return categoryMapCache;
}

/**
 * Resolves Plaid's detailed PFC category to our internal subdomain_id.
 * Returns null for anything not in category_mapping rather than guessing —
 * an unmapped category should be visibly unmapped, not silently forced
 * into the wrong bucket.
 */
export async function resolveSubdomain(plaidCategoryDetailed: string | null): Promise<string | null> {
  if (!plaidCategoryDetailed) return null;
  const map = await getCategoryMap();
  return map.get(plaidCategoryDetailed) ?? null;
}
