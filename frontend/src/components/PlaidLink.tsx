import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    api
      .createLinkToken()
      .then((res) => setLinkToken(res.link_token))
      .catch(() => setError("Couldn't start card connection. Try reloading the page."));
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setConnecting(true);
      setError(null);
      try {
        await api.exchangePublicToken(publicToken);
        onSuccess();
      } catch {
        setError("Card connected, but syncing failed. Try reloading in a moment.");
      } finally {
        setConnecting(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
  });

  return (
    <div>
      <button className="btn-accent" onClick={() => open()} disabled={!ready || !linkToken || connecting}>
        {connecting ? "Connecting…" : "Connect a card"}
      </button>
      {error && <p className="field-error" style={{ marginTop: 8, textAlign: "right" }}>{error}</p>}
    </div>
  );
}
