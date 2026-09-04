import { supabaseAdmin } from "../config/supabase.js";

type PlaidKnowledgeRow = Record<string, any>;

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9_\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(question: string): string[] {
  return [...new Set(normalize(question).split(" ").filter(token => token.length >= 2))];
}

function scoreRow(row: PlaidKnowledgeRow, terms: string[], question: string): number {
  const name = normalize(row.name);
  const category = normalize(row.category);
  const searchable = normalize([
    row.name,
    row.key,
    row.kind,
    row.category,
    row.description,
    row.what_it_does,
    row.how_it_works,
    row.who_uses_it,
    row.when_used,
    row.why_it_exists,
    row.public_data_scope,
    Array.isArray(row.iris_capabilities) ? row.iris_capabilities.join(" ") : row.iris_capabilities,
    Array.isArray(row.plaid_item_states) ? row.plaid_item_states.join(" ") : row.plaid_item_states,
    row.availability_notes,
  ].join(" "));

  let score = 0;
  if (question && name === normalize(question)) score += 100;
  if (question && name.includes(normalize(question))) score += 40;
  for (const term of terms) {
    if (name.includes(term)) score += 12;
    if (category.includes(term)) score += 7;
    if (searchable.includes(term)) score += 2;
  }
  return score;
}

export async function searchPlaidKnowledge(question: string, limit = 8) {
  const normalizedQuestion = question.trim();
  const terms = tokens(normalizedQuestion);
  const { data, error } = await supabaseAdmin
    .from("plaid_public_knowledge")
    .select("key, name, kind, category, description, what_it_does, how_it_works, who_uses_it, when_used, why_it_exists, public_data_scope, iris_capabilities, plaid_item_states, availability_notes, pricing_notes, official_source_url, official_docs_url, verified_at")
    .eq("active", true);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: PlaidKnowledgeRow) => ({ row, score: scoreRow(row, terms, normalizedQuestion) }))
    .filter(item => terms.length === 0 || item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.row.name).localeCompare(String(b.row.name)))
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(item => item.row);
}
