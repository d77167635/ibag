import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase.js";

export interface AuthedRequest extends Request {
  userId?: string;
  authUser?: { id: string; app_metadata?: Record<string, unknown> };
}

// Expects `Authorization: Bearer <supabase_access_token>` from the frontend.
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
  req.authUser = { id: data.user.id, app_metadata: (data.user.app_metadata ?? {}) as Record<string, unknown> };
  next();
}

/**
 * Admin Iris is a separate authorization boundary. A normal authenticated
 * session is never sufficient. The grant must be explicitly present in
 * Supabase Auth app_metadata and is therefore enforced server-side.
 */
export function requireIrisAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const metadata = req.authUser?.app_metadata ?? {};
  const roles = Array.isArray(metadata.roles) ? metadata.roles.map(String) : [];
  const isAdmin = metadata.iris_admin === true || metadata.role === "admin" || roles.includes("admin");
  if (!isAdmin) {
    console.warn(`Iris admin rejected for user ${req.userId ?? "unknown"} on ${req.method} ${req.path}`);
    return res.status(403).json({ error: "Iris admin access required" });
  }
  next();
}
