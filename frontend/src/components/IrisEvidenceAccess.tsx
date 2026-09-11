import { useState } from "react";
import { PlaidLinkButton } from "./PlaidLink";
import { IrisMark } from "./IrisMark";
import "./IrisEvidenceAccess.css";

type Props = { go?: (page: string) => void };

export function IrisEvidenceAccess({ go }: Props) {
  const [connected, setConnected] = useState(false);

  const handleSuccess = () => {
    setConnected(true);
    window.setTimeout(() => go?.("iris"), 900);
  };

  return (
    <main className="iea-shell">
      <div className="iea-atmosphere" aria-hidden="true" />
      <header className="iea-header">
        <button type="button" className="iea-brand" onClick={() => go?.("iris")} aria-label="Return to IRIS">
          <IrisMark size={25} color="currentColor" />
          <span><strong>IRIS</strong><small>RELATIONAL FINANCIAL INTELLIGENCE</small></span>
        </button>
        <span className="iea-state"><i /> EVIDENCE ACCESS</span>
      </header>

      <section className="iea-content">
        <div className="iea-intro">
          <span className="iea-kicker">ARRIVAL · EVIDENCE FORMATION</span>
          <div className="iea-mark"><IrisMark size={68} color="currentColor" /></div>
          <h1>Give IRIS the<br /><em>evidence</em> to understand.</h1>
          <p>Connect a financial institution through Plaid. IRIS will use only provider observations actually returned and persisted for your account. Nothing is inferred simply because a product is available.</p>
        </div>

        <aside className="iea-panel">
          <div className="iea-panel-kicker">CONTROLLED EVIDENCE CONNECTION</div>
          <h2>{connected ? "Evidence connection received" : "Connect your financial institution"}</h2>
          <p>{connected ? "IRIS is forming the evidence boundary. You will enter the intelligence environment when the connection handoff completes." : "Plaid will securely establish the connection. IRIS does not receive or display your bank credentials."}</p>
          {connected ? (
            <div className="iea-success" role="status"><i /> CONNECTION HANDOFF COMPLETE</div>
          ) : (
            <PlaidLinkButton onSuccess={handleSuccess} />
          )}
          <div className="iea-boundary">
            <div><b>OBSERVED</b><span>Provider responses can become evidence only after they are actually received and persisted.</span></div>
            <div><b>GOVERNED</b><span>Evidence remains tied to your authenticated account and execution boundary.</span></div>
            <div><b>READ-ONLY</b><span>No financial movement is initiated by this connection experience.</span></div>
          </div>
          <button type="button" className="iea-later" onClick={() => go?.("iris")}>Enter without connecting →</button>
        </aside>
      </section>

      <footer className="iea-footer"><span>IRIS / EVIDENCE FORMATION</span><span>Truth before completion · Unknown remains unknown</span></footer>
    </main>
  );
}
