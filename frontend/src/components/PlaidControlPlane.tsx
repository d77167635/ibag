import { useEffect, useMemo, useState } from "react";
import { api } from "../api/backend";
import { PlaidLinkButton } from "./PlaidLink";

export function PlaidControlPlane() {
  const [surface, setSurface] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextSurface, nextCatalog] = await Promise.all([
        api.getPlaidSurface(),
        api.getPlaidCapabilities(),
      ]);
      setSurface(nextSurface);
      setCatalog(nextCatalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Plaid control plane");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const products = useMemo(() => {
    const all = surface?.products ?? [];
    if (filter === "all") return all;
    return all.filter((product: any) => product.status === filter);
  }, [surface, filter]);

  const counts = useMemo(() => {
    const all = surface?.products ?? [];
    return all.reduce((acc: Record<string, number>, product: any) => {
      acc[product.status] = (acc[product.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [surface]);

  if (loading) return <div style={styles.loading}><h1>Plaid Control Plane</h1><p>Reading live provider capability and Item state…</p></div>;

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <span style={styles.eyebrow}>SOURCE OF TRUTH · PLAID</span>
        <h1 style={styles.title}>Plaid Control Plane</h1>
        <p style={styles.subtitle}>Provider capabilities, connection state, consent, availability and observed evidence. Iris interpretations do not appear here.</p>
      </div>
      <div style={styles.actions}>
        <button style={styles.button} onClick={() => void load()}>Refresh provider state</button>
        <PlaidLinkButton onSuccess={() => void load()} />
      </div>
    </header>

    {error && <div style={styles.error}><b>Provider read error</b><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}

    <section style={styles.banner}>
      <strong>Phase 1 boundary</strong>
      <span>Read-only intelligence. No money movement. Cataloged capabilities are not treated as observed data.</span>
    </section>

    <section style={styles.grid}>
      <Metric label="Connected Items" value={String(surface?.items?.length ?? 0)} />
      <Metric label="Catalog capabilities" value={String(catalog?.capabilities?.length ?? 0)} />
      <Metric label="Observed" value={String(counts.observed ?? 0)} />
      <Metric label="Available" value={String(counts.available ?? 0)} />
      <Metric label="Consented" value={String(counts.consented ?? 0)} />
      <Metric label="Active" value={String(counts.active ?? 0)} />
    </section>

    <section style={styles.panel}>
      <div style={styles.panelHead}><div><h2>Connected institutions</h2><p>Actual Plaid Items linked to this iBag user.</p></div></div>
      {(surface?.items ?? []).length === 0 ? <Empty text="No Plaid Items are connected." /> : (surface.items ?? []).map((item: any, index: number) => <div style={styles.item} key={`${item.institution_name}-${index}`}><div><strong>{item.institution_name ?? "Institution"}</strong><small>Status: {item.status ?? "unknown"}</small></div><div><small>Last sync: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : "not recorded"}</small><small>Observed product states: {(item.observed_products ?? []).length}</small></div></div>)}
    </section>

    <section style={styles.panel}>
      <div style={styles.panelHead}><div><h2>Product & service state</h2><p>Runtime status is derived from Plaid Item state plus iBag's actual domain observations.</p></div><div style={styles.filters}>{["all", "observed", "active", "consented", "available", "not_available", "not_connected"].map((value) => <button key={value} onClick={() => setFilter(value)} style={{ ...styles.filter, ...(filter === value ? styles.filterActive : {}) }}>{value.replace(/_/g, " ")}{value !== "all" && counts[value] != null ? ` · ${counts[value]}` : ""}</button>)}</div></div>
      <div style={styles.productGrid}>{products.map((product: any) => <article style={styles.product} key={product.key}><div style={styles.productTop}><h3>{product.displayName}</h3><span style={styles.status}>{product.status}</span></div><p>{product.description}</p><small>States: {(product.plaidProductStates ?? []).join(", ") || "public product surface"}</small><small>Iris relevance: {product.phase1Relevant ? "Phase 1 eligible for evidence-driven use" : "Not Phase 1 actionable"}</small></article>)}</div>
    </section>

    <section style={styles.panel}>
      <div style={styles.panelHead}><div><h2>Registry integrity</h2><p>Every documented Plaid Item product-state identifier is checked against the application catalog.</p></div></div>
      <div style={styles.integrity}><strong>{(catalog?.unmapped_item_states ?? []).length === 0 ? "PASS" : "ATTENTION"}</strong><span>{(catalog?.unmapped_item_states ?? []).length === 0 ? "No unmapped Plaid Item product states." : `${catalog.unmapped_item_states.length} Item states are not mapped.`}</span></div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ text }: { text: string }) { return <div style={styles.empty}>{text}</div>; }

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f4f6f8", color: "#101828", padding: "32px", fontFamily: "Inter, system-ui, sans-serif" },
  loading: { minHeight: "100vh", display: "grid", placeItems: "center", alignContent: "center", gap: "8px", background: "#101828", color: "white", fontFamily: "Inter, system-ui, sans-serif" },
  header: { maxWidth: "1400px", margin: "0 auto 24px", display: "flex", justifyContent: "space-between", gap: "24px", alignItems: "flex-start" },
  eyebrow: { fontSize: "11px", letterSpacing: "0.16em", fontWeight: 700 },
  title: { fontSize: "42px", margin: "6px 0" },
  subtitle: { maxWidth: "760px", margin: 0, color: "#475467", lineHeight: 1.55 },
  actions: { display: "flex", gap: "10px", flexWrap: "wrap" },
  button: { border: "1px solid #d0d5dd", background: "white", borderRadius: "10px", padding: "11px 14px", cursor: "pointer", fontWeight: 600 },
  banner: { maxWidth: "1400px", margin: "0 auto 20px", padding: "15px 18px", border: "1px solid #d0d5dd", borderRadius: "12px", background: "white", display: "flex", gap: "12px", flexWrap: "wrap" },
  grid: { maxWidth: "1400px", margin: "0 auto 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px" },
  metric: { background: "white", border: "1px solid #e4e7ec", borderRadius: "12px", padding: "16px" },
  panel: { maxWidth: "1400px", margin: "0 auto 20px", background: "white", border: "1px solid #e4e7ec", borderRadius: "14px", overflow: "hidden" },
  panelHead: { padding: "18px", borderBottom: "1px solid #e4e7ec", display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" },
  filters: { display: "flex", gap: "6px", flexWrap: "wrap" },
  filter: { border: "1px solid #d0d5dd", background: "white", borderRadius: "999px", padding: "7px 10px", cursor: "pointer" },
  filterActive: { background: "#101828", color: "white" },
  item: { padding: "16px 18px", borderBottom: "1px solid #e4e7ec", display: "flex", justifyContent: "space-between", gap: "16px" },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "12px", padding: "18px" },
  product: { border: "1px solid #e4e7ec", borderRadius: "12px", padding: "15px" },
  productTop: { display: "flex", justifyContent: "space-between", gap: "10px" },
  status: { fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" },
  integrity: { padding: "18px", display: "flex", gap: "12px", alignItems: "center" },
  empty: { padding: "24px", color: "#667085" },
  error: { maxWidth: "1400px", margin: "0 auto 20px", padding: "14px", border: "1px solid #fecdca", borderRadius: "12px", background: "#fef3f2", display: "flex", gap: "12px", flexWrap: "wrap" },
};
