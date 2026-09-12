import { useCallback, useEffect, useState } from "react";
import { IrisMark } from "./IrisMark";
import { PlaidLinkButton } from "./PlaidLink";
import { api } from "../api/backend";
import "./IrisEvidenceAccess.css";

type Props = { go?: (page: string) => void };

/**
 * Evidence connection surface.
 * Existing provider Items remain persisted and untouched. A new connection
 * uses the governed Plaid Link flow already used by the application.
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
          <div className="iea-panel-kicker">PROVIDER CONNECTION</div>
          <h2>Connect a financial institution</h2>
          <p>New provider connections use the governed Plaid Link flow. Existing Plaid Items remain persisted and are not replaced or deleted by opening a new connection.</p>
          <PlaidLinkButton onSuccess={() => void loadItems()} />
          <button type="button" className="iea-later" onClick={() => void resync()} disabled={refreshing}>{refreshing ? "Refreshing existing evidence…" : "Refresh existing evidence"}</button>
          <div className="iea-boundary">
            <div><b>OBSERVED</b><span>Provider responses become evidence only after they are actually received and persisted.</span></div>
            <div><b>GOVERNED</b><span>Evidence stays tied to the authenticated user and exact Item boundary.</span></div>
            <div><b>READ-ONLY</b><span>No financial movement is initiated by evidence formation.</span></div>
            <div><b>CERTIFICATION</b><span>Provider connection uses the existing authenticated Plaid Link and exchange path.</span></div>
          </div>
        </aside>
      </section>
      <section className="iea-items">
        <div><span className="iea-kicker">CONNECTED ITEMS</span><h2>Persisted provider evidence, if any</h2><p>Existing persisted Items remain available for inspection. Statements remain deferred until the real-banking phase.</p></div>
        {loadingItems ? <div className="iea-item-empty">Reading persisted connected Items…</div> : items.length === 0 ? <div className="iea-item-empty">No connected Plaid Items are currently persisted.</div> : items.map((item: any) => <article className="iea-item" key={item.item_id}><div><strong>{item.institution_name ?? "Institution name unavailable"}</strong><span>{item.status ?? "Status unavailable"}{item.last_synced_at ? ` · last synced ${new Date(item.last_synced_at).toLocaleString()}` : ""}</span></div><b>Statements deferred until real banking</b></article>)}
      </section>
      <section className="iea-items">
        <div><span className="iea-kicker">CONTINUE</span><h2>Continue through your financial life.</h2><p>Use the Financial Life, Reports and Intelligence surfaces to inspect persisted provider evidence and governed results.</p></div>
        <div className="iris-journey-actions"><button type="button" onClick={() => go?.("iris")}>Financial Life →</button><button type="button" onClick={() => go?.("iris/catalog")}>Reports →</button><button type="button" onClick={() => go?.("iris/intelligence")}>Intelligence Education →</button></div>
      </section>
    </main>
  );
}
