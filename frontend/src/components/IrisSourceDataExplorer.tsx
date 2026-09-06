import { useMemo, useState, type ReactNode } from "react";

type AnyRecord = Record<string, any>;

const label = (v: unknown) => String(v ?? "—").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
const protectedKey = (key: string) => /access.?token|refresh.?token|secret|api.?key|password|authorization|client.?secret/i.test(key);

function Value({ value }: { value: any }) {
  if (value === null || value === undefined) return <span>—</span>;
  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  if (typeof value === "number") return <span>{Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 8 }) : "—"}</span>;
  if (typeof value === "string") return <span>{value}</span>;
  if (Array.isArray(value)) return <span>{value.length} records</span>;
  return <span>{Object.keys(value).length} fields</span>;
}

function Tree({ value, path = "$", depth = 0 }: { value: any; path?: string; depth?: number }): ReactNode {
  if (value === null || typeof value !== "object") return <Value value={value} />;
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  return <div className="iris4-tree">
    {entries.map(([key, child]) => {
      if (protectedKey(key)) return <div className="iris4-tree-leaf" key={`${path}.${key}`}><span>{label(key)}</span><span>protected</span></div>;
      const next = `${path}.${key}`;
      const complex = child !== null && typeof child === "object";
      return complex
        ? <details key={next} className="iris4-tree-node" open={depth < 1}>
            <summary><span>{label(key)}</span><small>{Array.isArray(child) ? `${child.length} records` : `${Object.keys(child).length} fields`}</small></summary>
            <div className="iris4-tree-child"><Tree value={child} path={next} depth={depth + 1} /></div>
          </details>
        : <div key={next} className="iris4-tree-leaf"><span>{label(key)}</span><Value value={child} /></div>;
    })}
  </div>;
}

export function IrisSourceDataExplorer({ surface, intelligence }: { surface: any; intelligence: any }) {
  const [product, setProduct] = useState<string>("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"fields" | "records" | "derived">("fields");

  const architecture = surface?.complete_field_architecture;
  const fields = useMemo(() => (architecture?.fields ?? []).filter((field: any) => {
    const productMatch = !product || field.product === product;
    const queryMatch = !query || JSON.stringify(field).toLowerCase().includes(query.toLowerCase());
    return productMatch && queryMatch;
  }), [architecture, product, query]);

  const records = useMemo(() => (surface?.provider_evidence ?? []).filter((record: any) => {
    const productMatch = !product || record.product === product;
    const queryMatch = !query || JSON.stringify(record).toLowerCase().includes(query.toLowerCase());
    return productMatch && queryMatch;
  }), [surface, product, query]);

  const derived = useMemo(() => (intelligence?.iris_field_architecture?.derived_fields ?? []).filter((field: any) => {
    const queryMatch = !query || JSON.stringify(field).toLowerCase().includes(query.toLowerCase());
    return queryMatch;
  }), [intelligence, query]);

  const counts = architecture?.counts ?? {};
  const products = surface?.canonical_products ?? [];

  return <section className="iris-surface">
    <div className="iris-section-head"><span>EXHAUSTIVE IRIS SOURCE DATA EXPLORER</span><b>{mode === "fields" ? fields.length : mode === "records" ? records.length : derived.length}</b></div>
    <p className="iris4-note">Live, evidence-gated source boundary. Provider field names, paths, observed values, record coverage and Iris-derived fields remain additive and traceable. Protected credentials are never exposed.</p>

    <div className="iris-metric-grid">
      <article className="iris-surface-card"><span>Unique provider fields</span><strong>{counts.unique_provider_fields ?? 0}</strong></article>
      <article className="iris-surface-card"><span>Total source fields</span><strong>{counts.total_fields ?? 0}</strong></article>
      <article className="iris-surface-card"><span>Observed records</span><strong>{counts.records ?? 0}</strong></article>
      <article className="iris-surface-card"><span>Provider products</span><strong>{counts.products_or_capabilities ?? products.length}</strong></article>
    </div>

    <div className="plaid-deep-filters">
      <select value={product} onChange={e => setProduct(e.target.value)}>
        <option value="">All provider products</option>
        {products.map((p: string) => <option key={p} value={p}>{label(p)}</option>)}
      </select>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search every field, path, value, record or derived field…" />
      <button type="button" onClick={() => setMode("fields")} className={mode === "fields" ? "active" : ""}>All Fields</button>
      <button type="button" onClick={() => setMode("records")} className={mode === "records" ? "active" : ""}>All Records</button>
      <button type="button" onClick={() => setMode("derived")} className={mode === "derived" ? "active" : ""}>Iris Derived</button>
    </div>

    {mode === "fields" && <div className="field-path-list">
      {fields.length === 0 && <div className="plaid-empty">No matching source fields.</div>}
      {fields.map((field: any, index: number) => <details key={`${field.field_id ?? field.path}-${index}`} className="iris4-snapshot">
        <summary><strong>{field.path}</strong><small>{label(field.product)} · {field.occurrence_count ?? 0} occurrences</small></summary>
        <div className="iris4-tree-child">
          <div className="iris-metric-grid">
            <article className="iris-surface-card"><span>Provider field</span><strong>{field.exact_provider_field_name}</strong></article>
            <article className="iris-surface-card"><span>Type</span><strong>{field.value_type}</strong></article>
            <article className="iris-surface-card"><span>Records</span><strong>{field.source_record_ids?.length ?? 0}</strong></article>
            <article className="iris-surface-card"><span>Evidence</span><strong>{label(field.evidence_state)}</strong></article>
          </div>
          <div className="iris-surface-card"><span>Current representative value</span><p><Value value={field.value} /></p><small>{field.lineage}</small></div>
        </div>
      </details>)}
    </div>}

    {mode === "records" && <div className="iris4-source-grid">
      {records.length === 0 && <div className="plaid-empty">No matching observed provider records.</div>}
      {records.map((record: AnyRecord, index: number) => <details key={`${record.id ?? index}`} className="iris4-snapshot">
        <summary><strong>{label(record.product ?? record.source_domain)}</strong><small>{record.id ?? `record-${index + 1}`} · {record.acquired_at ?? record.fetched_at ?? record.observed_at ?? "time unavailable"}</small></summary>
        <Tree value={record.raw_response} path={`${record.product ?? "provider"}.record`} />
      </details>)}
    </div>}

    {mode === "derived" && <div className="iris4-source-grid">
      {derived.length === 0 && <div className="plaid-empty">No matching Iris-derived fields.</div>}
      {derived.map((field: AnyRecord, index: number) => <article className="iris-surface-card" key={`${field.field_id ?? index}`}>
        <span>{field.field_name}</span>
        <strong>{field.domain ?? "Iris"} · {field.subdomain ?? field.analysis_id ?? "Derived intelligence"}</strong>
        <p><Value value={field.value} /></p>
        <small>{field.operation ?? "derived"} · {field.evidence_state ?? "unknown"} · {field.lineage ?? "lineage unavailable"}</small>
      </article>)}
    </div>}
  </section>;
}
