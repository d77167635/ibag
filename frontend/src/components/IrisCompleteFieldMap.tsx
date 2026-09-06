import { useMemo, useState } from "react";

const TIER_ROOTS: Record<string, string[]> = {
  "01 · Command": ["narrative", "generated_at", "intelligence_gate", "integrity"],
  "02 · Financial State": ["layer_metrics.net_worth", "layer_metrics.debt_health", "financial_state"],
  "03 · Cash Flow": ["layer_metrics.cash_flow", "layer_metrics.cash_flow_safety", "layer_metrics.forward_projection", "layer_temporal"],
  "04 · Spending": ["layer_metrics.spending_by_domain", "layer_metrics.spending_hierarchy", "layer_metrics.anomalies", "layer_behavioral"],
  "05 · iBag": ["layer_metrics.roundup_projection"],
  "06 · Evidence": ["evidence_boundary", "source_fidelity", "provider_lineage", "evidence_graph", "uncertainty", "validation", "plaid_iris_field_map"],
  "07 · Intelligence": ["intelligence_atlas", "intelligence_composition", "layer_composition", "layer_metrics.provider_domains", "plaid_iris_field_map"],
  "08 · Behavior": ["layer_behavioral", "layer_temporal", "layer_metrics.anomalies"],
  "09 · Reasoning": ["layer_reasoning", "causal_analysis", "intelligence_graph", "investigations"],
  "10 · Decisions": ["decision_graph", "decision_intelligence", "consequence_model", "optimization_intelligence", "goal_intelligence"],
  "11 · Simulation": ["counterfactual_intelligence"],
  "12 · Maximum Intelligence": ["layer_max_intelligence", "higher_order_synthesis", "adversarial_reasoning", "meta_intelligence", "iris_governor", "iris_feature_registry"],
};

const SHARED_ROOTS = new Set(["layer_behavioral", "layer_temporal", "layer_metrics.anomalies", "plaid_iris_field_map"]);

