import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getCanonicalTransactions } from "../intelligence/transactionSemantics.js";
import { buildDecisionLab, type DecisionLabRequest } from "../intelligence/decisionLab.js";

export const irisDecisionLabRouter = Router();

irisDecisionLabRouter.post("/iris/decision-lab", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = (req.body ?? {}) as Partial<DecisionLabRequest>;
    const transactions = await getCanonicalTransactions(req.userId!);
    const result = buildDecisionLab(transactions, {
      question: typeof body.question === "string" ? body.question : undefined,
      amount: typeof body.amount === "number" ? body.amount : undefined,
      horizon_days: typeof body.horizon_days === "number" ? body.horizon_days : undefined,
    });
    return res.json(result);
  } catch (error) {
    console.error("iris/decision-lab error:", error);
    return res.status(500).json({ error: "Unable to construct Decision Lab analysis from current evidence." });
  }
});
