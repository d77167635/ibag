import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import "./IrisIntelligenceScreens.css";

type ReportProduct = {
  reportId: string;
  analysisId: string;
  name: string;
  description: string;
  family: string;
  outputType: string;
  requiredEvidenceInputs: string[];
};

export function IrisCatalog({ go }: { go?: (page: string) => void }) {
  const [catalog, setCatalog] = useState<ReportProduct[]>([]);
  const [active, setActive] = useState<string[]>([]);
  const [family, setFamily] = useState("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await api.getIrisCatalog();
      setCatalog(data.catalog ?? []);
      setActive(data.activation?.report_ids ?? []);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load Iris report catalog.");
    }
  };

  useEffect(() => { void load(); }, []);

  const families = useMemo(() => [...new Set(catalog.map((r) => r.family))].sort(), [catalog]);
  const visible = useMemo(() => catalog.filter((r) =>
    (family === "all" || r.family === family) &&
    (!query.trim() || `${r.name} ${r.description} ${r.family} ${r.outputType}`.toLowerCase().includes(query.toLowerCase()))
  ), [catalog, family, query]);

  const toggle = async (reportId: string) => {
    const next = active.includes(reportId) ? active.filter((id) => id !== reportId) : [...active, reportId];
    setActive(next); setSaving(true); setMessage("");
    try {
      await api.saveIrisCatalogSelection(next);
      setMessage("Report activation saved");
    } catch (e) {
      setActive(active);
      setMessage(e instanceof Error ? e.message : "Unable to save report activation.");
    } finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true); setMessage("");
    try {
      const data = await api.resetIrisCatalog();
      setActive(data.activation?.report_ids ?? []);
      setMessage("All currently defined report products restored");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to restore report products.");
    } finally { setSaving(false); }
  };

  return <div className="iis-screen">
    <div className="iis-hero">
      <div className="iis-hero-top"><span>IRIS · REPORT PRODUCT CATALOG</span>{go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Iris Command</button>}</div>
      <h1>Choose the reports and analytics you want active</h1>
      <p>The intelligence hierarchy is Iris's internal reasoning system. The products you control are the evidence-grounded reports and analytics that Iris publishes from that hierarchy.</p>
    </div>

    <div className="iis-metric-grid">
      <div className="iis-metric"><span>Active reports</span><strong>{active.length}</strong><small>{saving ? "Saving…" : message || "Your active Iris products"}</small></div>
      <div className="iis-metric"><span>Catalog products</span><strong>{catalog.length || "—"}</strong><small>Defined from the Iris analytical catalog</small></div>
      <div className="iis-metric"><span>Families</span><strong>{families.length || "—"}</strong><small>Analytical product families</small></div>
      <div className="iis-metric"><span>Evidence rule</span><strong>Required</strong><small>No evidence means no fabricated report</small></div>
    </div>

    <section className="iis-panel">
      <header><div><span>YOUR ACTIVE PRODUCTS</span><h2>Active reports & analytics</h2></div><button type="button" onClick={() => void reset()} disabled={saving}>Restore available products</button></header>
      <p className="iis-note">Activating or deactivating a report controls publication of that product. It does not turn a Plaid product on or off, create financial evidence, or restrict the depth of Iris's underlying intelligence.</p>
      <div className="iis-catalog-grid">
        {catalog.filter((r) => active.includes(r.reportId)).map((r) => <button type="button" key={r.reportId} className="iis-catalog-card selected" onClick={() => void toggle(r.reportId)}>
          <div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><em>Active · Tap to deactivate</em>
        </button>)}
      </div>
      {active.length === 0 && <p className="iis-note">No report products are active. Iris may still retain and reason over governed evidence, but no user report product is published until you activate one.</p>}
    </section>

    <section className="iis-panel">
      <header><div><span>REPORT PRODUCT CATALOG</span><h2>Explore reports and analytics</h2></div></header>
      <div className="iis-catalog-toolbar"><input aria-label="Search Iris report products" placeholder="Search reports…" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter report family" value={family} onChange={(e) => setFamily(e.target.value)}><option value="all">All families</option>{families.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
      <div className="iis-catalog-grid">
        {visible.map((r) => { const isActive = active.includes(r.reportId); return <button type="button" key={r.reportId} className={`iis-catalog-card${isActive ? " selected" : ""}`} onClick={() => void toggle(r.reportId)}>
          <div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><em>{isActive ? "Active · Tap to deactivate" : "Activate report"}</em>
        </button>; })}
      </div>
    </section>

    <section className="iis-panel"><header><div><span>PRODUCT BOUNDARY</span><h2>How Iris products are created</h2></div></header><div className="iis-boundary"><p><strong>Intelligence creates the products.</strong> Iris can combine observations, canonical facts, relationships, statistics, baselines, patterns, risk, opportunity, scenarios, decisions, consequences, outcomes, learning, and higher-order reasoning recursively. The resulting evidence-qualified reports and analytics are the user products. Report names and contextual titles must be derived from the actual information available at execution time; missing information is never invented.</p></div></section>
  </div>;
}
