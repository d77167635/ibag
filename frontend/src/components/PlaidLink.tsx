import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    api
      .createLinkToken()
      .then((res) => setLinkToken(res.link_token))
      .catch((err) => console.error("Failed to create link token", err));
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      await api.exchangePublicToken(publicToken);
      onSuccess();
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
  });

  return (
    <button onClick={() => open()} disabled={!ready || !linkToken}>
      Connect a card
    </button>
  );
}
