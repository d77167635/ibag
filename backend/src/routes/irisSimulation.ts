import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getCanonicalTransactions } from "../intelligence/transactionSemantics.js";
import { assertSimulationIntegrity, simulateTransactions, type SimulationRequest } from "../intelligence/simulationEngine.js";

export const irisSimulationRouter = Router();

irisSimulationRouter.post("/iris/simulate", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = (req.body ?? {}) as Partial<SimulationRequest>;
    const allowed = new Set(["roundup", "spending_reduction", "income_change", "budget_change", "custom_cashflow"]);
    if (typeof body.kind !== "string" || !allowed.has(body.kind)) {
      return res.status(400).json({ error: "A supported Iris simulation kind is required." });
    }
    const transactions = await getCanonicalTransactions(req.userId!);
    const result = simulateTransactions(transactions, {
      kind: body.kind as SimulationRequest["kind"],
      label: typeof body.label === "string" ? body.label.slice(0, 160) : undefined,
      percent: typeof body.percent === "number" ? body.percent : undefined,
      amount: typeof body.amount === "number" ? body.amount : undefined,
      days: typeof body.days === "number" ? Math.max(1, Math.min(3650, Math.round(body.days))) : undefined,
    });
    assertSimulationIntegrity(result);
    return res.json(result);
  } catch (error) {
    console.error("iris/simulate error:", error);
    return res.status(500).json({ error: "Unable to construct Iris simulation from current evidence." });
  }
});
