import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { selectPlaidProducts } from "../services/plaidProductSelectionV4.js";

export const plaidSelectionRouter = Router();

plaidSelectionRouter.get("/dashboard/plaid/selection", requireAuth, async (req: AuthedRequest, res) => {
  try {
    res.json(await selectPlaidProducts(req.userId!));
  } catch (error) {
    console.error("dashboard/plaid/selection error:", error);
    res.status(500).json({ error: "Unable to evaluate Plaid product selection" });
  }
});
