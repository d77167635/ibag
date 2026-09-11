import { useEffect, useState } from "react";
import type { IrisReportCatalogProduct, IrisReportDependency } from "../contracts/irisReportCatalog";
import type { ConsumerReportRuntimeLineage } from "../contracts/irisConsumer";
import { api } from "../api/backend";
import { IrisLineageExplorer } from "./IrisLineageExplorer";
import "./IrisIntelligenceScreens.css";

type Props = { report: IrisReportCatalogProduct; dependency?: IrisReportDependency; active: boolean; saving: boolean; onToggle: () => void; onBack: () => void };

export function IrisReportDetail({ report, dependency, active, saving, onToggle, onBack }: Props) {
  const [runtimeLineage, setRuntimeLineage] = useState<ConsumerReportRuntimeLineage | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLineageLoading(true); setLineageError(null); setRuntimeLineage(null);
    api.getIntelligence().then((response) => {
      if (cancelled) return;
      const output = response.intelligence_output_runtime.outputs.find((item) => item.report_id === report.reportId);
      setRuntimeLineage(output?.runtime_lineage ?? null);
    }).catch((error) => {
      if (!cancelled) setLineageError(error instanceof Error ? error.message : String(error));
    }).finally(() => { if (!cancelled) setLineageLoading(false); });
    return () => { cancelled = true; };
  }, [report.reportId]);

  return <main className="iis-screen">
    <div className="iis-hero"><div className="iis-hero-top"><span>IRIS · REPORT PRODUCT</span><button type="button" className="iis-back" onClick={onBack}>← Report Catalog</button></div><h1>{report.name}</h1><p>{report.description}</p></div>
    <section className="iis-panel"><header><div><span>{report.family} · {report.outputType}</span><h2>Product definition</h2></div><button type="button" onClick={onToggle} disabled={saving}>{saving ? "Saving…" : active ? "Deactivate report" : "Activate report"}</button></header><p className="iis-note">Activation controls whether this report product is published to you. It does not create evidence, change provider consent, or turn internal intelligence nodes on or off.</p><div className="iis-boundary"><p><strong>Analysis definition</strong></p><p>{report.analysisId}</p><p><strong>Evidence required</strong></p>{report.requiredEvidenceInputs.length > 0 ? <ul>{report.requiredEvidenceInputs.map((input) => <li key={input}>{input}</li>)}</ul> : <p>None explicitly declared by the current catalog definition.</p>}</div></section>
    <section className="iis-panel"><header><div><span>DEPENDENCY BOUNDARY</span><h2>What this product depends on</h2></div></header><div className="iis-boundary"><p><strong>Analysis definition:</strong> {dependency?.analysis_definition_id ?? report.analysisId}</p><p><strong>Authoritative feature mappings:</strong> {dependency?.feature_ids.length ? dependency.feature_ids.join(", ") : "None resolved"}</p><p><strong>Definition resolution:</strong> {dependency?.resolution_state ?? "definition_only"}</p><p><strong>Definition-level upstream nodes:</strong> {dependency?.upstream_intelligence_node_ids.length ? dependency.upstream_intelligence_node_ids.join(", ") : "Not resolved at catalog-definition time"}</p><p className="iis-note">Catalog definitions are not runtime intelligence nodes. Actual node IDs and evidence IDs must come from the exact governed execution.</p></div></section>
    <section className="iis-panel"><header><div><span>RUNTIME LINEAGE</span><h2>Report → intelligence → evidence</h2></div></header>{lineageLoading ? <p>Resolving exact executed lineage…</p> : lineageError ? <p className="iis-note">Runtime lineage unavailable: {lineageError}</p> : <IrisLineageExplorer lineage={runtimeLineage} />}</section>
    <section className="iis-panel"><header><div><span>PUBLICATION RULE</span><h2>Evidence determines availability</h2></div></header><div className="iis-boundary"><p>This catalog entry is a product definition, not a financial observation. A report becomes publishable only when the governed intelligence runtime has sufficient permitted evidence, valid semantic lineage, and an execution state that permits publication.</p><p>If required evidence is missing or a certification gate fails, IRIS must show that limitation rather than invent a value, result, or conclusion.</p></div></section>
  </main>;
}
