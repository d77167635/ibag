import type { IrisProviderEvidence } from "./providerEvidence.js";

function money(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "not available";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Answers narrow source questions from provider evidence only; no provider facts are inferred or rewritten. */
export function answerProviderQuestion(question: string, evidence: IrisProviderEvidence): string | null {
  const q = question.toLowerCase();
  const accounts = evidence.accounts as any[];
  const institutions = evidence.institutions as any[];
  const transactions = evidence.transactions as any[];
  const products = evidence.product_observations as any[];

  if (/how many|number of|count/.test(q) && /account/.test(q)) {
    return `Iris found ${accounts.length} connected account record${accounts.length === 1 ? "" : "s"} in the current provider evidence snapshot.`;
  }
  if (/how many|number of|count/.test(q) && /institution|bank|connection/.test(q)) {
    return `Iris found ${institutions.length} connected institution record${institutions.length === 1 ? "" : "s"} in the current provider evidence snapshot.`;
  }
  if (/how many|number of|count/.test(q) && /transaction/.test(q)) {
    return `The current provider evidence snapshot contains ${transactions.length} active transaction record${transactions.length === 1 ? "" : "s"} in the retrieved window.`;
  }
  if (/balance|available/.test(q) && /account|cash|money/.test(q)) {
    const matches = accounts.filter((a) => q.includes(String(a.name ?? "").toLowerCase()) || (a.mask && q.includes(String(a.mask))));
    const rows = (matches.length ? matches : accounts).slice(0, 8).map((a) => `${a.name ?? "Account"}: current balance ${money(a.current_balance)}, available ${money(a.available_balance)}`);
    if (rows.length) return `Plaid account balances currently supplied to iBag: ${rows.join("; ")}. These are provider values, not Iris calculations.`;
  }
  if (/which|what|show|list/.test(q) && /product|plaid/.test(q)) {
    const rows = products.slice(0, 20).map((p) => `${p.product}: ${p.lifecycle_state ?? p.evidence_state ?? "state unavailable"}`);
    if (rows.length) return `Current Plaid product observations: ${rows.join("; ")}. Lifecycle state is kept separate from actual domain observation.`;
  }
  if (/transaction|merchant|purchase/.test(q) && transactions.length) {
    const rows = transactions.slice(0, 8).map((t) => `${t.posted_date ?? "date unavailable"} — ${t.merchant_name ?? "merchant unavailable"} — ${money(t.amount)}`);
    return `The retrieved provider transaction evidence includes: ${rows.join("; ")}. Ask Iris for a narrower merchant, account, date, or transaction question for a more targeted retrieval.`;
  }
  return null;
}
