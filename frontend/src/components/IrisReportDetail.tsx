import type { IrisReportCatalogProduct } from "../contracts/irisReportCatalog";
import "./IrisIntelligenceScreens.css";

type Props = {
  report: IrisReportCatalogProduct;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
  onBack: () => void;
};

export function IrisReportDetail({ report, active, saving, onToggle, onBack }: Props) {
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
      <header><div><span>PUBLICATION RULE</span><h2>Evidence determines availability</h2></div></header>
      <div className="iis-boundary">
        <p>This catalog entry is a product definition, not a financial observation. A report becomes publishable only when the governed intelligence runtime has sufficient permitted evidence, valid semantic lineage, and an execution state that permits publication.</p>
        <p>If required evidence is missing or a certification gate fails, IRIS must show that limitation rather than invent a value, result, or conclusion.</p>
      </div>
    </section>
  </main>;
}
