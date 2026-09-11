import { useCallback, useEffect, useState } from "react";
import { api } from "../api/backend";
import "./IrisFinancialLifeJourney.css";

type Props = { go?: (page: string) => void };
type Overview = { accounts?: any[]; recent_transactions?: any[] };
type Surface = { products?: any[]; provider_evidence_counts?: Record<string, number> };
const DOMAINS = ["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments"] as const;
const money = (v: unknown) => { if (v == null || v === "") return "—"; const n = Number(v); return Number.isFinite(n) ? `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"; };
const status = (v: unknown) => String(v ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const date = (v: unknown) => { if (!v) return "Date unavailable"; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };

const stages = [
  ["01", "Life", "Your Financial Life", "Start with the reality IRIS can actually observe.", "iris"],
  ["02", "Change", "What Changed", "Find supported movement, recurrence, patterns and signals.", "iris/behavior"],
  ["03", "Understand", "Why It Matters", "Explore relationships and bounded explanations.", "iris/reasoning"],
  ["04", "Verify", "Evidence", "Trace observations, provenance, lineage and limitations.", "iris/evidence"],
  ["05", "Explore", "Reports & Analytics", "Browse the expanding library of products IRIS can publish.", "iris/catalog"],
  ["06", "Consider", "Scenarios", "Explore explicitly hypothetical possibilities without confusing them with facts.", "iris/simulation"],
  ["07", "Decide", "Decisions", "Compare supported choices and tradeoffs.", "iris/decisions"],
  ["08", "Act", "Action", "Review action-oriented results without implying money movement or completed execution.", "iris/action"],
  ["09", "Learn", "Outcomes", "Return to what actually happened and what can be learned.", "iris/outcomes"],
] as const;

export function IrisFinancialLifeJourney({ go }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [surface, setSurface] = useState<Surface | null>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const results = await Promise.allSettled([api.getOverview(), api.getPlaidSurface(), api.getIntelligence()]);
    if (results[0].status === "fulfilled") setOverview(results[0].value); else setError(results[0].reason instanceof Error ? results[0].reason.message : "Unable to load your financial life.");
    if (results[1].status === "fulfilled") setSurface(results[1].value);
    if (results[2].status === "fulfilled") setIntelligence(results[2].value);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const accounts = overview?.accounts ?? [];
  const transactions = overview?.recent_transactions ?? [];
  const liquidAccounts = accounts.filter((a: any) => a.type === "depository" && a.current_balance != null);
  const creditAccounts = accounts.filter((a: any) => a.type === "credit" && a.current_balance != null);
  const liquid = liquidAccounts.length ? liquidAccounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0) : null;
  const debt = creditAccounts.length ? creditAccounts.reduce((s: number, a: any) => s + Number(a.current_balance), 0) : null;
  const observed = DOMAINS.filter(d => (surface?.products ?? []).some((p: any) => (p.key === d || p.product === d) && p.status === "observed")).length;
  const certified = intelligence?.certified === true;

  return <main className="ifl-shell">
    <section className="ifl-hero"><div><span className="ifl-kicker">IRIS · FINANCIAL LIFE / RESULTS · PRIORITY 1</span><h1>Your financial life is the starting point.</h1><p>IRIS does not begin with a dashboard of guesses. It begins with the financial reality actually observed from your connected institutions, then lets you move through understanding, evidence, reports, scenarios, decisions, actions and outcomes.</p>{error && <div className="ifl-alert"><strong>Financial Life is constrained</strong><span>{error}</span></div>}<div className="ifl-actions"><button className="ifl-primary" onClick={() => go?.("iris/connect")}>Connect evidence</button><button onClick={() => go?.("iris/catalog")}>Explore all reports</button><button onClick={() => go?.("iris/evidence")}>Verify what IRIS knows</button></div></div><aside className="ifl-state"><span className="ifl-kicker">CURRENT STATE</span><strong>{loading ? "Reading your financial life…" : certified ? "Evidence-qualified intelligence available" : "Observed financial life · intelligence remains evidence-gated"}</strong><div><span>Accounts</span><b>{accounts.length || "—"}</b></div><div><span>Recent activity</span><b>{transactions.length || "—"}</b></div><div><span>Runtime domains</span><b>{observed}/{DOMAINS.length}</b></div><div><span>Statements</span><b>Deferred</b></div></aside></section>

    <section className="ifl-section"><header><span className="ifl-kicker">THE COMPLETE JOURNEY</span><h2>From seeing your life to learning from it.</h2><p>Every stage is connected. A user can move forward into deeper results or backward from a result to its reasoning and evidence.</p></header><div className="ifl-stage-grid">{stages.map(([number, label, title, description, page]) => <button key={page} className="ifl-stage" onClick={() => go?.(page)}><span>{number} · {label}</span><strong>{title}</strong><small>{description}</small><em>Open →</em></button>)}</div></section>

    <section className="ifl-section"><header><span className="ifl-kicker">OBSERVED REALITY</span><h2>Your actual financial substrate.</h2><p>Only persisted provider observations are displayed here. Missing values remain unknown.</p></header><div className="ifl-metrics"><article><span>LIQUID POSITION</span><strong>{money(liquid)}</strong><small>{liquidAccounts.length ? `${liquidAccounts.length} observed depository account${liquidAccounts.length === 1 ? "" : "s"}` : "No observed depository balance"}</small></article><article><span>REVOLVING DEBT</span><strong>{money(debt)}</strong><small>{creditAccounts.length ? `${creditAccounts.length} observed credit account${creditAccounts.length === 1 ? "" : "s"}` : "No observed revolving-debt balance"}</small></article><article><span>ACCOUNTS</span><strong>{accounts.length || "—"}</strong><small>Persisted for this signed-in user</small></article><article><span>RECENT TRANSACTIONS</span><strong>{transactions.length || "—"}</strong><small>Observed activity returned by the governed surface</small></article></div></section>

    <section className="ifl-section"><header><span className="ifl-kicker">YOUR ACCOUNTS</span><h2>Every connected place in one view.</h2></header>{accounts.length ? <div className="ifl-account-grid">{accounts.map((a: any) => <article key={a.id}><div><strong>{a.name ?? a.official_name ?? "Account"}</strong><span>{a.mask ? `••${a.mask}` : "Account number unavailable"}</span></div><small>{[a.type, a.subtype].filter(Boolean).join(" · ") || "Account type unavailable"}</small><b>{money(a.current_balance)}</b><p>Available {money(a.available_balance)} · {a.balance_updated_at ? `Updated ${date(a.balance_updated_at)}` : "Update time unavailable"}</p></article>)}</div> : <div className="ifl-empty"><strong>No persisted accounts are available.</strong><span>IRIS will not manufacture accounts or substitute example values.</span></div>}</section>

    <section className="ifl-section"><header><span className="ifl-kicker">WHAT ACTUALLY HAPPENED</span><h2>Recent financial activity.</h2><p>Transactions are financial facts before they become intelligence inputs.</p></header>{transactions.length ? <div className="ifl-transactions">{transactions.slice(0, 30).map((t: any) => <article key={t.id}><div><strong>{t.merchants?.canonical_name ?? t.merchant_name ?? "Transaction"}</strong><small>{date(t.posted_date)} · {t.plaid_category_detailed ?? t.plaid_category_primary ?? "Category unavailable"}</small></div><b>{money(t.amount)}</b></article>)}</div> : <div className="ifl-empty"><strong>No current transaction observations are available.</strong><span>IRIS will not create activity to make the experience look complete.</span></div>}</section>

    <section className="ifl-section"><header><span className="ifl-kicker">EVIDENCE BOUNDARY</span><h2>Seven current Sandbox domains. Eight architectural domains.</h2><p>Statements is Domain 8 architecturally, but remains deferred until real banking.</p></header><div className="ifl-domain-grid">{DOMAINS.map(d => { const p = (surface?.products ?? []).find((x: any) => x.key === d || x.product === d); const count = surface?.provider_evidence_counts?.[d]; return <button key={d} onClick={() => go?.("iris/evidence")}><span>{d}</span><strong>{status(p?.status)}</strong><small>{count != null ? `${count} provider observation${count === 1 ? "" : "s"}` : "Observation count unavailable"}</small></button>; })}<button className="deferred" onClick={() => go?.("iris/evidence")}><span>statements</span><strong>Deferred</strong><small>Real banking only</small></button></div></section>

    <section className="ifl-section ifl-products"><header><span className="ifl-kicker">THE MASSIVE USER LIBRARY</span><h2>Reports are the products you receive.</h2><p>The catalog is designed to grow enormously. Products are publications of evidence-qualified intelligence, not a finite list of dashboard widgets.</p></header><div className="ifl-product-path"><article><span>DISCOVER</span><strong>Browse the entire report universe</strong><p>Search and filter report products by family and purpose.</p><button onClick={() => go?.("iris/catalog")}>Open Report Library →</button></article><article><span>TRACE</span><strong>See what powers a report</strong><p>Inspect dependencies, evidence boundaries and runtime lineage when available.</p><button onClick={() => go?.("iris/catalog")}>Inspect Reports →</button></article><article><span>CONTROL</span><strong>Choose what you receive</strong><p>Activate or deactivate report products without deleting evidence or limiting the underlying intelligence.</p><button onClick={() => go?.("iris/catalog")}>Manage Reports →</button></article></div></section>

    <section className="ifl-section ifl-trust"><header><span className="ifl-kicker">IRIS PROMISE</span><h2>The experience can be enormous without becoming dishonest.</h2></header><div className="ifl-rules"><span>No evidence → no factual value.</span><span>Unknown ≠ zero.</span><span>Persistence ≠ semantic proof.</span><span>Prediction ≠ observation.</span><span>Scenario ≠ observation.</span><span>Correlation ≠ causation.</span><span>No money movement in the current phase.</span></div><div className="ifl-actions"><button className="ifl-primary" onClick={() => go?.("iris/catalog")}>Continue into your reports →</button><button onClick={() => go?.("iris/reasoning")}>Understand a result</button><button onClick={() => go?.("iris/intelligence")}>Learn how IRIS thinks</button></div></section>
  </main>;
}
