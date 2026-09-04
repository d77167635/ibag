import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { searchPlaidKnowledge } from "../services/plaidKnowledge.js";

export const irisPlaidKnowledgeRouter = Router();

irisPlaidKnowledgeRouter.post("/iris/plaid-knowledge", requireAuth, async (req: AuthedRequest, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) return res.status(400).json({ error: "Question is required" });
  if (question.length > 2000) return res.status(400).json({ error: "Question is too long" });
  try {
    const records = await searchPlaidKnowledge(question);
    res.json({ source: "official_public_plaid", educational: true, read_only: true, records });
  } catch (error) {
    console.error("Iris Plaid knowledge lookup failed", error);
    res.status(500).json({ error: "Unable to retrieve Plaid knowledge" });
  }
});
