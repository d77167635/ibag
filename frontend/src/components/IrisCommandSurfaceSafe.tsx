import { useEffect, useState } from "react";
import { api } from "../api/backend";

type Props = { page?: string; go?: (page: string) => void };

const tiers = [
  ["iris", "01", "Command", "What Iris sees now, prioritized."],
  ["iris/state", "02", "Financial State", "Liquidity, debt, accounts and current position."],
  ["iris/cash-flow", "03", "Cash Flow", "Inflows, outflows, safety and forward pressure."],
  ["iris/spending", "04", "Spending", "Domains, categories, changes and anomalies."],
  ["iris/roundups", "05", "iBag", "Round-Up opportunity and evidence-bounded projection."],
  ["iris/evidence", "06", "Evidence", "Provider lineage, fidelity, boundaries and uncertainty."],
  ["iris/intelligence", "07", "Intelligence", "Analytical intelligence operating on observed evidence."],
  ["iris/behavior", "08", "Behavior", "Patterns, recurrence, drift and temporal signals."],
  ["iris/reasoning", "09", "Reasoning", "Relationships, causes and investigations."],
  ["iris/decisions", "10", "Decisions", "Alternatives, consequences, goals and optimization."],
  ["iris/simulation", "11", "Simulation", "Scenarios and counterfactual calculations."],
  ["iris/maximum", "12", "Maximum Intelligence", "Synthesis, validation, learning and adaptation."],
] as const;

