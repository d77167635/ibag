import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { executeIrisRun } from "../intelligence/irisExecution.js";
import { executeIndependentCapabilities } from "../intelligence/independentCapabilityExecution.js";

export const irisExecutionRouter = Router();

irisExecutionRouter.post("/iris/runs", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const requestedCapabilities: string[] | undefined = Array.isArray(req.body?.requested_capabilities)
      ? req.body.requested_capabilities.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
      : undefined;

    const request = {
      userId: req.userId!,
      requestId: typeof req.body?.request_id === "string" ? req.body.request_id : undefined,
      surface: typeof req.body?.surface === "string" ? req.body.surface : "iris",
      mode: typeof req.body?.mode === "string" ? req.body.mode : "full_intelligence",
      requestedCapabilities,
    };

    const hasIndependentCapability = requestedCapabilities?.some(
      (capability: string) => capability !== "iris.full_intelligence",
    ) ?? false;
    const run = hasIndependentCapability
      ? await executeIndependentCapabilities({ ...request, requestedCapabilities: requestedCapabilities! })
      : await executeIrisRun(request);

    res.status(run.status === "CERTIFIED" ? 200 : run.status === "FAILED" || run.status === "VALIDATION_FAILED" ? 422 : 202).json(run);
  } catch (error) {
    console.error("Iris run failed", error);
    res.status(500).json({ error: "Iris run could not be completed" });
  }
});
