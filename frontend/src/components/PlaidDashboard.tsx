import { useMemo, useState } from "react";
import "../styles/plaid-dashboard.css";

type Product = { key?: string; product?: string; displayName?: string; status?: string; description?: string; item_count?: number; observed_item_count?: number };
type Item = { item_id?: string; institution_name: string | null; status: string; last_synced_at: string | null; products?: { key: string; displayName: string; status: string; observed: boolean }[] };
type Account = { id: string; item_id: string; plaid_account_id: string; name: string; official_name?: string | null; mask?: string | null; type?: string | null; subtype?: string | null; current_balance?: number | null; available_balance?: number | null; credit_limit?: number | null; balance_updated_at?: string | null };
type Evidence = { id: string; item_id?: string; account_id?: string; product: string; raw_response?: unknown; provider_object_id?: string | null; acquired_at?: string | null; effective_at?: string | null; evidence_state?: string; is_current?: boolean };
type Surface = { catalog_version?: string; source?: string; canonical_products?: string[]; items: Item[]; products: Product[]; accounts?: Account[]; provider_evidence?: Evidence[]; provider_evidence_counts?: Record<string, number>; source_boundary?: string; complete_field_architecture?: any };

const PRODUCT_NAMES: Record<string,string> = { auth: "Auth", transactions: "Transactions", balance: "Balance", identity: "Identity", assets: "Assets", liabilities: "Liabilities", investments: "Investments", statements: "Statements" };
const productKey = (p: Product) => p.key ?? p.product ?? "unknown";
const productName = (p: Product) => p.displayName ?? PRODUCT_NAMES[productKey(p)] ?? productKey(p);
const money = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const json = (v: unknown) => JSON.stringify(v, null, 2);

function ArchitectureNode({ node }: { node: any }) {
  if (!node) return null;
  return <details className="plaid-evidence-card"><summary><strong>{node.name}</strong><span>depth {node.depth ?? 0}</span><small>{node.field_count ?? 0} fields</small></summary>{node.children?.length ? <div className="plaid-evidence-list">{node.children.map((child: any, index: number) => <ArchitectureNode key={`${child.name}-${index}`} node={child}/>)}</div> : null}</details>;
}

