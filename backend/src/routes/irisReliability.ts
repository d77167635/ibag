import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";
import { assessReliability } from "../intelligence/reliability.js";

export const irisReliabilityRouter = Router();

irisReliabilityRouter.get("/dashboard/intelligence/reliability", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const full = await computeFullIntelligence(req.userId!);
    res.json(assessReliability(full.evidence_graph));
  } catch (err) {
    console.error("dashboard/intelligence/reliability error:", err);
    res.status(500).json({ error: "Failed to assess Iris intelligence reliability" });
  }
});