function getAt(root: any, path: string) { return path.split(".").reduce((value, key) => value == null ? undefined : value[key], root); }
function flatten(value: any, path: string, inheritedEvidence?: string): Array<{ path: string; value: any; evidence?: string; type: string }> {
  const evidence = value && typeof value === "object" && typeof value.evidence_state === "string" ? value.evidence_state : inheritedEvidence;
  if (value === null || value === undefined || typeof value !== "object") return [{ path, value, evidence, type: value === null ? "null" : typeof value }];
  if (Array.isArray(value)) {
    const rows: Array<{ path: string; value: any; evidence?: string; type: string }> = [{ path, value: `[${value.length} items]`, evidence, type: "array" }];
    value.forEach((item, index) => rows.push(...flatten(item, `${path}[${index}]`, evidence)));
    return rows;
  }
  const rows: Array<{ path: string; value: any; evidence?: string; type: string }> = [{ path, value: "{object}", evidence, type: "object" }];
  Object.keys(value).sort().forEach(key => rows.push(...flatten(value[key], path ? `${path}.${key}` : key, evidence)));
  return rows;
}
function formatExact(value: any) { if (typeof value === "string") return value; if (value === undefined) return "undefined"; return JSON.stringify(value); }
function FieldTree({ value, path, evidence }: { value: any; path: string; evidence?: string }) {
  const [open, setOpen] = useState(false);
  const currentEvidence = value && typeof value === "object" && typeof value.evidence_state === "string" ? value.evidence_state : evidence;
  if (value === null || value === undefined || typeof value !== "object") return <div className="iris-field-row"><code>{path}</code><span className="iris-field-value">{formatExact(value)}</span>{currentEvidence && <small>{currentEvidence}</small>}</div>;
  const entries = Array.isArray(value) ? value.map((item, i) => [String(i), item] as const) : Object.entries(value);
  return <details className="iris-field-node" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary><code>{path}</code><span>{Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`}</span>{currentEvidence && <small>{currentEvidence}</small>}</summary><div className="iris-field-children">{entries.map(([key, child]) => <FieldTree key={`${path}.${key}`} value={child} path={`${path}.${key}`} evidence={currentEvidence}/>)}</div></details>;
}

function PlaidFieldExplorer({ map }: { map: any }) {
  const [product, setProduct] = useState<string>("all");
  const [onlyMapped, setOnlyMapped] = useState(false);
  const products = Object.keys(map?.mapping ?? {});
  const fields = (map?.fields ?? []).filter((field: any) => product === "all" || field.product === product).filter((field: any) => !onlyMapped || (field.iris_layers?.length ?? 0) > 0);
  return <div className="iris-plaid-field-explorer">
    <div className="iris-complete-field-controls"><strong>Plaid → Iris exact field lineage</strong><span>{map?.counts?.unique_fields ?? 0} unique fields · {map?.counts?.field_occurrences ?? 0} occurrences · {map?.counts?.data_records ?? 0} data records</span></div>
    <div className="iris-complete-field-controls"><select value={product} onChange={e => setProduct(e.target.value)}><option value="all">All 8 Plaid products</option>{products.map(p => <option key={p} value={p}>{p}</option>)}</select><button type="button" onClick={() => setOnlyMapped(v => !v)}>{onlyMapped ? "Show all fields" : "Show mapped fields only"}</button></div>
    <div className="iris-field-tier"><summary><strong>Every exact provider field</strong><span>{fields.length}</span></summary><div>{fields.map((field: any) => <details key={field.field_id} className="iris-field-node"><summary><code>{field.product}:{field.path}</code><span>{field.field_id}</span><small>{field.evidence_state}</small></summary><div className="iris-field-children"><div className="iris-field-row"><code>data_id</code><span className="iris-field-value">{field.data_id}</span></div><div className="iris-field-row"><code>source_observation_id</code><span className="iris-field-value">{field.source_observation_id}</span></div><div className="iris-field-row"><code>item_id</code><span className="iris-field-value">{field.item_id}</span></div><div className="iris-field-row"><code>value</code><span className="iris-field-value">{formatExact(field.value)}</span></div><div className="iris-field-row"><code>iris_layers</code><span className="iris-field-value">{(field.iris_layers ?? []).join(" · ")}</span></div><div className="iris-field-row"><code>lineage</code><span className="iris-field-value">{field.lineage}</span></div></div></details>)}</div></div>
  </div>;
}

export function IrisCompleteFieldMap({ intel }: { intel: any }) {
  const [showAll, setShowAll] = useState(false);
  const mapping = useMemo(() => {
    const assigned = new Set<string>();
    const tiers = Object.entries(TIER_ROOTS).map(([tier, prefixes]) => {
      const entries = prefixes.filter(prefix => getAt(intel, prefix) !== undefined).map(prefix => { assigned.add(prefix); return { prefix, value: getAt(intel, prefix) }; });
      return { tier, entries };
    });
    const allPaths = Object.keys(intel ?? {});
    const mappedTopLevel = new Set<string>(Array.from(assigned).map(path => path.split(".")[0]));
    const unmapped = allPaths.filter(path => !mappedTopLevel.has(path));
    return { tiers, unmapped };
  }, [intel]);
  const flattenedCount = useMemo(() => mapping.tiers.reduce((sum, tier) => sum + tier.entries.reduce((n, entry) => n + flatten(entry.value, entry.prefix).length, 0), 0), [mapping]);
  const sharedCount = mapping.tiers.reduce((n, tier) => n + tier.entries.filter(entry => SHARED_ROOTS.has(entry.prefix)).length, 0);
  const plaidMap = intel?.plaid_iris_field_map;
  return <section className="iris-complete-field-map">
    <div className="iris-complete-field-header"><div><span className="eyebrow">COMPLETE INTELLIGENCE FIELD MAP</span><h2>Plaid provider evidence → Iris, field by field</h2><p>Iris now consumes the current observed Plaid evidence and preserves the exact provider value while attaching stable data IDs, field IDs, source-observation IDs, Item lineage, and Iris-layer mappings. Provider values are not replaced by interpretations.</p></div><div className="iris-complete-field-stats"><b>{flattenedCount.toLocaleString()}</b><span>mapped Iris fields / nodes</span><b>{mapping.unmapped.length}</b><span>unmapped top-level roots</span></div></div>
    {plaidMap && <PlaidFieldExplorer map={plaidMap}/>} 
    <div className="iris-complete-field-controls"><button type="button" onClick={() => setShowAll(v => !v)}>{showAll ? "Hide Iris exact field explorer" : "Open Iris exact field explorer"}</button><span>{sharedCount ? `${sharedCount} shared mapping${sharedCount === 1 ? "" : "s"}` : "No shared mappings"}</span></div>
    {showAll && <div className="iris-complete-field-body">{mapping.tiers.map(({ tier, entries }) => <details key={tier} className="iris-field-tier"><summary><strong>{tier}</strong><span>{entries.length} mapped source group{entries.length === 1 ? "" : "s"}</span></summary><div>{entries.map(entry => <FieldTree key={entry.prefix} value={entry.value} path={entry.prefix}/>)}</div></details>)}<details className="iris-field-tier iris-field-unmapped"><summary><strong>Coverage check · unmapped roots</strong><span>{mapping.unmapped.length}</span></summary>{mapping.unmapped.length ? <div>{mapping.unmapped.map(root => <FieldTree key={root} value={intel[root]} path={root}/>)}</div> : <p>PASS — every top-level field returned by the current Iris intelligence payload is assigned to at least one governing tier.</p>}</details></div>}
  </section>;
}
