import { PlaidLinkButton } from "./PlaidLink";

export function IrisPlaidConnect({ onSuccess }: { onSuccess?: () => void }) {
  const openSource = () => { window.history.pushState({}, "", "/source"); window.dispatchEvent(new PopStateEvent("popstate")); };
  return (
    <div
      aria-label="Financial data source controls"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(10, 14, 20, 0.94)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
        backdropFilter: "blur(12px)",
      }}
    >
      <button type="button" onClick={openSource} style={{ color: "#fff", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", background: "transparent", border: 0, padding: "7px 4px", cursor: "pointer" }}>
        View source data
      </button>
      <span style={{ color: "rgba(255,255,255,.35)" }}>·</span>
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Connect</span>
      <PlaidLinkButton onSuccess={onSuccess ?? (() => undefined)} />
    </div>
  );
}
