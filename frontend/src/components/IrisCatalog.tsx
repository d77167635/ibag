import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import type { IrisReportCatalogProduct, IrisReportCatalogResponse } from "../contracts/irisReportCatalog";
import { IrisReportDetail } from "./IrisReportDetail";
import "./IrisIntelligenceScreens.css";

type Props = { go?: (page: string) => void };

export function IrisCatalog({ go }: Props) {
  const [catalog, setCatalog] = useState<IrisReportCatalogProduct[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<IrisReportCatalogResponse["dependency_graph"]>([]);
  const [metadata, setMetadata] = useState<Pick<IrisReportCatalogResponse, "catalog_version" | "product_boundary" | "provider_boundary" | "catalog_counts"> | null>(null);
  const [family, setFamily] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await api.getIrisCatalog();
      setCatalog(data.catalog ?? []);
      setActive(data.activation?.report_ids ?? []);
      setDependencies(data.dependency_graph ?? []);
      setMetadata({
        catalog_version: data.catalog_version,
        product_boundary: data.product_boundary,
        provider_boundary: data.provider_boundary,
        catalog_counts: data.catalog_counts,
      });
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load Iris report catalog.");
    }
  };

  useEffect(() => { void load(); }, []);

  const families = useMemo(() => [...new Set(catalog.map((r) => r.family))].sort(), [catalog]);
  const visible = useMemo(
    () => catalog.filter((r) =>
      (family === "all" || r.family === family) &&
      (!query.trim() || `${r.name} ${r.description} ${r.family} ${r.outputType}`.toLowerCase().includes(query.toLowerCase()))
    ),
    [catalog, family, query]
  );
  const selected = selectedId ? catalog.find((r) => r.reportId === selectedId) ?? null : null;
  const selectedDependency = selected ? dependencies.find((item) => item.report_id === selected.reportId) : undefined;

  const toggle = async (reportId: string) => {
    if (saving) return;
    const previous = active;
    const next = previous.includes(reportId) ? previous.filter((id) => id !== reportId) : [...previous, reportId];
    setActive(next);
    setSaving(true);
    setMessage("");
    try {
      const result = await api.saveIrisCatalogSelection(next);
      setActive(result.activation.report_ids);
      setMessage("Report activation saved");
    } catch (e) {
      setActive(previous);
      setMessage(e instanceof Error ? e.message : "Unable to save report activation.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const data = await api.resetIrisCatalog();
      setActive(data.activation.report_ids);
      setMessage("All currently defined report products restored");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to restore report products.");
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <IrisReportDetail
        report={selected}
        dependency={selectedDependency}
        active={active.includes(selected.reportId)}
        saving={saving}
        onToggle={() => void toggle(selected.reportId)}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const reportProductTotal = metadata?.catalog_counts.total ?? catalog.length;
  const familyTotal = metadata?.catalog_counts.families ?? families.length;

  return (
    <div className="iis-screen">
      <div className="iis-hero">
        <div className="iis-hero-top">
          <span>IRIS · REPORT PRODUCT CATALOG</span>
          {go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Iris Command</button>}
        </div>
        <h1>Explore the reports and analytics Iris can publish</h1>
        <p>The intelligence hierarchy is Iris's internal reasoning system. The products you control are the evidence-grounded reports and analytics that Iris publishes from that hierarchy.</p>
      </div>

      <div className="iis-metric-grid">
        <div className="iis-metric">
          <span>Active reports</span>
          <strong>{active.length}</strong>
          <small>{saving ? "Saving…" : message || "Reports currently activated for publication"}</small>
        </div>
        <div className="iis-metric">
          <span>Report products</span>
          <strong>{reportProductTotal || "—"}</strong>
          <small>{metadata?.catalog_version ?? "Governed Iris report catalog"}</small>
        </div>
        <div className="iis-metric">
          <span>Provider products</span>
          <strong>Not connected</strong>
          <small>Provider-product state is intentionally separate from Iris reports</small>
        </div>
        <div className="iis-metric">
          <span>Report families</span>
          <strong>{familyTotal || "—"}</strong>
          <small>Families in the Iris report catalog</small>
        </div>
      </div>

      <section className="iis-panel">
        <header>
          <div><span>YOUR ACTIVE REPORTS</span><h2>Active reports</h2></div>
          <button type="button" onClick={() => void reset()} disabled={saving}>Restore available reports</button>
        </header>
        <p className="iis-note">Activating or deactivating a report controls publication of that Iris product. It does not turn a provider product on or off, create financial evidence, or restrict the depth of Iris's underlying intelligence.</p>
        <div className="iis-catalog-grid">
          {catalog.filter((r) => active.includes(r.reportId)).map((r) => (
            <button type="button" key={r.reportId} className="iis-catalog-card selected" onClick={() => setSelectedId(r.reportId)}>
              <div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div>
              <small>{r.description}</small>
              <em>Active · Open report</em>
            </button>
          ))}
        </div>
        {active.length === 0 && <p className="iis-note">No report products are active. Iris may still retain and reason over governed evidence, but no user report product is published until you activate one.</p>}
      </section>

      <section className="iis-panel">
        <header><div><span>REPORT PRODUCT CATALOG</span><h2>Explore reports and analytics</h2></div></header>
        <div className="iis-catalog-toolbar">
          <input aria-label="Search Iris report products" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Filter report family" value={family} onChange={(e) => setFamily(e.target.value)}>
            <option value="all">All families</option>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="iis-catalog-grid">
          {visible.map((r) => {
            const isActive = active.includes(r.reportId);
            return (
              <button type="button" key={r.reportId} className={`iis-catalog-card${isActive ? " selected" : ""}`} onClick={() => setSelectedId(r.reportId)}>
                <div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div>
                <small>{r.description}</small>
                <em>{isActive ? "Active · Open report" : "Open report · Activate inside"}</em>
              </button>
            );
          })}
        </div>
      </section>

      <section className="iis-panel">
        <header><div><span>PRODUCT BOUNDARY</span><h2>How Iris report products are created</h2></div></header>
        <div className="iis-boundary">
          <p><strong>Intelligence creates the products.</strong> Iris can combine observations, canonical facts, relationships, statistics, baselines, patterns, risk, opportunity, scenarios, decisions, consequences, outcomes, learning, and higher-order reasoning recursively. The resulting evidence-qualified reports and analytics are the user products.</p>
          <p className="iis-note"><strong>Report catalog:</strong> {metadata?.product_boundary ?? "Report catalog metadata is separate from financial evidence."}</p>
          <p className="iis-note"><strong>Provider boundary:</strong> {metadata?.provider_boundary ?? "Provider products and observations are separate from report activation and catalog metadata."}</p>
        </div>
      </section>
    </div>
  );
}
