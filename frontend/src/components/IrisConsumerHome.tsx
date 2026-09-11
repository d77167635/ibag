import { useEffect, useState } from "react";
import { api } from "../api/backend";
import type { ConsumerReportProduct, IrisConsumerIntelligenceResponse } from "../contracts/irisConsumer";
import "./IrisConsumerExperience.css";

type Props = { go?: (page: string) => void };

const evidenceLabel: Record<string, string> = {
  observed: "Observed",
  calculated: "Calculated",
  inferred: "Inferred",
  limited: "Limited evidence",
  insufficient_evidence: "Insufficient evidence",
  unknown: "Unknown",
};

function stateLabel(state: ConsumerReportProduct["state"]) {
  if (state === "ready") return "Available";
  if (state === "limited") return "Limited";
  return "Not publishable";
}

export function IrisConsumerHome({ go }: Props) {
  const [data, setData] = useState<IrisConsumerIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getIntelligence()
      .then((value) => { if (mounted) setData(value); })
      .catch((reason) => { if (mounted) setError(reason instanceof Error ? reason.message : "IRIS could not load a completed governed run."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const runtime = data?.intelligence_output_runtime;
  const publishable = data?.certified ? (runtime?.publishable ?? []) : [];
  const active = new Set(data?.selected_report_ids ?? []);
  const narrative = data?.narrative?.trim();
  const journey = [
    ["What matters", "Prioritized supported intelligence", "iris"],
    ["What changed", "Temporal and behavioral change", "iris/behavior"],
    ["How Iris knows", "Evidence, lineage and limits", "iris/evidence"],
    ["Ask / investigate", "Questions and relationships", "iris/reasoning"],
    ["What could happen", "Scenarios and counterfactuals", "iris/simulation"],
    ["What to decide", "Evidence-linked decisions", "iris/decisions"],
  ] as const;

  return (
    <main className="iris-consumer-experience">
      <div className="ice-shell">
        <section className="ice-hero">
          <div className="ice-hero-main">
            <span className="ice-kicker">IRIS · YOUR FINANCIAL LIFE</span>
            <h1>Understand what matters.<br />Then understand why.</h1>
            <p>IRIS turns governed financial evidence into connected intelligence. It does not fill gaps with guesses. When the evidence is incomplete, the experience tells you exactly that.</p>
            {narrative && <div className="ice-narrative"><span className="ice-narrative-label">CURRENT IRIS READOUT</span>{narrative}</div>}
            <div className="ice-actions">
              <button className="ice-primary" type="button" onClick={() => go?.("iris/reasoning")}>Explore with IRIS →</button>
              <button className="ice-secondary" type="button" onClick={() => go?.("iris/evidence")}>See how Iris knows</button>
            </div>
          </div>
          <aside className="ice-trust">
            <span className="ice-kicker">TRUST BOUNDARY</span>
            <h2>{loading ? "Establishing the current evidence state" : data?.certified ? "Evidence-qualified intelligence" : "Evidence-gated intelligence"}</h2>
            <div className="ice-trust-list">
              <div className="ice-trust-item"><i className={data?.certified ? "" : "limited"}/><span><strong>Execution:</strong> {data?.run_status ?? "Not available"}</span></div>
              <div className="ice-trust-item"><i className={data?.execution_id ? "" : "limited"}/><span><strong>Execution boundary:</strong> {data?.execution_id ? "Bound" : "Not established"}</span></div>
              <div className="ice-trust-item"><i className={publishable.length ? "" : "limited"}/><span><strong>Publishable reports:</strong> {publishable.length}</span></div>
              <div className="ice-trust-item"><i/><span><strong>Financial values:</strong> never invented by this surface</span></div>
            </div>
          </aside>
        </section>

        <nav className="ice-journey" aria-label="IRIS intelligence journey">
          {journey.map(([title, description, page]) => (
            <button type="button" key={page} onClick={() => go?.(page)}>
              <strong>{title}</strong><span>{description}</span>
            </button>
          ))}
        </nav>

        <section className="ice-section">
          <div className="ice-section-head"><div><span className="ice-kicker">USER PRODUCTS</span><h2>Reports & analytics</h2></div><p>Products are publication surfaces over the intelligence hierarchy.</p></div>
          {loading && <div className="ice-empty"><h3>Reading governed evidence…</h3><p>IRIS is waiting for the current governed intelligence state. No financial value is created while evidence is unavailable.</p></div>}
          {error && <div className="ice-empty"><h3>IRIS remains evidence-gated</h3><p>{error} No financial conclusion is substituted for missing evidence.</p></div>}
          {!loading && !error && !data?.certified && <div className="ice-empty"><h3>This run is not certified for completed consumer intelligence.</h3><p>IRIS will not present an uncertified execution as a completed financial conclusion. Run status: {data?.run_status ?? "unknown"}.</p></div>}
          {!loading && !error && data?.certified && publishable.length === 0 && <div className="ice-empty"><h3>No evidence-qualified report is currently publishable.</h3><p>This is an evidence state, not a zero-result financial conclusion. IRIS will publish supported intelligence when the required evidence and certification boundary permit it.</p></div>}
          {publishable.length > 0 && (
            <div className="ice-report-grid">
              {publishable.map((report) => (
                <button
                  className="ice-report"
                  key={`${report.report_id}:${report.analysis_id}`}
                  type="button"
                  onClick={() => go?.("iris/catalog")}
                  aria-label={`Open report ${report.analysis_name}`}
                >
                  <div className="ice-report-top"><span>{report.family}</span><span>{stateLabel(report.state)}</span></div>
                  <strong>{report.analysis_name}</strong>
                  <small>{report.purpose}</small>
                  <em>{evidenceLabel[report.evidence_publication_state] ?? report.evidence_publication_state}{active.has(report.report_id) ? " · Active" : " · Not active"}</em>
                </button>
              ))}
            </div>
          )}
          {publishable.length > 0 && <div className="ice-actions"><button className="ice-secondary" type="button" onClick={() => go?.("iris/catalog")}>Manage report products →</button></div>}
        </section>

        <section className="ice-section">
          <div className="ice-section-head"><div><span className="ice-kicker">THE IRIS PROMISE</span><h2>One connected financial intelligence relationship.</h2></div></div>
          <div className="ice-transparency">
            <article><span>WHAT IRIS KNOWS</span><p>Supported observations and derived intelligence remain tied to their governed execution and evidence boundary.</p></article>
            <article><span>WHY IRIS KNOWS</span><p>Where runtime lineage is available, the experience can move from conclusion to intelligence to evidence instead of asking for blind trust.</p></article>
            <article><span>WHAT IRIS DOESN'T KNOW</span><p>Missing, insufficient, limited, unresolved, and hypothetical states remain explicit. Unknown never becomes zero.</p></article>
          </div>
          <p className="ice-footnote">{data?.generated_at ? `Governed run generated ${new Date(data.generated_at).toLocaleString()}.` : "No governed run timestamp is currently available."}</p>
        </section>
      </div>
    </main>
  );
}
