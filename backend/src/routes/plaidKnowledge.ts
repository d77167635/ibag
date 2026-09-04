import { Router } from "express";
import { supabaseAdmin } from "../config/supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const plaidKnowledgeRouter = Router();

/** Public Plaid product/service knowledge stored in Supabase for Iris education. */
plaidKnowledgeRouter.get("/dashboard/plaid/knowledge", requireAuth, async (_req: AuthedRequest, res) => {
  const [knowledgeResult, sourcesResult] = await Promise.all([
    supabaseAdmin
      .from("plaid_public_knowledge")
      .select("id, key, name, kind, category, description, what_it_does, how_it_works, who_uses_it, when_used, why_it_exists, public_data_scope, iris_capabilities, plaid_item_states, availability_notes, pricing_notes, official_source_url, official_docs_url, source_type, verified_at, active, metadata")
      .eq("active", true)
      .order("kind", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("plaid_public_sources")
      .select("id, canonical_url, docs_url, source_kind, title, publisher, first_seen_at, last_verified_at, last_content_hash, verification_status, active, metadata")
      .eq("active", true)
      .order("title", { ascending: true }),
  ]);

  if (knowledgeResult.error) return res.status(500).json({ error: "Unable to load Plaid public knowledge", details: knowledgeResult.error.message });
  if (sourcesResult.error) return res.status(500).json({ error: "Unable to load Plaid source registry", details: sourcesResult.error.message });

  res.json({
    source: "official_public_plaid",
    read_only: true,
    purpose: "Iris educational and product-understanding reference; not consumer financial evidence",
    verified_at: knowledgeResult.data?.reduce((latest: string | null, row: any) => row.verified_at && (!latest || row.verified_at > latest) ? row.verified_at : latest, null) ?? null,
    records: knowledgeResult.data ?? [],
    sources: sourcesResult.data ?? [],
  });
});
