import { useCallback, useEffect, useState } from "react";
import { IrisMark } from "./IrisMark";
import { api } from "../api/backend";
import "./IrisEvidenceAccess.css";

type Props = { go?: (page: string) => void };

/**
 * Pre-Plaid certification boundary.
 * The surface may inspect persisted provider evidence, but it cannot initiate
 * a new provider connection until the pre-Plaid UI/interaction gate passes.
 */
export function IrisEvidenceAccess({ go }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const surface = await api.getPlaidSurface();
      setItems(Array.isArray(surface?.items) ? surface.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const resync = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await api.resync();
      await loadItems();
    } catch {
      // Do not create a fallback record when provider refresh is unavailable.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main className="iea-shell">
      <section className="iea-content">
        <div className="iea-intro">
          <span className="iea-kicker">EVIDENCE FORMATION</span>
          <div className="iea-mark"><IrisMark size={68} color="currentColor" /></div>
          <h1>Build the complete<br /><em>financial evidence</em> boundary.</h1>
          <p>IRIS uses provider observations that are actually returned and persisted. The eight authoritative domains remain independently governed; an available or consented product is never presented as observed data.</p>
        </div>
        <aside className="iea-panel">
          <div className="iea-panel-kicker">PRE-PLAID CERTIFICATION BOUNDARY</div>
          <h2>Provider connection is intentionally locked</h2>
          <p>The Financial Life screens and interactions must pass their pre-Plaid certification gate before IRIS initiates a new provider connection. This prevents an unverified UI from becoming the path into live financial evidence.</p>
          <button type="button" className="iea-later" disabled aria-disabled="true">Connect provider · locked until certification</button>
          <button type="button" className="iea-later" onClick={() => void resync()} disabled={refreshing}>{refreshing ? "Refreshing existing evidence…" : "Refresh existing evidence"}</button>
          <div className="iea-boundary">
            <div><b>OBSERVED</b><span>Provider responses become evidence only after they are actually received and persisted.</span></div>
            <div><b>GOVERNED</b><span>Evidence stays tied to the authenticated user and exact Item boundary.</span></div>
            <div><b>READ-ONLY</b><span>No financial movement is initiated by evidence formation.</span></div>
            <div><b>CERTIFICATION</b><span>Pre-Plaid UI/interaction proof precedes live provider connection.</span></div>
          </div>
        </aside>
      </section>
      <section className="iea-items">
        <div><span className="iea-kicker">CONNECTED ITEMS</span><h2>Persisted provider evidence, if any</h2><p>Existing persisted Items may be inspected without creating new provider connections. Statements remain deferred until the real-banking phase.</p></div>
        {loadingItems ? <div className="iea-item-empty">Reading persisted connected Items…</div> : items.length === 0 ? <div className="iea-item-empty">No connected Plaid Items are currently persisted.</div> : items.map((item: any) => <article className="iea-item" key={item.item_id}><div><strong>{item.institution_name ?? "Institution name unavailable"}</strong><span>{item.status ?? "Status unavailable"}{item.last_synced_at ? ` · last synced ${new Date(item.last_synced_at).toLocaleString()}` : ""}</span></div><b>Statements deferred until real banking</b></article>)}
      </section>
      <section className="iea-items">
        <div><span className="iea-kicker">CONTINUE</span><h2>Keep certifying the experience before provider activation.</h2><p>Use the Financial Life, Reports and Intelligence/Education surfaces to verify navigation, states, controls and truthful empty conditions without manufacturing provider evidence.</p></div>
        <div className="iris-journey-actions"><button type="button" onClick={() => go?.("iris")}>Financial Life →</button><button type="button" onClick={() => go?.("iris/catalog")}>Reports →</button><button type="button" onClick={() => go?.("iris/intelligence")}>Intelligence Education →</button></div>
      </section>
    </main>
  );
}
