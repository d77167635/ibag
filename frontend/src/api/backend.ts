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

let intelligenceInFlight: Promise<any> | null = null;

function getCanonicalIntelligence() {
  if (!intelligenceInFlight) {
    intelligenceInFlight = authedFetch("/dashboard/intelligence").finally(() => {
      intelligenceInFlight = null;
    });
  }
  return intelligenceInFlight;
}

export const api = {
  createLinkToken: () => authedFetch("/link/token", { method: "POST" }),
  exchangePublicToken: (publicToken: string) => authedFetch("/link/exchange", { method: "POST", body: JSON.stringify({ public_token: publicToken }) }),
  getOverview: () => authedFetch("/dashboard/overview"),
  getIntelligence: getCanonicalIntelligence,
  askIris: (question: string, context?: Record<string, unknown>) => authedFetch("/iris/ask", { method: "POST", body: JSON.stringify({ question, context }) }),
  resync: () => authedFetch("/link/resync", { method: "POST" }),
  getHierarchy: () => authedFetch("/dashboard/hierarchy"),
  getRoundups: () => authedFetch("/dashboard/roundups"),
  previewTransfer: (accountId: string, amount: number) => authedFetch("/dashboard/roundups/preview-transfer", { method: "POST", body: JSON.stringify({ account_id: accountId, amount }) }),
  getFeatures: () => authedFetch("/features"),
  toggleFeature: (key: string, enabled: boolean) => authedFetch(`/features/${key}/toggle`, { method: "POST", body: JSON.stringify({ enabled })),
  getPlaidProducts: () => authedFetch("/dashboard/plaid"),
  getPlaidSurface: () => authedFetch("/dashboard/plaid/surface"),
  getPlaidSelection: () => authedFetch("/dashboard/plaid/selection"),
  runScenario: (type: string, amount: number) => authedFetch("/dashboard/scenario", { method: "POST", body: JSON.stringify({ type, amount })),
  toggleAccountRoundup: (accountId: string, enabled: boolean) => authedFetch(`/dashboard/accounts/${accountId}/roundup-toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
  getGoals: () => authedFetch("/goals"),
  createGoal: (goal: Record<string, unknown>) => authedFetch("/goals", { method: "POST", body: JSON.stringify(goal) }),
  updateGoal: (goalId: string, goal: Record<string, unknown>) => authedFetch(`/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(goal) }),
  deleteGoal: (goalId: string) => authedFetch(`/goals/${goalId}`, { method: "DELETE" }),
};