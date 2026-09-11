import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import type { IrisReportCatalogProduct, IrisReportCatalogResponse } from "../contracts/irisReportCatalog";
import { IrisReportDetail } from "./IrisReportDetail";
import "./IrisIntelligenceScreens.css";

type Props = { go?: (page: string) => void };
type RuntimeReport = { report_id?: string; runtime_lineage?: unknown };

export function IrisCatalog({ go }: Props) {
  const [catalog, setCatalog] = useState<IrisReportCatalogProduct[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<IrisReportCatalogResponse["dependency_graph"]>([]);
  const [runtimeReports, setRuntimeReports] = useState<RuntimeReport[]>([]);
  const [metadata, setMetadata] = useState<Pick<IrisReportCatalogResponse, "catalog_version" | "product_boundary" | "provider_boundary" | "catalog_counts"> | null>(null);
  const [family, setFamily] = useState("all");
  const [outputType, setOutputType] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [catalogData, intelligenceData] = await Promise.all([api.getIrisCatalog(), api.getIntelligence().catch(() => null)]);
      setCatalog(catalogData.catalog ?? []);
      setActive(catalogData.activation?.report_ids ?? []);
      setDependencies(catalogData.dependency_graph ?? []);
      setMetadata({ catalog_version: catalogData.catalog_version, product_boundary: catalogData.product_boundary, provider_boundary: catalogData.provider_boundary, catalog_counts: catalogData.catalog_counts });
      setRuntimeReports((intelligenceData?.intelligence_output_runtime?.outputs ?? []) as RuntimeReport[]);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load Iris report library.");
    }
  };

  useEffect(() => { void load(); }, []);

  const families = useMemo(() => [...new Set(catalog.map((r) => r.family))].sort(), [catalog]);
  const outputTypes = useMemo(() => [...new Set(catalog.map((r) => r.outputType))].sort(), [catalog]);
  const visible = useMemo(() => catalog.filter((r) =>
    (family === "all" || r.family === family) &&
    (outputType === "all" || r.outputType === outputType) &&
    (!query.trim() || `${r.name} ${r.description} ${r.family} ${r.outputType} ${r.analysisId} ${r.requiredEvidenceInputs.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
  ), [catalog, family, outputType, query]);
  const selected = selectedId ? catalog.find((r) => r.reportId === selectedId) ?? null : null;
  const selectedDependency = selected ? dependencies.find((item) => item.report_id === selected.reportId) : undefined;
  const runtimeReportIds = useMemo(() => new Set(runtimeReports.map((item) => item.report_id).filter((id): id is string => typeof id === "string")), [runtimeReports]);
  const definedCount = catalog.length;
  const runtimeCount = runtimeReportIds.size;
  const activeCount = active.length;
  const familyCount = metadata?.catalog_counts.families ?? families.length;
  const dependencyCount = dependencies.length;
  const familyCounts = useMemo(() => families.map((name) => ({ name, count: catalog.filter((r) => r.family === name).length })), [catalog, families]);

  const toggle = async (reportId: string) => {
    if (saving) return;
    const previous = active;
    const next = previous.includes(reportId) ? previous.filter((id) => id !== reportId) : [...previous, reportId];
    setActive(next); setSaving(true); setMessage("");
    try {
      const result = await api.saveIrisCatalogSelection(next);
      setActive(result.activation.report_ids);
      setMessage("Report activation saved");
    } catch (e) {
      setActive(previous);
      setMessage(e instanceof Error ? e.message : "Unable to save report activation.");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    if (saving) return;
    setSaving(true); setMessage("");
    try {
      const data = await api.resetIrisCatalog();
      setActive(data.activation.report_ids);
      setMessage("All currently defined report products restored");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to restore report products.");
    } finally { setSaving(false); }
  };

  if (selected) return <IrisReportDetail report={selected} dependency={selectedDependency} active={active.includes(selected.reportId)} saving={saving} onToggle={() => void toggle(selected.reportId)} onBack={() => setSelectedId(null)} />;

  return (
    <div className="iis-screen">
      <div className="iis-hero">
        <div className="iis-hero-top"><span>IRIS · REPORT PRODUCT LIBRARY</span>{go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Financial Life</button>}</div>
        <h1>Your financial-life library</h1>
        <p>This is the user-facing inventory of Iris report products. Every entry is a governed product definition; a product is only presented as runtime-produced when an actual executed Iris output exists.</p>
      </div>

      <div className="iis-metric-grid">
        <div className="iis-metric"><span>Defined report products</span><strong>{definedCount}</strong><small>{metadata?.catalog_version ?? "Governed catalog"}</small></div>
        <div className="iis-metric"><span>Active for you</span><strong>{activeCount}</strong><small>{saving ? "Saving…" : message || "Publication preference"}</small></div>
        <div className="iis-metric"><span>Runtime-produced</span><strong>{runtimeCount}</strong><small>Observed in the latest readable Iris runtime output</small></div>
        <div className="iis-metric"><span>Families / dependencies</span><strong>{familyCount} / {dependencyCount}</strong><small>Catalog relationships, not financial evidence</small></div>
      </div>

      <section className="iis-panel">
        <header><div><span>LIBRARY MAP</span><h2>Browse the full report universe</h2></div></header>
        <p className="iis-note">The library is intentionally inventory-first: definitions, families, dependencies, activation state, and runtime presence are kept separate. A catalog entry does not become a financial fact merely because it exists.</p>
        <div className="iis-catalog-grid">
          {familyCounts.map((item) => <button type="button" key={item.name} className="iis-catalog-card" onClick={() => { setFamily(item.name); setQuery(""); }}><div><span>REPORT FAMILY</span><b>{item.name}</b></div><small>{item.count} defined report products</small><em>Browse family →</em></button>)}
        </div>
      </section>

      <section className="iis-panel">
        <header><div><span>YOUR ACTIVE REPORTS</span><h2>Active publications</h2></div><button type="button" onClick={() => void reset()} disabled={saving}>Restore available reports</button></header>
        <p className="iis-note">Activation controls publication preference only. It does not turn a provider product on or off, create evidence, or limit the underlying intelligence hierarchy.</p>
        <div className="iis-catalog-grid">
          {catalog.filter((r) => active.includes(r.reportId)).map((r) => <button type="button" key={r.reportId} className="iis-catalog-card selected" onClick={() => setSelectedId(r.reportId)}><div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><em>{runtimeReportIds.has(r.reportId) ? "Runtime-produced · Open" : "Active definition · Open"}</em></button>)}
        </div>
        {active.length === 0 && <p className="iis-note">No report products are active. Iris may still retain and reason over governed evidence, but no user report product is published until one is activated.</p>}
      </section>

      <section className="iis-panel">
        <header><div><span>COMPLETE INVENTORY</span><h2>{visible.length} report products shown</h2></div></header>
        <div className="iis-catalog-toolbar"><input aria-label="Search Iris report products" placeholder="Search reports, analyses, evidence inputs…" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter report family" value={family} onChange={(e) => setFamily(e.target.value)}><option value="all">All families</option>{families.map((f) => <option key={f} value={f}>{f}</option>)}</select><select aria-label="Filter report output type" value={outputType} onChange={(e) => setOutputType(e.target.value)}><option value="all">All output types</option>{outputTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
        <div className="iis-catalog-grid">
          {visible.map((r) => { const isActive = active.includes(r.reportId); const isRuntime = runtimeReportIds.has(r.reportId); const dependency = dependencies.find((item) => item.report_id === r.reportId); return <button type="button" key={r.reportId} className={`iis-catalog-card${isActive ? " selected" : ""}`} onClick={() => setSelectedId(r.reportId)}><div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><small>{r.requiredEvidenceInputs.length} declared evidence input{r.requiredEvidenceInputs.length === 1 ? "" : "s"} · {dependency?.feature_ids.length ?? 0} feature mapping{(dependency?.feature_ids.length ?? 0) === 1 ? "" : "s"}</small><em>{isRuntime ? "Runtime-produced" : isActive ? "Active definition" : "Defined · inspect"}</em></button>; })}
          {visible.length === 0 && <p className="iis-note">No report products match the current filters.</p>}
        </div>
      </section>

      <section className="iis-panel">
        <header><div><span>PRODUCT BOUNDARY</span><h2>How the library connects to Iris</h2></div></header>
        <div className="iis-boundary"><p><strong>Financial reality → governed evidence → intelligence → report product.</strong> The report library is the publication surface over that connected system. It is not a second source of truth.</p><p><strong>Forward:</strong> observed evidence can support intelligence and eligible report products.</p><p><strong>Reverse:</strong> a report can be inspected back through runtime intelligence lineage toward its governed evidence when that exact execution has persisted the required lineage.</p><p className="iis-note"><strong>Provider boundary:</strong> {metadata?.provider_boundary ?? "Provider products and observations remain separate from Iris report definitions and activation."}</p></div>
      </section>
    </div>
  );
}
