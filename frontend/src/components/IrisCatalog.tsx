import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import type { IrisReportCatalogProduct, IrisReportCatalogResponse } from "../contracts/irisReportCatalog";
import { IrisReportDetail } from "./IrisReportDetail";
import "./IrisIntelligenceScreens.css";

type Props = { go?: (page: string) => void };
type RuntimeReport = { report_id?: string; runtime_lineage?: unknown };
type ProductState = "runtime" | "active" | "defined";

function productState(active: boolean, runtime: boolean): ProductState {
  if (runtime) return "runtime";
  if (active) return "active";
  return "defined";
}

function stateLabel(state: ProductState) {
  if (state === "runtime") return "Runtime output observed";
  if (state === "active") return "Active definition";
  return "Defined · inspect";
}

function stateDescription(state: ProductState) {
  if (state === "runtime") return "A governed runtime output was returned for this product.";
  if (state === "active") return "You have activated this product; activation does not create evidence or intelligence.";
  return "A catalog definition exists; no produced result is being claimed here.";
}

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
  const definedCount = metadata?.catalog_counts.total ?? catalog.length;
  const runtimeCount = runtimeReportIds.size;
  const activeCount = active.length;
  const familyCount = metadata?.catalog_counts.families ?? families.length;
  const dependencyCount = dependencies.length;
  const familyCounts = useMemo(() => families.map((name) => ({ name, count: catalog.filter((r) => r.family === name).length })), [catalog, families]);

  const selectedFamilyProducts = useMemo(() => {
    if (!selected) return [];
    return catalog.filter((candidate) => candidate.reportId !== selected.reportId && candidate.family === selected.family).slice(0, 6);
  }, [catalog, selected]);

  const relatedProducts = useMemo(() => {
    if (!selected) return [];
    const selectedInputs = new Set(selected.requiredEvidenceInputs);
    return catalog
      .filter((candidate) => candidate.reportId !== selected.reportId)
      .map((candidate) => {
        const sharedInputs = candidate.requiredEvidenceInputs.filter((input) => selectedInputs.has(input)).length;
        const sameOutput = candidate.outputType === selected.outputType ? 1 : 0;
        const sameFamily = candidate.family === selected.family ? 2 : 0;
        return { candidate, score: sharedInputs * 3 + sameOutput + sameFamily };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
      .slice(0, 8)
      .map((item) => item.candidate);
  }, [catalog, selected]);

  const discoverySuggestions = useMemo(() => {
    const prompts = ["cash flow", "spending changes", "financial position", "debt", "behavior", "forecast", "evidence", "risk"];
    return prompts.filter((prompt) => !query.trim() || prompt.includes(query.trim().toLowerCase())).slice(0, 6);
  }, [query]);

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

  if (selected) return (
    <>
      <IrisReportDetail report={selected} dependency={selectedDependency} active={active.includes(selected.reportId)} saving={saving} onToggle={() => void toggle(selected.reportId)} onBack={() => setSelectedId(null)} />
      <section className="iis-panel" aria-label="Related report products">
        <header><div><span>CONTINUE EXPLORING</span><h2>Related products</h2></div></header>
        <p className="iis-note">These relationships are catalog-level discovery signals. They do not prove that the related products have runtime outputs or that their dependencies were consumed.</p>
        <div className="iis-catalog-grid">
          {[...selectedFamilyProducts, ...relatedProducts.filter((r) => !selectedFamilyProducts.some((x) => x.reportId === r.reportId))].slice(0, 8).map((r) => <button type="button" key={r.reportId} className="iis-catalog-card" onClick={() => setSelectedId(r.reportId)}><div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><em>Open related product →</em></button>)}
        </div>
      </section>
      <section className="iis-panel">
        <header><div><span>RETURN PATH</span><h2>Keep the financial-life context</h2></div></header>
        <div className="iis-boundary"><p>From a report, IRIS can move toward reasoning and evidence when those routes are available, then return to the report universe without treating navigation as proof.</p></div>
        <div className="iis-catalog-toolbar"><button type="button" onClick={() => go?.("iris")}>← Financial Life</button><button type="button" onClick={() => go?.("iris/reasoning")}>Understand the reasoning</button><button type="button" onClick={() => go?.("iris/evidence")}>Verify evidence</button><button type="button" onClick={() => setSelectedId(null)}>Report library</button></div>
      </section>
    </>
  );

  return (
    <div className="iis-screen">
      <div className="iis-hero">
        <div className="iis-hero-top"><span>IRIS · FINANCIAL LIFE / RESULTS · REPORT LIBRARY</span>{go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Financial Life</button>}</div>
        <h1>Your IRIS financial-life library</h1>
        <p>This is the publication inventory for your Financial Life experience. It is intentionally larger than a dashboard: report products can organize, explain, compare and expose qualified intelligence across the financial life IRIS can actually observe.</p>
        <div className="iis-boundary"><p><strong>The catalog can exist before your Plaid evidence does.</strong> A definition is a product description—not a financial observation and not a produced report.</p><p><strong>Your results are evidence-gated.</strong> IRIS only presents user-specific factual output when the governed evidence, intelligence, lineage and applicable publication requirements are satisfied.</p></div>
      </div>

      <div className="iis-metric-grid">
        <div className="iis-metric"><span>Defined today</span><strong>{definedCount}</strong><small>{metadata?.catalog_version ?? "Governed catalog"} · product definitions</small></div>
        <div className="iis-metric"><span>Active for you</span><strong>{activeCount}</strong><small>{saving ? "Saving…" : message || "Your publication preference"}</small></div>
        <div className="iis-metric"><span>Runtime outputs observed</span><strong>{runtimeCount}</strong><small>Actual readable Iris runtime output only</small></div>
        <div className="iis-metric"><span>Families / mappings</span><strong>{familyCount} / {dependencyCount}</strong><small>Catalog relationships, not financial evidence</small></div>
      </div>

      <section className="iis-panel">
        <header><div><span>THE PRODUCT UNIVERSE</span><h2>Discover what IRIS can offer</h2></div></header>
        <p className="iis-note">The persisted count is the number of currently registered definitions. It is <strong>not</strong> IRIS's intelligence capacity, not the maximum number of reports, and not the number of reports produced for you. The universe can expand as new governed intelligence and valid compositions become available.</p>
        <div className="iis-catalog-grid">{familyCounts.map((item) => <button type="button" key={item.name} className="iis-catalog-card" onClick={() => { setFamily(item.name); setQuery(""); }}><div><span>REPORT FAMILY</span><b>{item.name}</b></div><small>{item.count} currently defined product{item.count === 1 ? "" : "s"}</small><em>Browse family →</em></button>)}</div>
      </section>

      <section className="iis-panel">
        <header><div><span>QUESTION-DRIVEN DISCOVERY</span><h2>Start with what you want to understand</h2></div></header>
        <p className="iis-note">These prompts search the registered product definitions. They do not claim that IRIS has already answered the question.</p>
        <div className="iis-catalog-toolbar"><input aria-label="Search Iris report products" placeholder="What do you want to understand?" value={query} onChange={(e) => setQuery(e.target.value)} />{discoverySuggestions.map((prompt) => <button type="button" key={prompt} onClick={() => setQuery(prompt)}>{prompt}</button>)}</div>
      </section>

      <section className="iis-panel">
        <header><div><span>YOUR PUBLICATION PREFERENCES</span><h2>Active reports</h2></div><button type="button" onClick={() => void reset()} disabled={saving}>Restore available reports</button></header>
        <p className="iis-note">Activation controls what you choose to receive and prioritize. It does not turn a provider product on or off, create evidence, create intelligence, or limit the underlying IRIS hierarchy.</p>
        <div className="iis-catalog-grid">{catalog.filter((r) => active.includes(r.reportId)).map((r) => <button type="button" key={r.reportId} className="iis-catalog-card selected" onClick={() => setSelectedId(r.reportId)}><div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><em>{runtimeReportIds.has(r.reportId) ? "Runtime output observed · Open" : "Definition only · Open"}</em></button>)}</div>
        {active.length === 0 && <p className="iis-note">No report products are active. IRIS may still retain and reason over governed evidence, but no user report product is published until one is activated and the applicable evidence/publication gates are satisfied.</p>}
      </section>

      <section className="iis-panel">
        <header><div><span>COMPLETE REGISTERED INVENTORY</span><h2>{visible.length} report products shown</h2></div></header>
        <div className="iis-catalog-toolbar"><input aria-label="Search Iris report products" placeholder="Search reports, analyses, evidence inputs…" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter report family" value={family} onChange={(e) => setFamily(e.target.value)}><option value="all">All families</option>{families.map((f) => <option key={f} value={f}>{f}</option>)}</select><select aria-label="Filter report output type" value={outputType} onChange={(e) => setOutputType(e.target.value)}><option value="all">All output types</option>{outputTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
        <div className="iis-catalog-grid">{visible.map((r) => { const isActive = active.includes(r.reportId); const isRuntime = runtimeReportIds.has(r.reportId); const dependency = dependencies.find((item) => item.report_id === r.reportId); const state = productState(isActive, isRuntime); return <button type="button" key={r.reportId} className={`iis-catalog-card${isActive ? " selected" : ""}`} onClick={() => setSelectedId(r.reportId)}><div><span>{r.family} · {r.outputType}</span><b>{r.name}</b></div><small>{r.description}</small><small>{r.requiredEvidenceInputs.length} declared evidence input{r.requiredEvidenceInputs.length === 1 ? "" : "s"} · {dependency?.feature_ids.length ?? 0} feature mapping{(dependency?.feature_ids.length ?? 0) === 1 ? "" : "s"}</small><em>{stateLabel(state)}</em><small>{stateDescription(state)}</small></button>; })}{visible.length === 0 && <p className="iis-note">No report products match the current discovery terms or filters.</p>}</div>
      </section>

      <section className="iis-panel"><header><div><span>REPORT → INTELLIGENCE → EVIDENCE</span><h2>Understand every published result</h2></div></header><div className="iis-boundary"><p><strong>Forward:</strong> governed observations can support canonical state, intelligence, and eligible report products.</p><p><strong>Reverse:</strong> a published result can be inspected back through its exact runtime intelligence lineage toward governed evidence when that lineage exists.</p><p><strong>Limit:</strong> catalog definitions and dependency mappings are not proof that a user-specific result was produced or that every declared dependency was semantically consumed.</p><p className="iis-note"><strong>Provider boundary:</strong> {metadata?.provider_boundary ?? "Plaid supplies provider observations; report definitions, consent, availability, entitlement and activation remain separate from provider evidence."}</p></div></section>

      <section className="iis-panel"><header><div><span>THE IRIS PROMISE</span><h2>More products without more fiction</h2></div></header><div className="iis-boundary"><p><strong>No evidence → no factual value.</strong></p><p><strong>Unknown ≠ zero.</strong></p><p><strong>Prediction ≠ observation.</strong></p><p><strong>Scenario ≠ observation.</strong></p><p><strong>Correlation ≠ causation.</strong></p><p><strong>Persistence ≠ semantic proof.</strong></p><p>IRIS can make the user experience enormous without pretending that an unqualified product is a completed financial result.</p></div></section>
    </div>
  );
}
