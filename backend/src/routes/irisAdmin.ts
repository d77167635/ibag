import { Router } from "express";
import { requireAuth, requireIrisAdmin, type AuthedRequest } from "../middleware/auth.js";
import { buildIrisGovernorPolicy } from "../intelligence/irisGovernor.js";
import { computeFullIntelligence } from "../intelligence/orchestrator.js";

export const irisAdminRouter = Router();

irisAdminRouter.use(requireAuth, requireIrisAdmin);

/** Private control-plane status. No customer financial data is exposed here. */
irisAdminRouter.get("/iris/admin/status", async (req: AuthedRequest, res) => {
  try {
    const intelligence = await computeFullIntelligence(req.userId!);
    const governor = intelligence?.iris_governor ?? null;
    res.json({
      admin: true,
      user_id: req.userId,
      governor_policy: buildIrisGovernorPolicy(),
      governor,
      production_promotion_requires_admin: true,
      money_movement_capability: false,
      fabricated_financial_data: false,
    });
  } catch (error) {
    console.error("Iris admin status failed", error);
    res.status(500).json({ error: "Iris admin status unavailable" });
  }
});
