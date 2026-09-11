import type { IrisReportCatalogProduct, IrisReportDependency } from "../contracts/irisReportCatalog";
import "./IrisIntelligenceScreens.css";

type Props = {
  report: IrisReportCatalogProduct;
  dependency?: IrisReportDependency;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
  onBack: () => void;
};

export function IrisReportDetail({ report, dependency, active, saving, onToggle, onBack }: Props) {
  return <main className="iis-screen">
    <div className="iis-hero">
      <div className="iis-hero-top"><span>IRIS · REPORT PRODUCT</span><button type="button" className="iis-back" onClick={onBack}>← Report Catalog</button></div>
      <h1>{report.name}</h1>
      <p>{report.description}</p>
    </div>

    <section className="iis-panel">
      <header><div><span>{report.family} · {report.outputType}</span><h2>Product definition</h2></div><button type="button" onClick={onToggle} disabled={saving}>{saving ? "Saving…" : active ? "Deactivate report" : "Activate report"}</button></header>
      <p className="iis-note">Activation controls whether this report product is published to you. It does not create evidence, change provider consent, or turn internal intelligence nodes on or off.</p>
      <div className="iis-boundary">
        <p><strong>Analysis definition</strong></p>
        <p>{report.analysisId}</p>
        <p><strong>Evidence required</strong></p>
        {report.requiredEvidenceInputs.length > 0 ? <ul>{report.requiredEvidenceInputs.map((input) => <li key={input}>{input}</li>)}</ul> : <p>None explicitly declared by the current catalog definition.</p>}
      </div>
    </section>

    <section className="iis-panel">
      <header><div><span>DEPENDENCY BOUNDARY</span><h2>What this product depends on</h2></div></header>
      <div className="iis-boundary">
        <p><strong>Analysis definition:</strong> {dependency?.analysis_definition_id ?? report.analysisId}</p>
        <p><strong>Authoritative feature mappings:</strong> {dependency?.feature_ids.length ? dependency.feature_ids.join(", ") : "None resolved"}</p>
        <p><strong>Resolution state:</strong> {dependency?.resolution_state ?? "definition_only"}</p>
        <p><strong>Runtime upstream intelligence nodes:</strong> {dependency?.upstream_intelligence_node_ids.length ? dependency.upstream_intelligence_node_ids.join(", ") : "Not resolved at catalog-definition time"}</p>
        <p className="iis-note">The catalog exposes the dependency definition without pretending that an analysis ID, feature ID, or evidence key is a persisted runtime intelligence node. Actual upstream node IDs belong to executed intelligence lineage and must be supplied by that runtime before a report can claim recursive graph provenance.</p>
      </div>
    </section>

    <section className="iis-panel">
      <header><div><span>PUBLICATION RULE</span><h2>Evidence determines availability</h2></div></header>
      <div className="iis-boundary">
        <p>This catalog entry is a product definition, not a financial observation. A report becomes publishable only when the governed intelligence runtime has sufficient permitted evidence, valid semantic lineage, and an execution state that permits publication.</p>
        <p>If required evidence is missing or a certification gate fails, IRIS must show that limitation rather than invent a value, result, or conclusion.</p>
      </div>
    </section>
  </main>;
}
