import { useMemo, useState } from "react";
import "./IrisIntelligenceScreens.css";

type ScreenProps = { page: string; intel: any; go?: (page: string) => void };

type Row = { label: string; value: unknown; state?: string; detail?: string };

const money = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-US") : "—";
const pct = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
const text = (value: unknown) => value == null ? "—" : typeof value === "string" ? value : JSON.stringify(value);
const stateLabel = (state?: string) => ({ observed: "OBSERVED", calculated: "CALCULATED", inferred: "IRIS INFERENCE", limited: "LIMITED", insufficient_evidence: "INSUFFICIENT EVIDENCE" } as Record<string, string>)[state ?? "calculated"] ?? String(state ?? "CALCULATED");

function State({ state = "calculated" }: { state?: string }) { return <span className={`iis-state ${state}`}>{stateLabel(state)}</span>; }
function Metric({ label, value, state = "calculated", note }: { label: string; value: string; state?: string; note?: string }) { return <div className="iis-metric"><span>{label}</span><strong>{value}</strong><State state={state}/>{note && <small>{note}</small>}</div>; }
function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) { return <section className="iis-panel"><header><div><span>IRIS INTELLIGENCE</span><h2>{title}</h2></div>{action}</header>{children}</section>; }
function Rows({ rows, limit = 20 }: { rows: Row[]; limit?: number }) { const [open, setOpen] = useState<number | null>(null); return <div className="iis-rows">{rows.slice(0, limit).map((row, index) => <button key={`${row.label}-${index}`} className="iis-row" onClick={() => setOpen(open === index ? null : index)}><span><b>{row.label}</b><small>{row.detail ?? "Select to inspect this intelligence node."}</small></span><strong>{text(row.value)}</strong><State state={row.state}/>{open === index && <em>{JSON.stringify(row.value, null, 2)}</em>}</button>)}</div>; }
function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="iis-screen"><div className="iis-hero"><span>IRIS · INTELLIGENCE ENVIRONMENT</span><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>; }

const screenMeta: Record<string, [string, string]> = {
  "iris": ["Iris Command", "The intelligence operating environment across your connected financial evidence."],
  "iris/findings": ["Findings", "Evidence-backed risks, opportunities, changes and unresolved questions."],
  "iris/timeline": ["Financial Timeline", "Trace financial state, behavior and intelligence across time."],
  "iris/education": ["Financial Education", "Understand what Iris is seeing, how it is calculated, and what it does not know."],
  "iris/relationships": ["Relationships", "Explore how accounts, transactions, cash flow, debt, behavior and intelligence connect."],
  "iris/causes": ["Causal Analysis", "Inspect hypotheses about what may be driving observed financial changes."],
  "iris/decisions": ["Decision Intelligence", "Compare evidence-backed options, constraints, reversibility and readiness."],
  "iris/scenarios": ["Consequence Lab", "Explore modeled consequences without pretending illustrative scenarios are forecasts or actions."],
  "iris/optimization": ["Optimization", "Inspect multi-objective tradeoffs and the evidence supporting each optimization path."],
  "iris/goals": ["Goal Intelligence", "See declared goals, inferred objectives, conflicts and alignment with financial state."],
  "iris/evidence": ["Evidence Graph", "Trace provider observations through calculations, constraints and Iris conclusions."],
  "iris/uncertainty": ["Uncertainty", "See where evidence is strong, calculated, inferred, limited or insufficient."],
  "iris/reasoning": ["Reasoning Trace", "Inspect the reasoning envelope behind Iris findings and conclusions."],
  "iris/forecast": ["Forward Intelligence", "Inspect forward projections, trajectory and the evidence supporting them."],
  "iris/behavior": ["Behavior Intelligence", "Explore category drift, patterns and observed behavioral change."],
  "iris/liquidity": ["Liquidity Intelligence", "Understand liquid position, safe-to-spend calculations and constraints."],
  "iris/roundups": ["Round-Up Intelligence", "Understand Round-Up opportunities and their relationship to the financial state."],
};