export function PlaidDashboard({ surface, onRefresh }: { surface: Surface | null; selection?: unknown; onRefresh: () => void }) {
  const [view, setView] = useState("overview");
  const [product, setProduct] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const products = (surface?.products ?? []).filter((p) => PRODUCT_NAMES[productKey(p)]);
  const accounts = surface?.accounts ?? [];
  const evidence = surface?.provider_evidence ?? [];
  const architecture = surface?.complete_field_architecture;
  const fields = (architecture?.provider_payload_fields ?? []).filter((field: any) => {
    if (product !== "all" && field.product !== product) return false;
    return !query || `${field.product} ${field.field_name} ${field.path}`.toLowerCase().includes(query.toLowerCase());
  });
  const productsOrCapabilities = architecture?.products_and_capabilities ?? [];
  const observedCount = products.filter((p) => p.status === "observed").length;
  const evidenceFor = (key: string) => evidence.filter((row) => row.product === key);
  const domainCounts = useMemo(() => Object.fromEntries(Object.keys(PRODUCT_NAMES).map((p) => [p, evidenceFor(p).length])), [evidence]);

  return <section className="plaid-page">
    <div className="plaid-intro"><div><span className="plaid-kicker">PLAID SOURCE • READ ONLY • FIELD-FIRST</span><h1>Plaid Dashboard</h1><p>Plaid is the complete provider/source architecture. The screen preserves exact provider field names and values, while product cards remain a view into the underlying field universe.</p></div><button className="plaid-refresh" onClick={onRefresh}>Refresh provider state</button></div>
    <div className="plaid-rule"><strong>Source boundary</strong><span>Plaid provider facts only</span><span>•</span><span>Dynamic architecture depth</span><span>•</span><span>Read only</span></div>
    <nav className="plaid-tier-nav" aria-label="Plaid source views">{[["overview","Overview"],["fields","Complete Fields"],["hierarchy","Field Hierarchy"],["products","Canonical Products"],["institutions","Institutions"],["accounts","Accounts"],["evidence","Evidence"]].map(([id,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><strong>{label}</strong><small>{id === "fields" ? `${architecture?.counts?.unique_provider_fields ?? 0} fields` : id === "products" ? "8 canonical" : "Source architecture"}</small></button>)}</nav>

    {view === "overview" && <>
      <div className="plaid-source-summary plaid-eight-summary"><div><span>CANONICAL PRODUCTS</span><strong>8</strong><small>Auth · Transactions · Balance · Identity · Assets · Liabilities · Investments · Statements</small></div><div><span>OBSERVED NOW</span><strong>{observedCount}/8</strong><small>Current provider observations represented</small></div><div><span>PROVIDER RECORDS</span><strong>{architecture?.counts?.records ?? evidence.length}</strong><small>Current observed source records</small></div><div><span>PROVIDER FIELDS</span><strong>{architecture?.counts?.unique_provider_fields ?? 0}</strong><small>Unique exact provider field paths</small></div></div>
      <div className="plaid-product-grid plaid-eight-grid">{products.map((p) => <article className="plaid-product" key={productKey(p)}><div className="plaid-product-head"><span>{productName(p)}</span><b className={`plaid-product-status ${p.status ?? "unknown"}`}>{p.status ?? "unknown"}</b></div><p>{p.description ?? "Canonical Plaid evidence domain."}</p><div className="plaid-product-state"><span>{p.item_count ?? 0} Items</span><span>{p.observed_item_count ?? 0} observed</span><span>{domainCounts[productKey(p)] ?? 0} evidence records</span></div></article>)}</div>
      </>}

    {view === "fields" && <section className="plaid-evidence-audit"><div className="plaid-section-title"><div><span>COMPLETE PROVIDER FIELD UNIVERSE</span><h2>Every current observed Plaid field</h2></div><small>{fields.length} shown</small></div><div className="plaid-complete-field-controls"><select value={product} onChange={e => setProduct(e.target.value)}><option value="all">All observed products / capabilities</option>{productsOrCapabilities.map((p: string) => <option key={p} value={p}>{p}</option>)}</select><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search exact provider field"/></div><div className="plaid-evidence-list">{fields.map((field: any) => <article className="plaid-evidence-card" key={field.field_id}><div className="plaid-evidence-head"><div><strong>{field.product}</strong><small>{field.path}</small></div><span>{field.evidence_state}</span></div><div className="plaid-evidence-meta"><span>Field: {field.exact_provider_field_name}</span><span>Record: {field.source_record_id}</span><span>Item: {field.item_id}</span></div><pre className="plaid-json">{json({ value: field.protected ? "[protected]" : field.value, source_table: field.source_table, canonical_path: field.canonical_path, lineage: field.lineage })}</pre></article>)}{!fields.length && <div className="plaid-empty">No current observed field matches.</div>}</div></section>}

    {view === "hierarchy" && <section className="plaid-evidence-audit"><div className="plaid-section-title"><div><span>DYNAMIC PROVIDER PAYLOAD HIERARCHY</span><h2>Architecture depth follows actual data</h2></div><small>{architecture?.tier_definitions?.length ?? 0} structural levels</small></div><p className="plaid-readonly-notice">This is not an arbitrary 8- or 12-tier model. Structural depth is generated from the actual observed provider payloads; new provider nesting can create deeper levels without redesigning the architecture.</p><ArchitectureNode node={architecture?.hierarchy}/></section>}

    {view === "products" && <div className="plaid-product-grid plaid-eight-grid">{products.map((p) => <article className="plaid-product" key={productKey(p)}><div className="plaid-product-head"><span>{productName(p)}</span><b className={`plaid-product-status ${p.status ?? "unknown"}`}>{p.status ?? "unknown"}</b></div><p>{p.description ?? "Canonical Plaid evidence domain."}</p><div className="plaid-product-state"><span>{domainCounts[productKey(p)] ?? 0} evidence records</span><span>{p.observed_item_count ?? 0} observed Items</span></div></article>)}</div>}

    {view === "institutions" && <div className="plaid-institutions">{(surface?.items ?? []).map((item, index) => <article className="plaid-institution" key={`${item.item_id ?? "item"}-${index}`}><div><span className="plaid-status-dot"/><strong>{item.institution_name ?? "Connected institution"}</strong></div><span>{item.status}</span><small>Last synced {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : "—"}</small><div className="plaid-item-products">{(item.products ?? []).map((p) => <span key={p.key} className={p.status}>{p.displayName}: {p.status}</span>)}</div></article>)}</div>}

    {view === "accounts" && <div className="plaid-account-grid">{accounts.map((account) => <article className="plaid-account-card" key={account.id}><strong>{account.name}</strong><small>{account.official_name ?? ""}</small><span>{account.type ?? "account"} · {account.subtype ?? ""}{account.mask ? ` · •••• ${account.mask}` : ""}</span><div><b>Current balance</b><strong>{money(account.current_balance)}</strong></div><div><b>Available balance</b><strong>{money(account.available_balance)}</strong></div>{account.credit_limit != null && <div><b>Credit limit</b><strong>{money(account.credit_limit)}</strong></div>}<small>Balance updated {account.balance_updated_at ? new Date(account.balance_updated_at).toLocaleString() : "—"}</small></article>)}</div>}

    {view === "evidence" && <div className="plaid-evidence-audit"><div className="plaid-source-summary plaid-eight-summary">{Object.entries(PRODUCT_NAMES).map(([key, name]) => <div key={key}><span>{name.toUpperCase()}</span><strong>{domainCounts[key] ?? 0}</strong><small>current observed provider evidence records</small></div>)}</div>{evidence.map((row) => { const key = `${row.product}:${row.id}`; const open = expanded === key; return <article className="plaid-evidence-card" key={key}><div className="plaid-evidence-head"><div><strong>{PRODUCT_NAMES[row.product] ?? row.product}</strong><small>{row.provider_object_id ?? "Provider observation"}</small></div><span>{row.evidence_state ?? "observed"}</span></div><div className="plaid-evidence-meta"><span>Acquired {row.acquired_at ? new Date(row.acquired_at).toLocaleString() : "—"}</span><span>Current {row.is_current === false ? "No" : "Yes"}</span></div><button className="plaid-evidence-toggle" onClick={() => setExpanded(open ? null : key)}>{open ? "Hide provider payload" : "View provider payload"}</button>{open && <pre className="plaid-json">{json(row.raw_response)}</pre>}</article>; })}</div>}

    <div className="plaid-tier-footer"><span>Architecture</span><strong>Provider fields first</strong><span>·</span><span>{architecture?.counts?.unique_provider_fields ?? 0} unique fields</span><span>·</span><span>{architecture?.tier_definitions?.length ?? 0} dynamic structural levels</span><span>·</span><span>Canonical products remain applications over the source field universe.</span></div>
  </section>;
}
