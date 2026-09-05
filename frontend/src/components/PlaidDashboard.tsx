import { useMemo, useState } from "react";
import "../styles/plaid-dashboard.css";

type Product = { key?: string; product?: string; displayName?: string; status?: string; category?: string; description?: string; phase1Relevant?: boolean; irisCapabilities?: string[]; capabilities?: string[]; item_count?: number; observed_item_count?: number; active_item_count?: number; consented_item_count?: number; available_item_count?: number; unavailable_item_count?: number };
type Item = { item_id?: string; institution_name: string | null; status: string; last_synced_at: string | null; products?: { key: string; displayName: string; status: string; observed: boolean }[] };
type Account = { id: string; item_id: string; plaid_account_id: string; name: string; official_name?: string | null; mask?: string | null; type?: string | null; subtype?: string | null; current_balance?: number | null; available_balance?: number | null; credit_limit?: number | null; balance_updated_at?: string | null };
type Evidence = { id: string; item_id?: string; account_id?: string; product: string; source_domain?: string; raw_response?: unknown; provider_object_id?: string | null; acquired_at?: string | null; effective_at?: string | null; fetched_at?: string | null; evidence_state?: string; provenance?: unknown; observation_version?: string | null; observation_hash?: string | null; is_current?: boolean };
type Surface = { catalog_version?: string; source?: string; canonical_products?: string[]; items: Item[]; products: Product[]; accounts?: Account[]; provider_evidence?: Evidence[]; provider_evidence_counts?: Record<string, number>; product_state_legend?: Record<string,string>; source_boundary?: string };
type Tier = "overview" | "institutions" | "accounts" | "transactions" | "auth_identity" | "assets" | "liabilities" | "investments" | "statements" | "evidence";

const PRODUCT_NAMES: Record<string,string> = { auth: "Auth", transactions: "Transactions", balance: "Balance", identity: "Identity", assets: "Assets", liabilities: "Liabilities", investments: "Investments", statements: "Statements" };
const TIERS: { id: Tier; label: string; products: string }[] = [
  { id: "overview", label: "01 Overview", products: "All 8" },
  { id: "institutions", label: "02 Institutions", products: "Connection state" },
  { id: "accounts", label: "03 Accounts & Balance", products: "Balance" },
  { id: "transactions", label: "04 Transactions", products: "Transactions" },
  { id: "auth_identity", label: "05 Auth & Identity", products: "Auth · Identity" },
  { id: "assets", label: "06 Assets", products: "Assets" },
  { id: "liabilities", label: "07 Liabilities", products: "Liabilities" },
  { id: "investments", label: "08 Investments", products: "Investments" },
  { id: "statements", label: "09 Statements", products: "Statements" },
  { id: "evidence", label: "10 Evidence", products: "All 8 source lineage" },
];
const title = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const productKey = (p: Product) => p.key ?? p.product ?? "unknown";
const productName = (p: Product) => p.displayName ?? PRODUCT_NAMES[productKey(p)] ?? title(productKey(p));
const money = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const json = (v: unknown) => JSON.stringify(v, null, 2);
const text = (v: unknown) => typeof v === "string" ? v : v == null ? "—" : String(v);