const money = (n: any) => { const v = Number(n); return n == null || !Number.isFinite(v) ? "—" : `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
const count = (v: any) => Array.isArray(v) ? v.length : v == null ? "—" : typeof v === "object" ? Object.keys(v).length : String(v);
const label = (s: any) => String(s ?? "—").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

function Evidence({ value }: { value?: string }) { const v = value ?? "insufficient_evidence"; return <span className={`iris4-evidence ${v}`}>{({ observed: "Observed", calculated: "Calculated", inferred: "Iris inference", limited: "Limited evidence", insufficient_evidence: "Insufficient evidence" } as any)[v] ?? label(v)}</span>; }

export function IrisCommandSurfaceSafe({ page = "iris", go }: Props) {
  const [overview, setOverview] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(null);
    void (async () => {
      try {
        const overviewResult = await api.getOverview();
        if (!live) return;
        setOverview(overviewResult);
        setLoading(false);
        if (!overviewResult?.accounts?.length) return;
        setIntelLoading(true);
        try { const summary = await api.getIrisSummary(); if (live) setIntel(summary); }
        catch (e) { if (live) setError(e instanceof Error ? e.message : "Iris intelligence is temporarily unavailable"); }
        finally { if (live) setIntelLoading(false); }
      } catch (e) {
        if (live) { setError(e instanceof Error ? e.message : "Iris could not load observed financial data"); setLoading(false); }
      }
    })();
    return () => { live = false; };
  }, []);

  if (loading) return <main className="iris4-screen"><div className="iris4-empty"><span>IRIS</span><strong>Reading the evidence boundary…</strong><p>Loading the observed financial state.</p></div></main>;
  if (error && !overview) return <main className="iris4-screen"><div className="iris4-empty"><strong>Iris could not load.</strong><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></div></main>;
  if (!overview?.accounts?.length) return <main className="iris4-screen"><div className="iris4-empty"><span>IRIS</span><strong>No observed financial accounts yet.</strong><p>Connect an account through the Plaid connection flow before Iris presents financial intelligence.</p><button onClick={() => window.location.hash = "workspace/plaid"}>Open Connections →</button></div></main>;

  const tier = tiers.find(t => t[0] === page) ?? tiers[0];
  return <main className="iris4-screen">
    <header className="iris4-hero"><div><span>IRIS · TIER {tier[1]}</span><h1>{tier[2]}</h1><p>{tier[3]}</p></div><div className="iris4-status"><b>Evidence</b> {intel?.intelligence_gate?.status ?? "loading"}<i/><b>Higher-order</b> {intel?.intelligence_gate?.higher_order_conclusions_enabled ? "enabled" : "evidence-gated"}<i/><b>Updated</b> {intel?.generated_at ? new Date(intel.generated_at).toLocaleTimeString() : intelLoading ? "computing…" : "—"}</div></header>
    <div className="iris4-layout"><nav className="iris4-nav">{tiers.map(t => <button key={t[0]} className={tier[0] === t[0] ? "active" : ""} onClick={() => go?.(t[0])}><small>{t[1]}</small><strong>{t[2]}</strong><span>{t[3]}</span></button>)}</nav><section className="iris4-body">{page === "iris" ? <Command intel={intel} overview={overview} intelLoading={intelLoading} error={error}/> : <Tier page={page} intel={intel} overview={overview} intelLoading={intelLoading}/>}</section></div>
  </main>;
}

function Card({ title, value, note, evidence }: { title: string; value: any; note?: string; evidence?: string }) { return <article className="iris-surface-card"><span>{title}</span><strong>{value ?? "—"}</strong>{note && <small>{note}</small>}{evidence && <Evidence value={evidence}/>}</article>; }

function Command({ intel, overview, intelLoading, error }: { intel: any; overview: any; intelLoading: boolean; error: string | null }) {
  const c = intel?.cash_flow, s = intel?.cash_flow_safety, d = intel?.debt_health, r = intel?.roundup_projection;
  return <>
    <section className="iris-surface"><span className="eyebrow">LIVE READOUT</span><h2>What matters now</h2><p>Iris separates provider observations from calculations and inference. Nothing is promoted beyond its evidence state.</p>{intel?.narrative && <div className="iris-readout">{intel.narrative}</div>}{error && <div className="iris-readout">{error}</div>}
      <div className="iris-metric-grid"><Card title="Liquid position" value={money(intel?.net_worth?.liquid_assets)} evidence="calculated"/><Card title="Safe to spend" value={money(s?.safeToSpend)} note="Calculated; not a promise" evidence="calculated"/><Card title="Cash flow" value={money(c?.net)} note="Current observation window" evidence="calculated"/><Card title="Revolving debt" value={money(d?.revolving_debt)} evidence={d?.revolving_debt == null ? "insufficient_evidence" : "calculated"}/><Card title="Round-Up opportunity" value={money(r?.total)} note="Eligible observed purchases" evidence="calculated"/><Card title="Accounts" value={count(overview?.accounts)} note="Provider observations" evidence="observed"/></div>
    </section>
    <section className="iris-surface"><div className="iris-section-head"><span>INTELLIGENCE STATUS</span><Evidence value={intel ? "calculated" : "insufficient_evidence"}/></div><h2>{intelLoading ? "Computing certified intelligence…" : "Evidence-gated intelligence"}</h2><p>{intelLoading ? "The financial state is available now. Deeper intelligence is being computed separately so the Iris interface never blocks indefinitely." : "Iris only presents conclusions supported by the available evidence boundary."}</p></section>
  </>;
}

function Tier({ page, intel, overview, intelLoading }: { page: string; intel: any; overview: any; intelLoading: boolean }) {
  const rows: Record<string, [string, [string, any][]]> = {
    "iris/state": ["Financial State", [["Liquid assets", money(intel?.net_worth?.liquid_assets)], ["Revolving debt", money(intel?.debt_health?.revolving_debt)], ["Credit utilization", intel?.debt_health?.credit_utilization == null ? "—" : `${(intel.debt_health.credit_utilization * 100).toFixed(0)}%`], ["Accounts", count(overview?.accounts)]]],
    "iris/cash-flow": ["Cash Flow", [["Inflows", money(intel?.cash_flow?.inflow)], ["Outflows", money(intel?.cash_flow?.outflow)], ["Net flow", money(intel?.cash_flow?.net)], ["Safe to spend", money(intel?.cash_flow_safety?.safeToSpend)]]],
    "iris/spending": ["Spending", [["Domains", count(intel?.spending_by_domain)], ["Category drift", count(intel?.category_drift)], ["Anomalies", count(intel?.anomalies)]]],
    "iris/roundups": ["iBag", [["Current opportunity", money(intel?.roundup_projection?.total)], ["Projected opportunity", money(intel?.roundup_projection?.projectedAmount ?? intel?.roundup_projection?.projectedTotal)], ["Eligible purchases", count(intel?.roundup_projection?.eligibleTransactionCount)]]],
    "iris/evidence": ["Evidence", [["Gate", label(intel?.intelligence_gate?.status)], ["Source fidelity", label(intel?.source_fidelity?.status ?? intel?.source_fidelity?.state)], ["Provider lineage", count(intel?.provider_lineage)], ["Uncertainty", count(intel?.uncertainty)]]],
    "iris/intelligence": ["Intelligence", [["Atlas definitions", count(intel?.intelligence_atlas?.definitions)], ["Findings", count(intel?.higher_order_synthesis?.findings)]]],
    "iris/behavior": ["Behavior", [["Category changes", count(intel?.category_drift)], ["Anomalies", count(intel?.anomalies)]]],
    "iris/reasoning": ["Reasoning", [["Reasoning", count(intel?.reasoning)], ["Investigations", count(intel?.investigations)]]],
    "iris/decisions": ["Decisions", [["Decision intelligence", count(intel?.decision_intelligence)], ["Alternatives", count(intel?.decision_graph)]]],
    "iris/simulation": ["Simulation", [["Counterfactual intelligence", count(intel?.counterfactual_intelligence)]]],
    "iris/maximum": ["Maximum Intelligence", [["Meta intelligence", count(intel?.meta_intelligence)], ["Higher-order synthesis", count(intel?.higher_order_synthesis)]]],
  };
  const d = rows[page] ?? ["Iris", []];
  return <><section className="iris-surface"><span className="eyebrow">TIER</span><h2>{d[0]}</h2><p>{intelLoading ? "Financial evidence is available; deeper intelligence is still computing." : "Live output from the Iris intelligence engine. Empty or unsupported fields remain bounded rather than invented."}</p><div className="iris-metric-grid">{d[1].map(x => <Card key={x[0]} title={x[0]} value={x[1]}/>)}</div></section><section className="iris-surface"><div className="iris-section-head"><span>OBSERVATION BOUNDARY</span><Evidence value={intel?.intelligence_gate?.higher_order_conclusions_enabled ? "inferred" : "insufficient_evidence"}/></div><p>Observed provider data supports calculations only within the evidence boundary. Hypothetical simulations never change provider or account state.</p></section></>;
}
