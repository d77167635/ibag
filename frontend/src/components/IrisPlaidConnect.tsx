import { PlaidLinkButton } from "./PlaidLink";

export function IrisPlaidConnect({ onSuccess }: { onSuccess?: () => void }) {
  return (
    <div
      aria-label="Connect financial institution"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(10, 14, 20, 0.94)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
        Financial data source
      </span>
      <PlaidLinkButton onSuccess={onSuccess ?? (() => undefined)} />
    </div>
  );
}