export function PlaidDashboard({ surface, onRefresh }: { surface: Surface | null; selection?: unknown; onRefresh: () => void }) {
  const [tier, setTier] = useState<Tier>("overview");
  const products = (surface?.products ?? []).filter((p) => PRODUCT_NAMES[productKey(p)]);
  const accounts = surface?.accounts ?? [];
  const evidence = surface?.provider_evidence ?? [];
  const observedCount = products.filter((p) => p.status === "observed").length;
  const evidenceFor = (product: string) => evidence.filter((row) => row.product === product);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  const domainCounts = useMemo(() => Object.fromEntries(Object.keys(PRODUCT_NAMES).map((p) => [p, evidenceFor(p).length])), [evidence]);
  const currentTier = TIERS.find((t) => t.id === tier)!;

  function ProductCards() {
    return <div className="plaid-product-grid plaid-eight-grid">{products.map((product) => <article className="plaid-product" key={productKey(product)}><div className="plaid-product-head"><span>{productName(product)}</span><b className={`plaid-product-status ${product.status ?? "unknown"}`}>{title(product.status ?? "unknown")}</b></div><p>{product.description ?? "Canonical Plaid evidence domain."}</p><div className="plaid-product-state"><span>{product.item_count ?? 0} Items</span><span>{product.observed_item_count ?? 0} observed</span><span>{domainCounts[productKey(product)] ?? 0} evidence records</span></div></article>)}</div>;
  }

  function EvidenceList({ domain }: { domain: string }) {
    const rows = evidenceFor(domain);
    return <div className="plaid-evidence-list">{rows.length ? rows.map((row) => { const key = `${domain}:${row.id}`; const open = expandedEvidence === key; return <article className="plaid-evidence-card" key={key}><div className="plaid-evidence-head"><div><strong>{PRODUCT_NAMES[domain]}</strong><small>{row.provider_object_id ? `Provider object ${row.provider_object_id}` : "Provider observation"}</small></div><span>{row.evidence_state ?? "observed"}</span></div><div className="plaid-evidence-meta"><span>Acquired {row.acquired_at ? new Date(row.acquired_at).toLocaleString() : "—"}</span><span>Effective {row.effective_at ? new Date(row.effective_at).toLocaleString() : "—"}</span><span>Current {row.is_current === false ? "No" : "Yes"}</span></div><button className="plaid-evidence-toggle" onClick={() => setExpandedEvidence(open ? null : key)}>{open ? "Hide provider payload" : "View provider payload"}</button>{open && <pre className="plaid-json">{json(row.raw_response)}</pre>}</article>; }) : <div className="plaid-empty">No current observed provider evidence recorded for {PRODUCT_NAMES[domain]}.</div>}</div>;
  }

  function Transactions() {
    const rows = evidenceFor("transactions");
    return <div className="plaid-table-wrap"><table className="plaid-table"><thead><tr><th>Date</th><th>Merchant / Name</th><th>Amount</th><th>Category</th><th>Channel</th><th>Pending</th><th>Account</th><th>Provider transaction</th><th>Evidence</th></tr></thead><tbody>{rows.map((row) => {
      const raw = row.raw_response && typeof row.raw_response === "object" ? row.raw_response as Record<string, unknown> : {};
      const category = Array.isArray(raw.category) ? raw.category.join(" / ") : text(raw.category);
      const pfc = raw.personal_finance_category && typeof raw.personal_finance_category === "object" ? raw.personal_finance_category as Record<string, unknown> : null;
      const pfcText = pfc ? text(pfc.detailed ?? pfc.primary) : "—";
      const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount);
      const key = `tx:${row.id}`;
      const open = expandedTransaction === key;
      return <tr key={row.id}>
        <td>{text(raw.date ?? (row.effective_at ? new Date(row.effective_at).toLocaleDateString() : row.fetched_at ? new Date(row.fetched_at).toLocaleDateString() : null))}</td>
        <td><strong>{text(raw.merchant_name ?? raw.name)}</strong>{raw.merchant_name && raw.name && raw.merchant_name !== raw.name ? <small>{text(raw.name)}</small> : null}</td>
        <td>{Number.isFinite(amount) ? money(amount) : text(raw.amount)}</td>
        <td>{category !== "—" ? category : pfcText}</td>
        <td>{text(raw.payment_channel)}</td>
        <td>{text(raw.pending)}</td>
        <td>{row.account_id ?? "—"}</td>
        <td>{row.provider_object_id ?? "—"}</td>
        <td><span>{row.evidence_state ?? "observed"}</span><button className="plaid-evidence-toggle" onClick={() => setExpandedTransaction(open ? null : key)}>{open ? "Hide raw" : "Raw"}</button>{open && <pre className="plaid-json">{json(row.raw_response)}</pre>}</td>
      </tr>;
    })}</tbody></table>{!rows.length && <div className="plaid-empty">No current observed Transactions evidence.</div>}</div>;
  }

  return <section className="plaid-page">
    <div className="plaid-intro"><div><span className="plaid-kicker">PLAID SOURCE • READ ONLY • CANONICAL 8</span><h1>Plaid Dashboard</h1><p>Only the eight canonical Plaid evidence domains are displayed here. Provider facts remain source-of-truth data; this dashboard does not rewrite, calculate, infer, or enrich them.</p></div><button className="plaid-refresh" onClick={onRefresh}>Refresh provider state</button></div>
    <div className="plaid-rule"><strong>Source boundary</strong><span>Plaid provider facts only</span><span>•</span><span>8 canonical domains only</span><span>•</span><span>Read only</span></div>
    <nav className="plaid-tier-nav" aria-label="Plaid dashboard tiers">{TIERS.map((t) => <button key={t.id} className={tier === t.id ? "active" : ""} onClick={() => setTier(t.id)}><strong>{t.label}</strong><small>{t.products}</small></button>)}</nav>
    <div className="plaid-tier-heading"><div><span>TIER {TIERS.findIndex((t) => t.id === tier) + 1} / {TIERS.length}</span><h2>{currentTier.label.replace(/^\d+ /, "")}</h2></div><small>{currentTier.products}</small></div>
    {tier === "overview" && <><div className="plaid-source-summary plaid-eight-summary"><div><span>CANONICAL DOMAINS</span><strong>8</strong><small>Auth · Transactions · Balance · Identity · Assets · Liabilities · Investments · Statements</small></div><div><span>OBSERVED NOW</span><strong>{observedCount}/8</strong><small>Current provider observations represented on this dashboard</small></div><div><span>PROVIDER EVIDENCE</span><strong>{evidence.length}</strong><small>Current observed evidence records surfaced from Plaid-backed storage</small></div><div><span>CONNECTED ITEMS</span><strong>{surface?.items?.length ?? 0}</strong><small>Each Item remains independently identified</small></div></div><ProductCards /></>}
    {tier === "institutions" && <div className="plaid-institutions">{(surface?.items ?? []).map((item, index) => <article className="plaid-institution" key={`${item.item_id ?? "item"}-${index}`}><div><span className="plaid-status-dot"/><strong>{item.institution_name ?? "Connected institution"}</strong></div><span>{title(item.status)}</span><small>Last synced {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : "—"}</small><div className="plaid-item-products">{(item.products ?? []).map((p) => <span key={p.key} className={p.status}>{p.displayName}: {title(p.status)}</span>)}</div></article>)}</div>}
    {tier === "accounts" && <div className="plaid-account-grid">{accounts.map((account) => <article className="plaid-account-card" key={account.id}><strong>{account.name}</strong><small>{account.official_name ?? ""}</small><span>{title(account.type ?? "account")} · {title(account.subtype ?? "")}{account.mask ? ` · •••• ${account.mask}` : ""}</span><div><b>Current balance</b><strong>{money(account.current_balance)}</strong></div><div><b>Available balance</b><strong>{money(account.available_balance)}</strong></div>{account.credit_limit != null && <div><b>Credit limit</b><strong>{money(account.credit_limit)}</strong></div>}<small>Balance updated {account.balance_updated_at ? new Date(account.balance_updated_at).toLocaleString() : "—"}</small></article>)}</div>}
    {tier === "transactions" && <Transactions />}
    {tier === "auth_identity" && <div className="plaid-domain-columns"><section><div className="plaid-section-title"><div><span>AUTH</span><h2>Auth provider evidence</h2></div><small>{domainCounts.auth ?? 0} records</small></div><EvidenceList domain="auth" /></section><section><div className="plaid-section-title"><div><span>IDENTITY</span><h2>Identity provider evidence</h2></div><small>{domainCounts.identity ?? 0} records</small></div><EvidenceList domain="identity" /></section></div>}
    {tier === "assets" && <EvidenceList domain="assets" />}
    {tier === "liabilities" && <EvidenceList domain="liabilities" />}
    {tier === "investments" && <EvidenceList domain="investments" />}
    {tier === "statements" && <EvidenceList domain="statements" />}
    {tier === "evidence" && <div className="plaid-evidence-audit"><div className="plaid-source-summary plaid-eight-summary">{Object.entries(PRODUCT_NAMES).map(([key, name]) => <div key={key}><span>{name.toUpperCase()}</span><strong>{domainCounts[key] ?? 0}</strong><small>current observed provider evidence records</small></div>)}</div><div className="plaid-readonly-notice"><strong>RAW SOURCE BOUNDARY</strong><p>{surface?.source_boundary ?? "Provider evidence is read-only. The underlying Plaid source-of-truth records are not modified by this dashboard."}</p></div><EvidenceList domain="auth" /><EvidenceList domain="transactions" /><EvidenceList domain="balance" /><EvidenceList domain="identity" /><EvidenceList domain="assets" /><EvidenceList domain="liabilities" /><EvidenceList domain="investments" /><EvidenceList domain="statements" /></div>}
    <div className="plaid-tier-footer"><span>Current tier</span><strong>{currentTier.label}</strong><span>·</span><span>{currentTier.products}</span><span>·</span><span>Nothing outside the canonical eight is displayed.</span></div>
  </section>;
}
