import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import "../styles/plaid-dashboard.css";

type Product = { key?: string; product?: string; displayName?: string; status?: string; category?: string; description?: string; phase1Relevant?: boolean; irisCapabilities?: string[]; capabilities?: string[]; item_count?: number; observed_item_count?: number; active_item_count?: number; consented_item_count?: number; available_item_count?: number; unavailable_item_count?: number; score?: number };
type Item = { institution_name: string | null; status: string; last_synced_at: string | null; selected?: Product[]; billed_products?: string[]; available_products?: string[]; consented_products?: string[]; observed_products?: string[] };
type Surface = { catalog_version?: string; source?: string; items: Item[]; products: Product[]; product_state_legend?: Record<string,string>; note?: string };
type Selection = { strategy: string; selected: Product[]; items: { institution_name: string | null; status: string; last_synced_at: string | null; selected: Product[] }[] };
type Account = { id: string; name: string; mask?: string | null; type?: string | null; roundup_enabled?: boolean | null };
const title = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const productKey = (p: Product) => p.key ?? p.product ?? "unknown";
const productName = (p: Product) => p.displayName ?? title(productKey(p));

export function PlaidDashboard({ surface, selection, onRefresh }: { surface: Surface | null; selection: Selection | null; onRefresh: () => void }) {
  const products = surface?.products ?? [];
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    api.getOverview().then((data) => setAccounts(data.accounts ?? [])).catch(() => setAccounts([]));
  }, [surface]);

  async function setRoundup(accountId: string, enabled: boolean) {
    setUpdating(accountId); setToggleError(null);
    try {
      const result = await api.toggleAccountRoundup(accountId, enabled);
      setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, roundup_enabled: result.roundup_enabled ?? enabled } : account));
    } catch (err) { setToggleError(err instanceof Error ? err.message : "Unable to update Round-Ups."); }
    finally { setUpdating(null); }
  }

  const categories = useMemo(() => ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))], [products]);
  const visibleProducts = category === "all" ? products : products.filter((p) => p.category === category);
  const activeCount = products.filter((p) => p.status === "active").length;
  const availableCount = products.filter((p) => p.status === "available").length;
  const observedCount = products.reduce((sum, p) => sum + (p.observed_item_count ?? 0), 0);

  return <section className="plaid-page">
    <div className="plaid-intro">
      <div><span className="plaid-kicker">PLAID SOURCE • READ ONLY</span><h1>Plaid Dashboard</h1><p>Every Plaid product domain in Iris is presented as provider/source information. Users can inspect it, ask Iris about it, and connect institutions, but cannot edit or rewrite Plaid-sourced facts.</p></div>
      <button className="plaid-refresh" onClick={onRefresh}>Refresh provider state</button>
    </div>
    <div className="plaid-rule"><strong>Immutable source boundary</strong><span>Plaid → provider facts</span><span>•</span><span>Iris → interpretation and intelligence</span><span>•</span><span>iBag → Round-Ups feature controls only</span></div>

    <div className="plaid-source-summary">
      <div><span>CATALOG</span><strong>{products.length}</strong><small>published/integration product domains exposed</small></div>
      <div><span>ACTIVE</span><strong>{activeCount}</strong><small>active on at least one connected Item</small></div>
      <div><span>AVAILABLE</span><strong>{availableCount}</strong><small>reported available by Plaid</small></div>
      <div><span>ACTUALLY OBSERVED</span><strong>{observedCount}</strong><small>live Plaid domain observations recorded by Iris</small></div>
    </div>

    <div className="plaid-section-title"><div><span>CONNECTED INSTITUTIONS</span><h2>Provider connections</h2></div><small>{surface?.items?.length ?? 0} connected Items</small></div>
    <div className="plaid-institutions">{(surface?.items ?? []).map((item, index) => <article className="plaid-institution" key={`${item.institution_name ?? "institution"}-${index}`}><div><span className="plaid-status-dot"/><strong>{item.institution_name ?? "Connected institution"}</strong></div><span>{title(item.status)}</span><small>{item.last_synced_at ? `Last synced ${new Date(item.last_synced_at).toLocaleString()}` : "No sync timestamp"}</small><details><summary>View provider product state</summary><div className="plaid-raw-list"><b>Actually observed</b><span>{item.observed_products?.length ? item.observed_products.map(title).join(" · ") : "No domain observations recorded"}</span><b>Active / billed</b><span>{item.billed_products?.length ? item.billed_products.map(title).join(" · ") : "None reported"}</span><b>Consented</b><span>{item.consented_products?.length ? item.consented_products.map(title).join(" · ") : "None reported"}</span><b>Available</b><span>{item.available_products?.length ? item.available_products.map(title).join(" · ") : "None reported"}</span></div></details></article>)}</div>

    <div className="plaid-section-title"><div><span>PLAID PRODUCT CATALOG</span><h2>Published + integration catalog</h2></div><small>{surface?.catalog_version ?? "Current runtime catalog"}</small></div>
    <p className="plaid-roundup-note">The catalog describes published/integrated Plaid capabilities. A catalog entry is not proof that your institution supports, has consented to, or has activated that capability. Only the connected Item state below is authoritative for your account.</p>
    <div className="plaid-category-tabs">{categories.map((c) => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c === "all" ? "All products" : title(c)}</button>)}</div>
    <div className="plaid-product-grid">{visibleProducts.map((product) => <article className="plaid-product" key={productKey(product)}><div className="plaid-product-head"><span>{productName(product)}</span><b className={`plaid-product-status ${product.status ?? "unknown"}`}>{title(product.status ?? "unknown")}</b></div><small className="plaid-product-category">{title(product.category ?? "provider")}{product.phase1Relevant ? " · Phase 1 relevant" : ""}</small><p>{product.description ?? "Provider product domain. Details are displayed as returned by the catalog/runtime contract."}</p><div className="plaid-product-state"><span>{product.item_count ?? 0} Items evaluated</span><span>{product.observed_item_count ?? 0} observed</span><span>{product.active_item_count ?? 0} active</span><span>{product.consented_item_count ?? 0} consented</span><span>{product.available_item_count ?? 0} available</span></div>{(product.irisCapabilities ?? product.capabilities)?.length ? <div className="plaid-capabilities"><span>What Iris may derive from this source</span><p>{(product.irisCapabilities ?? product.capabilities ?? []).map(title).join(" · ")}</p></div> : null}</article>)}</div>

    <section className="plaid-readonly-notice"><strong>READ-ONLY PROVIDER INFORMATION</strong><p>Product names, descriptions, provider states, institution state, and Plaid-sourced financial information are not editable by the user. Iris may refresh or request an additional consented connection where Plaid supports it; it never changes the underlying provider fact.</p><span>Missing, unavailable, unconsented, expired, or unsupported data remains explicitly identified rather than being converted into zeros or inferred facts.</span></section>

    <section className="plaid-roundup-panel"><div className="plaid-section-title"><div><span>iBAG FEATURE</span><h2>Round-Ups account controls</h2></div><small>{accounts.length} observed accounts</small></div><p className="plaid-roundup-note">This is the only currently defined iBag feature. The controls below determine Round-Up eligibility only. Phase 1 does not move money.</p>{toggleError && <div className="plaid-connect-error" role="alert">{toggleError}</div>}<div className="plaid-roundup-list">{accounts.map((account) => <div className="plaid-roundup-row" key={account.id}><div><strong>{account.name}</strong><small>{title(account.type ?? "account")} · {account.mask ? `•••• ${account.mask}` : "mask unavailable"}</small></div><button type="button" className={`plaid-roundup-toggle ${account.roundup_enabled ? "enabled" : ""}`} onClick={() => void setRoundup(account.id, !account.roundup_enabled)} disabled={updating === account.id} aria-pressed={Boolean(account.roundup_enabled)}>{updating === account.id ? "Saving…" : account.roundup_enabled ? "On" : "Off"}</button></div>)}</div></section>

    {selection && <section className="plaid-selection"><div><span className="plaid-kicker">IRIS PRODUCT SELECTION</span><h2>Provider evidence Iris can use</h2><p>Iris ranks or requests product evidence from current runtime state. It does not silently activate products or change provider data.</p></div><div className="plaid-ranking">{selection.selected.slice(0, 10).map((product, index) => <div className="plaid-rank" key={productKey(product)}><strong>{String(index + 1).padStart(2, "0")}</strong><span>{productName(product)}</span><b>{product.score ?? "—"}</b><small>{(product.irisCapabilities ?? product.capabilities)?.map(title).join(" · ")}</small></div>)}</div></section>}

    <section className="plaid-source-footer"><span>Source</span><strong>{surface?.source ?? "plaid_runtime_item_state"}</strong><span>·</span><span>{surface?.note ?? "Plaid provider information is separated from Iris interpretation."}</span></section>
  </section>;
}
