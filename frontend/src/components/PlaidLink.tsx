import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);

  const loadToken = useCallback(async () => {
    setLoadingToken(true);
    setError(null);
    try {
      const res = await api.createLinkToken();
      setLinkToken(res.link_token);
    } catch {
      setLinkToken(null);
      setError("Couldn't start card connection. Try again.");
    } finally {
      setLoadingToken(false);
    }
  }, []);

  useEffect(() => {
    void loadToken();
  }, [loadToken]);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setConnecting(true);
      setError(null);
      try {
        await api.exchangePublicToken(publicToken);
        onSuccess();
        // Plaid Link tokens are single-use. Obtain a fresh token so the same
        // signed-in iBag user can connect another institution immediately.
        await loadToken();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Card connection failed. Try again.");
      } finally {
        setConnecting(false);
      }
    },
    [loadToken, onSuccess]
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
        {connecting ? "Connecting…" : loadingToken ? "Preparing…" : "Add another institution"}
      </button>
      {error && (
        <div className="plaid-connect-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadToken()}>Retry</button>
        </div>
      )}
    </div>
  );
}
