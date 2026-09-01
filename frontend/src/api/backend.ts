import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${resp.status}`);
  }

  return resp.json();
}

export const api = {
  createLinkToken: () => authedFetch("/link/token", { method: "POST" }),
  exchangePublicToken: (publicToken: string) =>
    authedFetch("/link/exchange", {
      method: "POST",
      body: JSON.stringify({ public_token: publicToken }),
    }),
  getOverview: () => authedFetch("/dashboard/overview"),
  getIntelligence: () => authedFetch("/dashboard/intelligence"),
  resync: () => authedFetch("/link/resync", { method: "POST" }),
  getHierarchy: () => authedFetch("/dashboard/hierarchy"),
  getRoundups: () => authedFetch("/dashboard/roundups"),
  previewTransfer: (accountId: string, amount: number) =>
    authedFetch("/dashboard/roundups/preview-transfer", {
      method: "POST",
      body: JSON.stringify({ account_id: accountId, amount }),
    }),
};
