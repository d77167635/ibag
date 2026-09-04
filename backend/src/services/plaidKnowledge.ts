import { supabaseAdmin } from "../config/supabase.js";

export async function searchPlaidKnowledge(question: string, limit = 8) {
  const q = question.trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("plaid_public_knowledge")
    .select("key, name, kind, category, description, what_it_does, how_it_works, who_uses_it, when_used, why_it_exists, public_data_scope, iris_capabilities, plaid_item_states, availability_notes, pricing_notes, official_source_url, official_docs_url, verified_at")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((r: any) => ({ ...r, _score: `${r.name} ${r.category} ${r.description} ${r.what_it_does} ${r.how_it_works} ${r.iris_capabilities?.join(" ") ?? ""}`.toLowerCase().split(q).length - 1 }));
  return rows.sort((a:any,b:any)=>b._score-a._score).slice(0, Math.max(1, Math.min(limit, 20))).map(({_score,...r}:any)=>r);
}
