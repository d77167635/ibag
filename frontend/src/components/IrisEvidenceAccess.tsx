import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { PlaidLinkButton } from "./PlaidLink";
import { IrisMark } from "./IrisMark";
import { api } from "../api/backend";
import "./IrisEvidenceAccess.css";

type Props = { go?: (page: string) => void };

function StatementsUpgrade({ itemId, institution, onComplete }: { itemId: string; institution: string; onComplete: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const load = useCallback(async () => {
    if (opening) return;
    setOpening(true); setError(null);
    try {
      const response = await api.createUpgradeLinkToken(itemId, "statements");
      setToken(response.link_token); setRequested(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare the Statements evidence upgrade.");
    } finally { setOpening(false); }
  }, [itemId, opening]);
  const handleSuccess = useCallback(async () => {
    setToken(null); setRequested(false); setOpening(true); setError(null);
    try { await api.resync(); onComplete(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Statements consent completed, but evidence resync did not finish."); }
    finally { setOpening(false); }
  }, [onComplete]);
  const { open, ready } = usePlaidLink({ token: token ?? "", onSuccess: handleSuccess });
  useEffect(() => { if (requested && ready && token && !opening) { setRequested(false); open(); } }, [open, opening, ready, requested, token]);
  return <div className="iea-upgrade"><div><b>{institution}</b><span>Statements are not currently observed for this Item.</span></div><button type="button" onClick={() => void load()} disabled={opening}>{opening ? "Preparing…" : "Add Statements evidence"}</button>{error && <small role="alert">{error}</small>}</div>;
}

export function IrisEvidenceAccess({ go }: Props) {
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try { const surface = await api.getPlaidSurface(); setItems(surface.items ?? []); }
    finally { setLoadingItems(false); }
  }, []);
  useEffect(() => { void loadItems(); }, [loadItems]);
  const handleSuccess = () => { setConnected(true); void loadItems(); window.setTimeout(() => go?.("iris"), 900); };
  const resync = async () => { if (refreshing) return; setRefreshing(true); try { await api.resync(); await loadItems(); } finally { setRefreshing(false); } };

  return (
    <main className="iea-shell">
      <div className="iea-atmosphere" aria-hidden="true" />
      <header className="iea-header">
        <button type="button" className="iea-brand" onClick={() => go?.("iris")} aria-label="Return to IRIS"><IrisMark size={25} color="currentColor" /><span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span></button>
        <span className="iea-state"><i /> EVIDENCE ACCESS</span>
      </header>

      <section className="iea-content">
        <div className="iea-intro">
          <span className="iea-kicker">EVIDENCE FORMATION</span>
          <div className="iea-mark"><IrisMark size={68} color="currentColor" /></div>
          <h1>Build the complete<br /><em>financial evidence</em> boundary.</h1>
          <p>IRIS uses provider observations that are actually returned and persisted. The eight authoritative domains remain independently governed; an available or consented product is never presented as observed data.</p>
        </div>

        <aside className="iea-panel">
          <div className="iea-panel-kicker">CONTROLLED EVIDENCE CONNECTION</div>
          <h2>{connected ? "Evidence connection received" : "Connect another institution"}</h2>
          <p>{connected ? "IRIS is refreshing the persisted evidence surface. The financial life remains read-only throughout this process." : "Plaid securely establishes the connection. IRIS does not receive or display your bank credentials."}</p>
          {connected ? <div className="iea-success" role="status"><i /> CONNECTION HANDOFF COMPLETE</div> : <PlaidLinkButton onSuccess={handleSuccess} />}
          <button type="button" className="iea-later" onClick={() => void resync()} disabled={refreshing}>{refreshing ? "Refreshing evidence…" : "Refresh existing evidence"}</button>
          <div className="iea-boundary">
            <div><b>OBSERVED</b><span>Provider responses become evidence only after they are actually received and persisted.</span></div>
            <div><b>GOVERNED</b><span>Evidence stays tied to the authenticated user and exact Item boundary.</span></div>
            <div><b>READ-ONLY</b><span>No financial movement is initiated by evidence formation.</span></div>
          </div>
        </aside>
      </section>

      <section className="iea-items">
        <div><span className="iea-kicker">CONNECTED ITEMS</span><h2>Complete the eight-domain evidence boundary</h2><p>Statements requires a separate Plaid consent step and date range. It can be added to an existing Item without deleting that Item.</p></div>
        {loadingItems ? <div className="iea-item-empty">Reading connected Items…</div> : items.length === 0 ? <div className="iea-item-empty">No connected Plaid Items are currently persisted.</div> : items.map((item: any) => {
          const statements = (item.products ?? []).find((product: any) => product.key === "statements" || product.product === "statements");
          const observed = statements?.status === "observed";
          return <article className="iea-item" key={item.item_id}><div><strong>{item.institution_name ?? "Institution"}</strong><span>{item.status ?? "status unavailable"}{item.last_synced_at ? ` · last synced ${new Date(item.last_synced_at).toLocaleString()}` : ""}</span></div>{observed ? <b>Statements observed</b> : <StatementsUpgrade itemId={item.item_id} institution={item.institution_name ?? "Institution"} onComplete={() => void loadItems()} />}</article>;
        })}
      </section>

      <footer className="iea-footer"><span>IRIS / EVIDENCE FORMATION</span><span>Truth before completion · Unknown remains unknown</span></footer>
    </main>
  );
}
