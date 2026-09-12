import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

type Props = { onSuccess: () => void };

export function PlaidLinkButton({ onSuccess }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const [openRequested, setOpenRequested] = useState(false);

  const loadToken = useCallback(async () => {
    if (loadingToken || connecting) return;
    setLoadingToken(true);
    setError(null);
    try {
      const res = await api.createLinkToken();
      setLinkToken(res.link_token);
      setOpenRequested(true);
    } catch (err) {
      setLinkToken(null);
      setOpenRequested(false);
      setError(err instanceof Error ? err.message : "Couldn't start the connection. Try again.");
    } finally {
      setLoadingToken(false);
    }
  }, [connecting, loadingToken]);

  const handleSuccess = useCallback(async (publicToken: string) => {
    setConnecting(true);
    setError(null);
    try {
      await api.exchangePublicToken(publicToken);
      onSuccess();
      setLinkToken(null);
      setOpenRequested(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Financial institution connection failed. Try again.");
    } finally {
      setConnecting(false);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
  });

  useEffect(() => {
    if (!openRequested || !ready || !linkToken || connecting) return;
    setOpenRequested(false);
    open();
  }, [open, openRequested, ready, linkToken, connecting]);

  return (
    <div className="plaid-connect-wrap">
      <button
        type="button"
        className="btn-accent plaid-connect-button"
        onClick={() => void loadToken()}
        disabled={connecting}
        aria-busy={connecting || loadingToken}
      >
        {connecting ? "Connecting…" : loadingToken ? "Preparing secure connection…" : "Connect financial institution"}
      </button>
      {error && (
        <div className="plaid-connect-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadToken()} disabled={loadingToken}>Retry</button>
        </div>
      )}
    </div>
  );
}
