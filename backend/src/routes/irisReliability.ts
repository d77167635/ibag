import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";
import { assessReliability } from "../intelligence/reliability.js";

export const irisReliabilityRouter = Router();

irisReliabilityRouter.get("/dashboard/intelligence/reliability", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const run = await executeIrisRun({
      userId: req.userId!,
      requestId: typeof req.header("x-iris-request-id") === "string" ? req.header("x-iris-request-id")! : undefined,
      surface: "iris_reliability",
      mode: "full_intelligence",
    });
    const full = run.result;
    if (!full) return res.status(503).json({ error: "Iris intelligence is temporarily unavailable", certified: false, run_id: run.id ?? null });
    res.json({
      run_id: run.id ?? null,
      execution_id: run.execution_id ?? null,
      certified: run.certified === true,
      certification_gate: run.certification_gate ?? null,
      reliability: assessReliability(full.evidence_graph),
    });
  } catch (err) {
    console.error("dashboard/intelligence/reliability error:", err);
    res.status(500).json({ error: "Failed to assess Iris intelligence reliability" });
  }
});