export function IrisIntelligenceScreens({ page, intel, go }: ScreenProps) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const meta = screenMeta[page] ?? screenMeta.iris;
  const state = intel?.financial_state ?? {};
  const graph = intel?.evidence_graph ?? {};
  const uncertainty = intel?.uncertainty ?? {};
  const reasoning = intel?.reasoning ?? {};
  const causal = intel?.causal_analysis ?? {};
  const decisions = intel?.decision_intelligence ?? {};
  const consequence = intel?.consequence_model ?? {};
  const optimization = intel?.optimization_intelligence ?? {};
  const goals = intel?.goal_intelligence ?? {};
  const temporal = intel?.temporal ?? {};
  const behavior = intel?.category_drift ?? {};

  const rows = useMemo<Row[]>(() => {
    if (page === "iris/findings") return [
      ...(reasoning.risks ?? []).map((x: any) => ({ label: "Risk", value: x.statement ?? x, state: "calculated", detail: x.evidence ?? "Reasoning-derived risk finding" })),
      ...(reasoning.opportunities ?? []).map((x: any) => ({ label: "Opportunity", value: x.statement ?? x, state: "calculated", detail: x.evidence ?? "Reasoning-derived opportunity" })),
      ...(reasoning.unknowns ?? []).map((x: any) => ({ label: "Unknown", value: x, state: "insufficient_evidence", detail: "Evidence gap" })),
    ];
    if (page === "iris/evidence") return (graph.nodes ?? []).map((x: any) => ({ label: x.label ?? x.id, value: x.value, state: x.state, detail: `${x.kind ?? "node"} · ${x.source ?? "Iris"}` }));
    if (page === "iris/uncertainty") return (uncertainty.entries ?? uncertainty.nodes ?? []).map((x: any) => ({ label: x.node_id ?? x.label ?? "Intelligence node", value: x.effective_state ?? x.state, state: x.effective_state ?? x.state, detail: (x.limiting_nodes ?? []).join?.(", ") || "Propagation state" }));
    if (page === "iris/causes") return (causal.hypotheses ?? causal.hypothesis ?? []).map((x: any) => ({ label: x.title ?? x.label ?? "Causal hypothesis", value: x.statement ?? x, state: x.evidence_state ?? x.state ?? "inferred", detail: x.evidence ?? "Hypothesis, not established causation" }));
    if (page === "iris/decisions") return (decisions.options ?? []).map((x: any) => ({ label: x.label ?? "Decision option", value: x.rationale ?? x, state: x.evidence_state, detail: `Readiness: ${x.readiness ?? decisions.quality ?? "analysis only"}` }));
    if (page === "iris/scenarios") return (consequence.scenarios ?? []).map((x: any) => ({ label: x.scenario ?? x.name ?? "Scenario", value: x.downstream_effects ?? x.modeled_change ?? x, state: x.evidence_state ?? "calculated", detail: x.status ?? "Illustrative model" }));
    if (page === "iris/optimization") return (optimization.options ?? optimization.recommendations ?? []).map((x: any) => ({ label: x.label ?? x.name ?? "Optimization", value: x, state: x.evidence_state ?? "calculated", detail: x.tradeoffs ?? x.rationale ?? "Multi-objective analysis" }));
    if (page === "iris/goals") return [
      ...(goals.goals ?? goals.activeGoals ?? []).map((x: any) => ({ label: x.title ?? x.objective ?? "Goal", value: x, state: x.evidence_state ?? "calculated", detail: x.source ?? "Goal intelligence" })),
      ...(goals.conflicts ?? []).map((x: any) => ({ label: "Goal conflict", value: x, state: "calculated", detail: "Tradeoff detected" })),
    ];
    if (page === "iris/reasoning") return (reasoning.trace ?? reasoning.steps ?? reasoning.nodes ?? []).map((x: any, n: number) => ({ label: x.title ?? x.label ?? `Reasoning step ${n + 1}`, value: x.statement ?? x, state: x.evidence_state ?? x.state ?? "calculated", detail: x.evidence ?? x.source ?? "Iris reasoning trace" }));
    if (page === "iris/timeline") return (temporal.windows ?? []).map((x: any) => ({ label: `${x.windowDays ?? ""} day window`, value: x.net ?? x, state: "calculated", detail: `Inflow ${money(x.inflow)} · Outflow ${money(x.outflow)}` }));
    if (page === "iris/behavior") return Array.isArray(behavior) ? behavior.map((x: any) => ({ label: x.category ?? x.label ?? "Category", value: x, state: x.state ?? "inferred", detail: x.change ?? "Behavioral drift" })) : Object.entries(behavior ?? {}).map(([k, v]) => ({ label: k, value: v, state: "inferred", detail: "Behavior intelligence" }));
    return [];
  }, [page, reasoning, graph, uncertainty, causal, decisions, consequence, optimization, goals, temporal, behavior]);

  const visibleRows = filter === "all" ? rows : rows.filter((row) => (row.state ?? "calculated") === filter);
  const metrics = {
    liquid: intel?.net_worth?.liquid_assets,
    safe: intel?.cash_flow_safety?.safeToSpend,
    net: intel?.cash_flow?.net,
    utilization: intel?.debt_health?.credit_utilization,
    roundup: intel?.roundup_projection?.projectedAmount ?? intel?.roundup_projection?.projected,
    anomalies: Array.isArray(intel?.anomalies) ? intel.anomalies.length : null,
  };

  if (page === "iris") return <Shell title={meta[0]} subtitle={meta[1]}><div className="iis-metric-grid"><Metric label="Liquid position" value={money(metrics.liquid)} state={metrics.liquid == null ? "insufficient_evidence" : "observed"}/><Metric label="Safe to spend" value={money(metrics.safe)} state={metrics.safe == null ? "insufficient_evidence" : "calculated"}/><Metric label="Net cash flow" value={money(metrics.net)} state={metrics.net == null ? "insufficient_evidence" : "calculated"}/><Metric label="Credit utilization" value={pct(metrics.utilization)} state={metrics.utilization == null ? "insufficient_evidence" : "calculated"}/><Metric label="Round-Up projection" value={money(metrics.roundup)} state={metrics.roundup == null ? "insufficient_evidence" : "calculated"}/><Metric label="Anomalies" value={number(metrics.anomalies)} state={metrics.anomalies == null ? "insufficient_evidence" : "inferred"}/></div><Panel title="Intelligence layers"><div className="iis-layer-grid">{Object.entries({state:"Financial State",causal:"Causal Analysis",decisions:"Decision Intelligence",consequence:"Consequence Modeling",optimization:"Optimization",goals:"Goal Intelligence",graph:"Evidence Graph",uncertainty:"Uncertainty",reasoning:"Reasoning",temporal:"Temporal Intelligence",behavior:"Behavior Intelligence"}).map(([key,label]) => <button key={key} className="iis-layer" onClick={() => setSelected(key)}><b>{label}</b><State state={(intel as any)?.[key] ? "calculated" : "insufficient_evidence"}/><small>{(intel as any)?.[key] ? "Available for inspection" : "No exposed evidence in current contract"}</small></button>)}</div>{selected && <div className="iis-inspector"><b>{selected}</b><pre>{JSON.stringify((intel as any)?.[selected] ?? null, null, 2)}</pre><button onClick={() => setSelected(null)}>Close inspector</button></div>}</Panel><Panel title="Navigate the intelligence environment"><div className="iis-nav-grid">{Object.entries(screenMeta).filter(([id]) => id !== "iris").map(([id,[label,description]]) => <button key={id} onClick={() => go?.(id)}><b>{label}</b><small>{description}</small></button>)}</div></Panel></Shell>;

  const title = meta[0];
  const subtitle = meta[1];
  const isLiquidity = page === "iris/liquidity";
  const isForecast = page === "iris/forecast";
  const isRoundups = page === "iris/roundups";
  return <Shell title={title} subtitle={subtitle}><div className="iis-toolbar"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>{["observed","calculated","inferred","limited","insufficient_evidence"].map((s) => <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>{stateLabel(s)}</button>)}</div>{isLiquidity && <div className="iis-metric-grid"><Metric label="Liquid position" value={money(metrics.liquid)} state={metrics.liquid == null ? "insufficient_evidence" : "observed"}/><Metric label="Safe to spend" value={money(metrics.safe)} state={metrics.safe == null ? "insufficient_evidence" : "calculated"}/><Metric label="Net cash flow" value={money(metrics.net)} state={metrics.net == null ? "insufficient_evidence" : "calculated"}/></div>}{isForecast && <Panel title="Forward model envelope"><Metric label="Projection" value={text(intel?.forward_projection?.value ?? intel?.forward_projection?.projection ?? intel?.forward_projection)} state={intel?.forward_projection ? "inferred" : "insufficient_evidence"}/><p className="iis-note">Iris never upgrades a model into provider fact. Forecasts remain explicitly identified as derived intelligence and are constrained by the evidence graph.</p></Panel>}{isRoundups && <div className="iis-metric-grid"><Metric label="Projected Round-Ups" value={money(metrics.roundup)} state={metrics.roundup == null ? "insufficient_evidence" : "calculated"}/><Metric label="Phase 1 money movement" value="DISABLED" state="limited" note="No funds move in Phase 1"/></div>}<Panel title={rows.length ? "Inspectable intelligence nodes" : "Current intelligence state"}>{rows.length ? <Rows rows={visibleRows}/> : <div className="iis-empty"><strong>{page === "iris/education" ? "Education follows the evidence." : "No additional evidence is currently exposed for this layer."}</strong><p>Iris will not invent missing provider information. This screen remains available so new authorized evidence can deepen it without changing the meaning of existing observations.</p></div>}</Panel><Panel title="Evidence boundary"><div className="iis-boundary"><State state={intel ? "calculated" : "insufficient_evidence"}/><p>Every displayed value is either provider evidence or a labeled Iris calculation/inference. Provider facts are not editable by the user. Missing evidence remains missing.</p></div></Panel></Shell>;
}