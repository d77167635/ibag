import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import "./IrisIntelligenceScreens.css";

type Capability = { id: string; name: string; description: string; family: string; depth: string };

const STANDARD_LIMIT = 10;

export function IrisCatalog({ go }: { go?: (page: string) => void }) {
  const [catalog, setCatalog] = useState<Capability[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [family, setFamily] = useState("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { api.getIrisCatalog().then((data) => { setCatalog(data.catalog ?? []); setSelected(data.selection?.capability_ids ?? []); }).catch((e) => setMessage(e instanceof Error ? e.message : "Unable to load catalog.")); }, []);
  const families = useMemo(() => [...new Set(catalog.map(c => c.family))].sort(), [catalog]);
  const visible = useMemo(() => catalog.filter(c => (family === "all" || c.family === family) && (!query.trim() || `${c.name} ${c.description} ${c.family}`.toLowerCase().includes(query.toLowerCase()))), [catalog, family, query]);
  const toggle = async (id: string) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : selected.length < STANDARD_LIMIT ? [...selected, id] : selected;
    if (next.length === selected.length && !selected.includes(id)) return;
    setSelected(next); setSaving(true); setMessage("");
    try { await api.saveIrisCatalogSelection(next); setMessage("Saved"); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save."); }
    finally { setSaving(false); }
  };
  const reset = () => {
    setSaving(true); setMessage("");
    api.getIrisCatalog().then(data => data.standard?.capability_ids ?? []).then(standard => { setSelected(standard); return api.saveIrisCatalogSelection(standard); }).then(() => setMessage("Iris Standard restored")).catch(() => setMessage("Unable to save standard.")).finally(() => setSaving(false));
  };

  return <div className="iis-screen"><div className="iis-hero"><div className="iis-hero-top"><span>IRIS · INTELLIGENCE STANDARD</span>{go && <button type="button" className="iis-back" onClick={() => go("iris")}>← Iris Command</button>}</div><h1>Choose the intelligence you want active</h1><p>Iris Standard gives every user 10 powerful starting capabilities. Turn each one on or off like Round-Ups. This controls your preferred active lens—not Iris's deeper reasoning ceiling.</p></div><div className="iis-metric-grid"><div className="iis-metric"><span>Active standard</span><strong>{selected.length} / {STANDARD_LIMIT}</strong><small>{saving ? "Saving…" : message || "Your preferred intelligence"}</small></div><div className="iis-metric"><span>Round-Ups</span><strong>{selected.includes("roundups") ? "ON" : "OFF"}</strong><small>Feature #1 in Iris Standard</small></div><div className="iis-metric"><span>Available</span><strong>{catalog.length || "—"}</strong><small>Named capabilities</small></div><div className="iis-metric"><span>Depth</span><strong>Core + Advanced + Frontier</strong><small>Not a composition ceiling</small></div></div><section className="iis-panel"><header><div><span>YOUR 10</span><h2>Active intelligence</h2></div><button type="button" onClick={reset} disabled={saving}>Reset standard</button></header><p className="iis-note">Tap any active feature to deactivate it. Add another from the full surface below. Iris can still reason across evidence and relationships when a question requires deeper analysis.</p><div className="iis-catalog-grid">{catalog.filter(c => selected.includes(c.id)).map(c => <button type="button" key={c.id} className="iis-catalog-card selected" onClick={() => toggle(c.id)}><div><span>{c.family}</span><b>{c.name}</b></div><small>{c.description}</small><em>Active · Tap to deactivate</em></button>)}</div></section><section className="iis-panel"><header><div><span>AVAILABLE TO ACTIVATE</span><h2>Explore Iris capabilities</h2></div></header><div className="iis-catalog-toolbar"><input aria-label="Search Iris capabilities" placeholder="Search intelligence…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter Iris family" value={family} onChange={e => setFamily(e.target.value)}><option value="all">All families</option>{families.map(f => <option key={f} value={f}>{f}</option>)}</select></div><div className="iis-catalog-grid">{visible.map(c => { const isSelected = selected.includes(c.id); return <button type="button" key={c.id} className={`iis-catalog-card${isSelected ? " selected" : ""}`} onClick={() => toggle(c.id)}><div><span>{c.family} · {c.depth}</span><b>{c.name}</b></div><small>{c.description}</small><em>{isSelected ? "Active · Tap to deactivate" : selected.length >= STANDARD_LIMIT ? "Deactivate one to activate" : "Activate"}</em></button>; })}</div></section><section className="iis-panel"><header><div><span>THE EMPOWERMENT LAYER</span><h2>Decision Lab</h2></div></header><div className="iis-boundary"><p><strong>Decision Lab is Iris's next top empowering feature.</strong> It lets a user ask, “What happens if I do this?” and compare evidence-bounded scenarios against the real observed baseline before making a decision. Iris can expose assumptions, constraints, projected consequences, tradeoffs, uncertainty, and what evidence would change the conclusion. It does not pretend a hypothetical event happened and does not move money in simulation.</p></div></section></div>;
}
