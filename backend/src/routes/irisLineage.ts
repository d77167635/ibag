import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { buildIrisReportDependencyGraph } from "../intelligence/irisReportDependencyGraph.js";
import { resolveIrisEvidenceReverseLineage } from "../intelligence/irisReverseLineage.js";

export const irisLineageRouter = Router();

/** Exact reverse traversal for one evidence record within one governed run/execution boundary. */
irisLineageRouter.get("/iris/lineage/evidence/:evidenceId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const evidenceId = typeof req.params.evidenceId === "string" ? req.params.evidenceId.trim() : "";
    const runId = typeof req.query.run_id === "string" ? req.query.run_id.trim() : "";
    const executionId = typeof req.query.execution_id === "string" ? req.query.execution_id.trim() : "";
    if (!evidenceId || !runId || !executionId) return res.status(400).json({ error: "evidence_id, run_id, and execution_id are required for exact reverse lineage." });

    const dependencies = buildIrisReportDependencyGraph();
    const result = await resolveIrisEvidenceReverseLineage({ userId: req.userId!, runId, executionId, evidenceId, dependencies });
    return res.json({ ...result, traversal: "evidence -> intelligence -> transformation_edges -> affected_intelligence -> report", catalog_metadata_is_not_evidence: true });
  } catch (error) {
    console.error("iris/lineage/evidence error:", error);
    return res.status(500).json({ error: "Unable to resolve exact Iris evidence reverse lineage" });
  }
});
