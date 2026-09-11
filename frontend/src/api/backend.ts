import { supabase } from "./supabase";
import type { IrisConsumerIntelligenceResponse } from "../contracts/irisConsumer";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

async function authedFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const resp = await fetch(`${BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) } });
  if (!resp.ok) { const body = await resp.json().catch(() => ({})); throw new Error(body.error ?? `Request failed: ${resp.status}`); }
  return resp.json() as Promise<T>;
}

let intelligenceInFlight: Promise<IrisConsumerIntelligenceResponse> | null = null;
function getCanonicalIntelligence(): Promise<IrisConsumerIntelligenceResponse> {
  if (!intelligenceInFlight) intelligenceInFlight = authedFetch<IrisConsumerIntelligenceResponse>("/iris/intelligence").finally(() => { intelligenceInFlight = null; });
  return intelligenceInFlight;
}
function getIrisSummary() { if (!intelligenceInFlight) intelligenceInFlight = authedFetch<IrisConsumerIntelligenceResponse>("/iris/summary").finally(() => { intelligenceInFlight = null; }); return intelligenceInFlight; }

export const api = {
  get: (path: string) => authedFetch(path),
  runIris: (request: { requested_capabilities?: string[]; request_id?: string; surface?: string; mode?: string } = {}) => authedFetch("/iris/runs", { method: "POST", body: JSON.stringify({ requested_capabilities: ["iris.full_intelligence"], surface: "iris", mode: "full_intelligence", ...request }) }),
  createLinkToken: () => authedFetch("/link/token", { method: "POST" }),
  createUpgradeLinkToken: (itemId: string, stage: "consent" | "assets" | "statements") => authedFetch("/link/upgrade-token", { method: "POST", body: JSON.stringify({ item_id: itemId, stage }) }),
  exchangePublicToken: (publicToken: string) => authedFetch("/link/exchange", { method: "POST", body: JSON.stringify({ public_token: publicToken }) }),
  getOverview: () => authedFetch("/dashboard/overview"),
  getUnifiedDashboard: () => authedFetch("/dashboard/unified"),
  getIntelligence: getCanonicalIntelligence,
  getIrisSummary,
  getIrisCatalog: () => authedFetch("/iris/catalog"),
  saveIrisCatalogSelection: (reportIds: string[]) => authedFetch("/iris/catalog/selection", { method: "PUT", body: JSON.stringify({ report_ids: reportIds }) }),
  resetIrisCatalog: () => authedFetch("/iris/catalog/reset", { method: "POST" }),
  askIris: (question: string, context?: Record<string, unknown>) => authedFetch("/iris/ask", { method: "POST", body: JSON.stringify({ question, context }) }),
  runDecisionLab: (request: { question?: string; amount?: number; horizon_days?: number } = {}) => authedFetch("/iris/decision-lab", { method: "POST", body: JSON.stringify(request) }),
  resync: () => authedFetch("/link/resync", { method: "POST" }),
  getHierarchy: () => authedFetch("/dashboard/hierarchy"), getRoundups: () => authedFetch("/dashboard/roundups"),
  previewTransfer: (accountId: string, amount: number) => authedFetch("/dashboard/roundups/preview-transfer", { method: "POST", body: JSON.stringify({ account_id: accountId, amount }) }),
  getFeatures: () => authedFetch("/features"), toggleFeature: (key: string, enabled: boolean) => authedFetch(`/features/${key}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
  getPlaidProducts: () => authedFetch("/dashboard/plaid"), getPlaidSurface: () => authedFetch("/dashboard/plaid/surface"), getPlaidCapabilities: () => authedFetch("/dashboard/plaid/capabilities"), getPlaidSelection: () => authedFetch("/dashboard/plaid/selection"),
  getSourceTruth: (limit = 200) => authedFetch(`/dashboard/source?limit=${limit}`), runScenario: (type: string, amount: number) => authedFetch("/dashboard/scenario", { method: "POST", body: JSON.stringify({ type, amount }) }),
  toggleAccountRoundup: (accountId: string, enabled: boolean) => authedFetch(`/dashboard/accounts/${accountId}/roundup-toggle`, { method: "POST", body: JSON.stringify({ enabled } ) }),
  getGoals: () => authedFetch("/goals"), createGoal: (goal: Record<string, unknown>) => authedFetch("/goals", { method: "POST", body: JSON.stringify(goal) }), updateGoal: (goalId: string, goal: Record<string, unknown>) => authedFetch(`/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(goal) }), deleteGoal: (goalId: string) => authedFetch(`/goals/${goalId}`, { method: "DELETE" }),
};
