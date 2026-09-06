import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const DEFAULT_TIMEOUT_MS = 15000;

async function authedFetch(path: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed: ${resp.status}`);
    }
    return resp.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error(`Request timed out: ${path}`);
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

let intelligenceInFlight: Promise<any> | null = null;
function getCanonicalIntelligence() {
  if (!intelligenceInFlight) intelligenceInFlight = authedFetch("/dashboard/intelligence", undefined, 30000).finally(() => { intelligenceInFlight = null; });
  return intelligenceInFlight;
}

export const api = {
  get: (path: string) => authedFetch(path),
  createLinkToken: () => authedFetch("/link/token", { method: "POST" }),
  createUpgradeLinkToken: (itemId: string, stage: "consent" | "assets" | "statements") => authedFetch("/link/upgrade-token", { method: "POST", body: JSON.stringify({ item_id: itemId, stage }) }),
  exchangePublicToken: (publicToken: string) => authedFetch("/link/exchange", { method: "POST", body: JSON.stringify({ public_token: publicToken }), }, 30000),
  getOverview: () => authedFetch("/dashboard/overview", undefined, 20000),
  getIntelligence: getCanonicalIntelligence,
  getIntelligenceValidation: () => authedFetch("/dashboard/intelligence/validation", undefined, 20000),
  getIrisCatalog: () => authedFetch("/iris/catalog"),
  saveIrisCatalogSelection: (capabilityIds: string[]) => authedFetch("/iris/catalog/selection", { method: "PUT", body: JSON.stringify({ capability_ids: capabilityIds }) }),
  askIris: (question: string, context?: Record<string, unknown>) => authedFetch("/iris/ask", { method: "POST", body: JSON.stringify({ question, context }), }, 30000),
  runDecisionLab: (request: { question?: string; amount?: number; horizon_days?: number } = {}) => authedFetch("/iris/decision-lab", { method: "POST", body: JSON.stringify(request) }, 30000),
  resync: () => authedFetch("/link/resync", { method: "POST" }, 30000),
  getHierarchy: () => authedFetch("/dashboard/hierarchy"),
  getRoundups: () => authedFetch("/dashboard/roundups"),
  previewTransfer: (accountId: string, amount: number) => authedFetch("/dashboard/roundups/preview-transfer", { method: "POST", body: JSON.stringify({ account_id: accountId, amount }) }),
  getFeatures: () => authedFetch("/features"),
  toggleFeature: (key: string, enabled: boolean) => authedFetch(`/features/${key}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
  getPlaidProducts: () => authedFetch("/dashboard/plaid"),
  getPlaidSurface: () => authedFetch("/dashboard/plaid/surface"),
  getPlaidCapabilities: () => authedFetch("/dashboard/plaid/capabilities"),
  getPlaidSelection: () => authedFetch("/dashboard/plaid/selection"),
  getSourceTruth: (limit = 200) => authedFetch(`/dashboard/source?limit=${limit}`, undefined, 30000),
  runScenario: (type: string, amount: number) => authedFetch("/dashboard/scenario", { method: "POST", body: JSON.stringify({ type, amount }) }),
  toggleAccountRoundup: (accountId: string, enabled: boolean) => authedFetch(`/dashboard/accounts/${accountId}/roundup-toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
  getGoals: () => authedFetch("/goals"),
  createGoal: (goal: Record<string, unknown>) => authedFetch("/goals", { method: "POST", body: JSON.stringify(goal) }),
  updateGoal: (goalId: string, goal: Record<string, unknown>) => authedFetch(`/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(goal) }),
  deleteGoal: (goalId: string) => authedFetch(`/goals/${goalId}`, { method: "DELETE" }),
};
