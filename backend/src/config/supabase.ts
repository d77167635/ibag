import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Service-role client: bypasses RLS. Only ever used server-side, and every
// query in this codebase must filter by user_id explicitly since RLS isn't
// enforcing it here — the DB-level RLS policies are the second layer of
// defense for requests that come through the anon/authenticated key
// (e.g. if the frontend ever queries Supabase directly for read paths).
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
