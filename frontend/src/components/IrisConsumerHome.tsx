import { useEffect, useState } from "react";
import { api } from "../api/backend";
import type { ConsumerReportProduct, IrisConsumerIntelligenceResponse } from "../contracts/irisConsumer";
import "./IrisIntelligenceScreens.css";

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
      .then((value) => { if (mounted) setData(value as IrisConsumerIntelligenceResponse); })
      .catch((reason) => { if (mounted) setError(reason instanceof Error ? reason.message : "IRIS could not load a completed governed run."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const runtime = data?.intelligence_output_runtime;
  const publishable = data?.certified ? (runtime?.publishable ?? []) : [];
  const active = new Set(data?.selected_report_ids ?? []);

  return <main className="iris4-screen">
    <header className="iris4-hero">
      <div>
        <span>IRIS · CONSUMER</span>
        <h1>Your financial life, understood.</h1>
        <p>IRIS publishes only intelligence that the current evidence and governed execution can support. The internal intelligence hierarchy remains separate from the products you consume.</p>
      </div>
      <div className="iris-connect-control">
        <button type="button" onClick={() => go?.("iris/catalog")}>Explore Reports →</button>
      </div>
    </header>

    <div className="iris4-body">
      {loading && <section className="iris-surface"><span className="eyebrow">IRIS</span><h2>Reading governed evidence…</h2><p>IRIS is waiting for a completed evidence-qualified run. No financial value is created while evidence is unavailable.</p></section>}

      {error && <section className="iris-surface"><span className="eyebrow">EVIDENCE STATUS</span><h2>IRIS remains evidence-gated</h2><p>{error}</p><p>No financial conclusion is substituted for missing evidence.</p></section>}

      {!loading && !error && !data?.certified && <section className="iris-surface"><span className="eyebrow">CERTIFICATION STATUS</span><h2>This run is not certified for completed consumer intelligence</h2><p>IRIS can expose the execution boundary and evidence limitations, but it will not present an uncertified result as a completed financial conclusion.</p><p>Run status: <strong>{data?.run_status ?? "unknown"}</strong></p></section>}

      {!loading && !error && data?.certified && publishable.length === 0 && <section className="iris-surface"><span className="eyebrow">REPORTS & ANALYTICS</span><h2>No evidence-qualified report is currently publishable.</h2><p>This is an evidence state, not a zero-result financial conclusion. Connect an authorized provider or supply another permitted evidence source before IRIS can publish supported financial intelligence.</p></section>}

      {publishable.length > 0 && <section className="iris-surface">
        <span className="eyebrow">YOUR IRIS PRODUCTS</span>
        <h2>Reports & analytics</h2>
        <p>These products are generated from the governed intelligence runtime. Activation controls publication only; it does not alter the underlying intelligence hierarchy.</p>
        <div className="iis-catalog-grid">
          {publishable.map((report) => <article className="iis-catalog-card selected" key={`${report.report_id}:${report.analysis_id}`}>
            <div><span>{report.family} · {stateLabel(report.state)}</span><b>{report.analysis_name}</b></div>
            <small>{report.purpose}</small>
            <em>{evidenceLabel[report.evidence_publication_state] ?? report.evidence_publication_state}{active.has(report.report_id) ? " · Active" : " · Not active"}</em>
            {report.headline_intelligence_node_id && <small>Headline intelligence: {report.headline_intelligence_node_id}</small>}
            {report.headline_reason && <small>{report.headline_reason}</small>}
            {report.qualification && <small>{report.qualification}</small>}
          </article>)}
        </div>
      </section>}

      <section className="iris-surface">
        <span className="eyebrow">TRANSPARENCY</span>
        <h2>Evidence before conclusions</h2>
        <p>Every consumer report remains bounded by its evidence, semantic lineage, execution state, uncertainty and limitations. Provider availability, consent, catalog definitions and activation settings are never treated as financial observations.</p>
        {data?.generated_at && <small>Governed run generated {new Date(data.generated_at).toLocaleString()}.</small>}
      </section>
    </div>
  </main>;
}
