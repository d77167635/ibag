import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingToken(true);
    api
      .createLinkToken()
      .then((res) => {
        if (!cancelled) setLinkToken(res.link_token);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't start card connection. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingToken(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setConnecting(true);
      setError(null);
      try {
        await api.exchangePublicToken(publicToken);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Card connected, but syncing failed. Try Refresh.");
      } finally {
        setConnecting(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({ token: linkToken ?? "", onSuccess: handleSuccess });
  const disabled = connecting || loadingToken || !ready || !linkToken;

  return (
    <div className="plaid-connect-wrap">
      <button
        className="btn-accent plaid-connect-button"
        onClick={() => {
          setError(null);
          open();
        }}
        disabled={disabled}
        aria-busy={connecting || loadingToken}
      >
        {connecting ? "Connecting…" : loadingToken ? "Preparing…" : "Connect a card"}
      </button>
      {error && (
        <div className="plaid-connect-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
