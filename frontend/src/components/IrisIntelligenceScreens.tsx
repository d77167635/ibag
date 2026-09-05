import { useMemo, useState, type ReactNode } from "react";
import "./IrisIntelligenceScreens.css";

type ScreenProps = { page: string; intel: any; go?: (page: string) => void };
type Row = { label: string; value: unknown; state?: string; detail?: string };

const money = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : "—";
const pct = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
const text = (v: unknown) => v == null ? "—" : typeof v === "string" ? v : JSON.stringify(v);
const stateLabel = (s?: string) => ({ observed: "OBSERVED", calculated: "CALCULATED", inferred: "IRIS INFERENCE", limited: "LIMITED", insufficient_evidence: "INSUFFICIENT EVIDENCE" } as Record<string, string>)[s ?? "calculated"] ?? String(s ?? "CALCULATED");

function State({ state = "calculated" }: { state?: string }) { return <span className={`iis-state ${state}`}>{stateLabel(state)}</span>; }
function Metric({ label, value, state = "calculated", note }: { label: string; value: string; state?: string; note?: string }) { return <div className="iis-metric"><span>{label}</span><strong>{value}</strong><State state={state} />{note && <small>{note}</small>}</div>; }
function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="iis-panel"><header><div><span>IRIS INTELLIGENCE</span><h2>{title}</h2></div></header>{children}</section>; }
function Rows({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return <div className="iis-rows">{rows.map((row, index) => <div key={`${row.label}-${index}`} className="iis-row"><button type="button" className="iis-row-main" onClick={() => setOpen(open === index ? null : index)}><span><b>{row.label}</b><small>{row.detail ?? "Select to inspect this intelligence node."}</small></span><strong>{text(row.value)}</strong><State state={row.state} /><span className="iis-row-chevron" aria-hidden="true">{open === index ? "⌃" : "⌄"}</span></button>{open === index && <div className="iis-row-detail"><pre>{JSON.stringify(row.value, null, 2)}</pre></div>}</div>)}</div>;
}
function Shell({ title, subtitle, children, go, back = true }: { title: string; subtitle: string; children: ReactNode; go?: (page: string) => void; back?: boolean }) { return <div className="iis-screen"><div className="iis-hero"><div className="iis-hero-top"><span>IRIS · INTELLIGENCE ENVIRONMENT</span>{back && go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Iris Command</button>}</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>; }

const META: Record<string, [string, string]> = {
  iris: ["Iris Command", "The intelligence operating environment across your connected financial evidence."],
  "iris/findings": ["Findings", "Evidence-backed risks, opportunities, changes and unresolved questions."],
  "iris/timeline": ["Financial Timeline", "Trace financial state, behavior and intelligence across time."],
  "iris/education": ["Financial Education", "Understand what Iris is seeing, how it is calculated, and what it does not know."],
  "iris/relationships": ["Relationships", "Explore how accounts, transactions, cash flow, debt, behavior and intelligence connect."],
  "iris/causes": ["Causal Analysis", "Inspect hypotheses about what may be driving observed financial changes."],
  "iris/decisions": ["Decision Intelligence", "Compare evidence-backed options, constraints, reversibility and readiness."],
  "iris/scenarios": ["Consequence Lab", "Explore modeled consequences without treating scenarios as forecasts or actions."],
  "iris/optimization": ["Optimization", "Inspect multi-objective tradeoffs and evidence supporting each optimization path."],
  "iris/goals": ["Goal Intelligence", "See declared goals, inferred objectives, conflicts and alignment with financial state."],
  "iris/evidence": ["Evidence Graph", "Trace provider observations through calculations, constraints and Iris conclusions."],
  "iris/uncertainty": ["Uncertainty", "See where evidence is strong, calculated, inferred, limited or insufficient."],
  "iris/reasoning": ["Reasoning Trace", "Inspect the reasoning envelope behind Iris findings and conclusions."],
  "iris/forecast": ["Forward Intelligence", "Inspect forward projections, trajectory and the evidence supporting them."],
  "iris/behavior": ["Behavior Intelligence", "Explore category drift, patterns and observed behavioral change."],
  "iris/liquidity": ["Liquidity Intelligence", "Understand liquid position, safe-to-spend calculations and constraints."],
  "iris/roundups": ["Round-Up Intelligence", "Understand eligible Round-Up opportunities and their relationship to financial state."]
};

function arrayRows(value: unknown, label: string, state = "calculated"): Row[] { return Array.isArray(value) ? value.map((x: any, i) => ({ label: x?.title ?? x?.label ?? x?.name ?? `${label} ${i + 1}`, value: x?.statement ?? x?.rationale ?? x, state: x?.evidence_state ?? x?.evidence ?? x?.state ?? state, detail: x?.evidence ?? x?.source ?? label })) : []; }

export function IrisIntelligenceScreens({ page, intel, go }: ScreenProps) {
  const [filter, setFilter] = useState("all");
  const graph = intel?.intelligence_graph ?? intel?.evidence_graph ?? {};
  const reasoning = intel?.reasoning ?? {};
  const causal = intel?.causal_analysis ?? {};
  const decisions = intel?.decision_intelligence ?? {};
  const consequence = intel?.consequence_model ?? {};
  const optimization = intel?.optimization_intelligence ?? {};
  const goals = intel?.goal_intelligence ?? {};
  const uncertainty = intel?.uncertainty ?? {};
  const temporal = intel?.temporal ?? intel?.layer_temporal ?? {};
  const behavior = intel?.category_drift ?? intel?.layer_behavioral?.categoryDrift ?? {};
  const rows = useMemo<Row[]>(() => {
    if (page === "iris/findings") return [...arrayRows(reasoning.risks, "Risk"), ...arrayRows(reasoning.opportunities, "Opportunity"), ...(reasoning.unresolvedQuestions ?? reasoning.unknowns ?? []).map((x: any, i: number) => ({ label: `Unknown ${i + 1}`, value: x, state: "insufficient_evidence", detail: "Evidence gap" }))];
    if (page === "iris/evidence" || page === "iris/relationships") return Array.isArray(graph.nodes) ? graph.nodes.map((x: any) => ({ label: x.label ?? x.id, value: x, state: x.state ?? (x.observed ? "observed" : "calculated"), detail: `${x.kind ?? "node"} · ${x.source ?? "Iris"}` })) : [];
    if (page === "iris/uncertainty") return arrayRows(uncertainty.entries ?? uncertainty.nodes, "Intelligence node", "insufficient_evidence");
    if (page === "iris/causes") return arrayRows(causal.hypotheses ?? causal.hypothesis, "Causal hypothesis", "inferred");
    if (page === "iris/decisions") return arrayRows(decisions.options, "Decision option");
    if (page === "iris/scenarios") return arrayRows(consequence.scenarios, "Scenario");
    if (page === "iris/optimization") return arrayRows(optimization.options ?? optimization.recommendations, "Optimization");
    if (page === "iris/goals") return [...arrayRows(goals.goals ?? goals.activeGoals, "Goal"), ...arrayRows(goals.conflicts, "Goal conflict")];
    if (page === "iris/reasoning") return arrayRows(reasoning.trace ?? reasoning.steps ?? reasoning.nodes, "Reasoning step");
    if (page === "iris/timeline") return Array.isArray(temporal.windows) ? temporal.windows.map((x: any, i: number) => ({ label: `${x.windowDays ?? x.window_days ?? ""} day window`, value: x.net ?? x, state: "calculated", detail: `Inflow ${money(x.inflow)} · Outflow ${money(x.outflow)}` })) : [];
    if (page === "iris/behavior") return Array.isArray(behavior) ? arrayRows(behavior, "Behavior") : Object.entries(behavior ?? {}).map(([k, v]) => ({ label: k, value: v, state: "calculated", detail: "Behavior intelligence" }));
    if (page === "iris/forecast") return arrayRows(intel?.forward_projection?.projections ?? intel?.forward_projection?.windows, "Projection");
    return [];
  }, [page, intel, graph, reasoning, causal, decisions, consequence, optimization, goals, uncertainty, temporal, behavior]);

  const visible = filter === "all" ? rows : rows.filter(row => (row.state ?? "calculated") === filter);
  const metrics = { liquid: intel?.net_worth?.liquid_assets, safe: intel?.cash_flow_safety?.safeToSpend, net: intel?.cash_flow?.net, utilization: intel?.debt_health?.credit_utilization, roundup: intel?.roundup_projection?.projectedAmount ?? intel?.roundup_projection?.projected, anomalies: Array.isArray(intel?.anomalies) ? intel.anomalies.length : null };
  const meta = META[page] ?? META.iris;

  if (page === "iris") return <Shell title={meta[0]} subtitle={meta[1]} go={go} back={false}><div className="iis-metric-grid"><Metric label="Liquid position" value={money(metrics.liquid)} state={metrics.liquid == null ? "insufficient_evidence" : "observed"} /><Metric label="Safe to spend" value={money(metrics.safe)} state={metrics.safe == null ? "insufficient_evidence" : "calculated"} /><Metric label="Net cash flow" value={money(metrics.net)} state={metrics.net == null ? "insufficient_evidence" : "calculated"} /><Metric label="Credit utilization" value={pct(metrics.utilization)} state={metrics.utilization == null ? "insufficient_evidence" : "calculated"} /><Metric label="Round-Up projection" value={money(metrics.roundup)} state={metrics.roundup == null ? "insufficient_evidence" : "calculated"} /><Metric label="Anomalies" value={number(metrics.anomalies)} state={metrics.anomalies == null ? "insufficient_evidence" : "inferred"} /></div><Panel title="Evidence boundary"><p className="iis-note">Iris distinguishes observed provider evidence from calculations and inference. Missing evidence remains missing; simulations never become financial facts.</p></Panel></Shell>;

  return <Shell title={meta[0]} subtitle={meta[1]} go={go}><div className="iis-catalog-toolbar"><select aria-label="Filter evidence state" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All evidence states</option><option value="observed">Observed</option><option value="calculated">Calculated</option><option value="inferred">Iris inference</option><option value="limited">Limited</option><option value="insufficient_evidence">Insufficient evidence</option></select></div><Panel title={`${visible.length.toLocaleString("en-US")} intelligence nodes`}><Rows rows={visible} /></Panel></Shell>;
}
