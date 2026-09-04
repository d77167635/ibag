import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

export const goalsRouter = Router();

const OBJECTIVES = new Set([
  "stabilize_liquidity",
  "improve_cash_flow",
  "reduce_pressure",
  "build_roundups",
  "understand_finances",
]);

function normalizeConstraints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean))].slice(0, 50);
}

function normalizePreferences(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50));
}

goalsRouter.get("/goals", requireAuth, async (req: AuthedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("iris_user_goals")
    .select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, source, constraints, preferences, created_at, updated_at")
    .eq("user_id", req.userId!)
    .order("active", { ascending: false })
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ goals: data ?? [] });
});

goalsRouter.post("/goals", requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const objective = typeof body.objective === "string" ? body.objective : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!OBJECTIVES.has(objective)) return res.status(400).json({ error: "Invalid goal objective" });
  if (!title || title.length > 160) return res.status(400).json({ error: "A goal title between 1 and 160 characters is required" });
  const priority = Number.isInteger(body.priority) ? body.priority : 3;
  if (priority < 1 || priority > 5) return res.status(400).json({ error: "priority must be between 1 and 5" });
  const horizonDays = body.horizon_days == null ? null : Number(body.horizon_days);
  if (horizonDays != null && (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 3650)) return res.status(400).json({ error: "horizon_days must be between 1 and 3650" });
  const targetAmount = body.target_amount_cents == null ? null : Number(body.target_amount_cents);
  if (targetAmount != null && (!Number.isSafeInteger(targetAmount) || targetAmount < 0)) return res.status(400).json({ error: "target_amount_cents must be a non-negative safe integer" });
  const { data, error } = await supabaseAdmin.from("iris_user_goals").insert({
    user_id: req.userId!, objective, title, description: typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null,
    priority, horizon_days: horizonDays, target_amount_cents: targetAmount,
    target_date: typeof body.target_date === "string" ? body.target_date : null,
    active: body.active !== false, constraints: normalizeConstraints(body.constraints), preferences: normalizePreferences(body.preferences),
  }).select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, source, constraints, preferences, created_at, updated_at").single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ goal: data });
});

goalsRouter.patch("/goals/:goalId", requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (body.objective !== undefined) {
    if (typeof body.objective !== "string" || !OBJECTIVES.has(body.objective)) return res.status(400).json({ error: "Invalid goal objective" });
    update.objective = body.objective;
  }
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 160) return res.status(400).json({ error: "Invalid goal title" });
    update.title = body.title.trim();
  }
  if (body.description !== undefined) update.description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null;
  if (body.priority !== undefined) { if (!Number.isInteger(body.priority) || body.priority < 1 || body.priority > 5) return res.status(400).json({ error: "priority must be between 1 and 5" }); update.priority = body.priority; }
  if (body.horizon_days !== undefined) { const n = body.horizon_days == null ? null : Number(body.horizon_days); if (n != null && (!Number.isInteger(n) || n < 1 || n > 3650)) return res.status(400).json({ error: "Invalid horizon_days" }); update.horizon_days = n; }
  if (body.target_amount_cents !== undefined) { const n = body.target_amount_cents == null ? null : Number(body.target_amount_cents); if (n != null && (!Number.isSafeInteger(n) || n < 0)) return res.status(400).json({ error: "Invalid target_amount_cents" }); update.target_amount_cents = n; }
  if (body.target_date !== undefined) update.target_date = body.target_date || null;
  if (body.active !== undefined) { if (typeof body.active !== "boolean") return res.status(400).json({ error: "active must be boolean" }); update.active = body.active; }
  if (body.constraints !== undefined) update.constraints = normalizeConstraints(body.constraints);
  if (body.preferences !== undefined) update.preferences = normalizePreferences(body.preferences);
  if (!Object.keys(update).length) return res.status(400).json({ error: "No supported fields supplied" });
  const { data, error } = await supabaseAdmin.from("iris_user_goals").update(update).eq("id", req.params.goalId).eq("user_id", req.userId!).select("id, objective, title, description, priority, horizon_days, target_amount_cents, target_date, active, source, constraints, preferences, created_at, updated_at").single();
  if (error || !data) return res.status(404).json({ error: "Goal not found" });
  res.json({ goal: data });
});

goalsRouter.delete("/goals/:goalId", requireAuth, async (req: AuthedRequest, res) => {
  const { error } = await supabaseAdmin.from("iris_user_goals").delete().eq("id", req.params.goalId).eq("user_id", req.userId!);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});
