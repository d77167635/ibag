import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { MaximumIntelligencePanel } from "./MaximumIntelligencePanel";
import "./IrisIntelligenceSurface.css";

type Props = { go?: (page: string) => void };

const money = (value: unknown) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? `${number < 0 ? "−" : ""}$${Math.abs(number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
};
const label = (value: unknown) => String(value ?? "—").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const count = (value: unknown) => Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value as object).length : value == null ? "—" : value;

export function IrisIntelligenceSurface({ go }: Props) {
  const [intel, setIntel] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getOverview(), api.getIntelligence()]).then(([overviewResult, intelligenceResult]) => {
      if (!active) return;
      if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
      if (intelligenceResult.status === "fulfilled") setIntel(intelligenceResult.value);
      else setError(intelligenceResult.reason instanceof Error ? intelligenceResult.reason.message : "The persisted intelligence output could not be read.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const recursive = intel?.higher_order_synthesis;
  const nodes = Array.isArray(recursive?.recursive_nodes) ? recursive.recursive_nodes : [];
  const findings = Array.isArray(recursive?.findings) ? recursive.findings : Array.isArray(recursive?.higher_order_findings) ? recursive.higher_order_findings : [];
  const accounts = Array.isArray(overview?.accounts) ? overview.accounts : [];
  const transactions = Array.isArray(overview?.recent_transactions) ? overview.recent_transactions : [];

  return <main className="iris-intelligence-surface">
    <section className="iis-header">
      <div><span className="iis-kicker">IRIS · INTELLIGENCE</span><h1>The hierarchy that illuminates your financial life.</h1><p>Financial evidence remains the substrate. This surface exposes the governed recursive intelligence already produced from it, including the maximum-intelligence tier, higher-order composition, uncertainty and lineage boundaries.</p></div>
      <div className="iis-state"><strong>{loading ? "Reading persisted intelligence…" : intel?.certified ? "Evidence-qualified" : "Evidence-gated"}</strong><span>{intel?.run_status ? label(intel.run_status) : "No completed run"}</span></div>
    </section>

    <section className="iis-life-strip">
      <article><span>OBSERVED ACCOUNTS</span><strong>{accounts.length || "—"}</strong><small>Your persisted financial accounts remain visible alongside intelligence.</small></article>
      <article><span>RECENT OBSERVED ACTIVITY</span><strong>{transactions.length || "—"}</strong><small>Provider-derived transactions are not replaced by derived intelligence.</small></article>
      <article><span>LIQUID POSITION</span><strong>{money(intel?.net_worth?.liquid_assets)}</strong><small>Only displayed when the persisted governed output provides it.</small></article>
      <article><span>INTELLIGENCE STATE</span><strong>{label(intel?.intelligence_gate?.status)}</strong><small>Evidence gate remains authoritative.</small></article>
    </section>

    {error && <section className="iis-warning"><strong>IRIS remains constrained.</strong><span>{error}</span></section>}

    <section className="iis-section">
      <div className="iis-section-head"><div><span className="iis-kicker">RECURSIVE HIERARCHY</span><h2>From direct evidence to higher-order composition</h2></div><p>Semantic depth is not capped here. Runtime budgets constrain an execution; they do not define the intelligence hierarchy.</p></div>
      <div className="iis-metrics">
        <article><span>COMPOSITION DEPTH</span><strong>{recursive?.composition_depth ?? "—"}</strong><small>Observed depth of the current governed synthesis.</small></article>
        <article><span>DEPENDENCY NODES</span><strong>{recursive?.dependency_count ?? nodes.length || "—"}</strong><small>Recursive capability outputs participating in this synthesis.</small></article>
        <article><span>HIGHER-ORDER FINDINGS</span><strong>{findings.length || "—"}</strong><small>Compositions retained with their evidence state.</small></article>
        <article><span>EVIDENCE COMPLETE</span><strong>{recursive?.evidence_profile?.complete == null ? "—" : recursive.evidence_profile.complete ? "Yes" : "No"}</strong><small>Completeness never converts unknown into zero.</small></article>
      </div>
      {nodes.length ? <div className="iis-node-grid">{nodes.slice(0, 48).map((node: any, index: number) => <article key={`${node.capability_id ?? "node"}-${index}`}><div><strong>{label(node.capability_id)}</strong><span>Depth {node.depth ?? "—"}</span></div><small>{node.dependencies?.length ? `Depends on ${node.dependencies.map(label).join(", ")}` : "Root capability"}</small><em>{label(node.evidence_state)}</em></article>)}</div> : <div className="iis-empty">No recursive graph nodes are present in the latest persisted output.</div>}
    </section>

    <MaximumIntelligencePanel />

    <section className="iis-section">
      <div className="iis-section-head"><div><span className="iis-kicker">HIGHER-ORDER PATHS</span><h2>Cross-domain and recursive relationships</h2></div><p>These are analytical compositions, not fabricated provider facts.</p></div>
      {findings.length ? <div className="iis-findings">{findings.slice(0, 48).map((finding: any, index: number) => <article key={finding.id ?? index}><div><span>{label(finding.kind)}</span><strong>{finding.statement ?? "Supported recursive composition"}</strong></div><p>{finding.capabilities?.length ? finding.capabilities.map(label).join(" → ") : "No capability path returned"}</p><small>{finding.limitation ?? "Trace the composition through the governed evidence boundary."}</small></article>)}</div> : <div className="iis-empty">No higher-order path is currently persisted. That is an evidence/runtime state, not permission to invent one.</div>}
    </section>

    <section className="iis-section iis-boundary"><div><span className="iis-kicker">EVIDENCE BOUNDARY</span><h2>Seven current Sandbox domains. Statements remains deferred.</h2><p>The architecture contains eight authoritative domains. The current Sandbox/runtime evidence boundary is seven: Authentication, Transactions, Balance, Identity, Assets, Liabilities and Investments. Statements is deliberately deferred until real banking and is neither simulated nor treated as observed.</p></div><div className="iis-actions"><button type="button" onClick={() => go?.("iris/evidence")}>Inspect evidence →</button><button type="button" onClick={() => go?.("iris/reasoning")}>Understand reasoning →</button><button type="button" onClick={() => go?.("iris/simulation")}>Explore scenarios →</button></div></section>
  </main>;
}
