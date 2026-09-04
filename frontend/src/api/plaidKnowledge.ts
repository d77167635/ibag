import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export async function getPlaidKnowledge() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${BASE_URL}/dashboard/plaid/knowledge`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
