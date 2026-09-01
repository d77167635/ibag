import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

// Expects `Authorization: Bearer <supabase_access_token>` from the frontend,
// where the token comes from Supabase Auth (supabase.auth.getSession()).
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn(`auth rejected: no bearer token on ${req.method} ${req.path}`);
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    console.warn(`auth rejected: invalid/expired token on ${req.method} ${req.path} — ${error?.message}`);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = data.user.id;
  next();
}
