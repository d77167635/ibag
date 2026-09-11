import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const irisOutcomesRouter = Router();

irisOutcomesRouter.get("/iris/outcomes", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("iris_outcome_observations")
      .select("id, source_type, source_id, outcome_type, outcome_state, value, observed_at, effective_at, evidence_hash, lineage")
      .eq("user_id", req.userId!)
      .order("observed_at", { ascending: false });
    if (error) return res.status(500).json({ error: "Unable to read observed outcome evidence." });
    return res.json({ outcomes: data ?? [], evidence_state: data?.length ? "observed" : "insufficient_evidence" });
  } catch (error) {
    console.error("iris/outcomes error:", error);
    return res.status(500).json({ error: "Unable to read observed outcome evidence." });
  }
});
