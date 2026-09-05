import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

const STAGES = ["consent", "assets", "statements"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  consent: "product consent",
  assets: "Assets evidence",
  statements: "Statements evidence",
};

export function PlaidEvidenceUpgradeButton({ itemId, observedProducts, onComplete }: { itemId: string; observedProducts?: string[]; onComplete: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonical = new Set(["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"]);
  const observedCount = (observedProducts ?? []).filter((product) => canonical.has(product)).length;
  if (observedCount >= 8) return <span className="runtime-state">8/8 certified</span>;

  const startStage = useCallback(async (index: number) => {
    const stage = STAGES[index];
    setWorking(true);
    setError(null);
    try {
      const response = await api.createUpgradeLinkToken(itemId, stage);
      setStageIndex(index);
      setLinkToken(response.link_token);
      setPendingOpen(true);
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Unable to start evidence upgrade.");
    }
  }, [itemId]);

  const handleSuccess = useCallback(async () => {
    setPendingOpen(false);
    try {
      await api.resync();
      const next = stageIndex + 1;
      if (next < STAGES.length) {
        await startStage(next);
      } else {
        onComplete();
        setWorking(false);
        setLinkToken(null);
      }
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Evidence refresh failed after Plaid consent.");
    }
  }, [onComplete, stageIndex, startStage]);

  const { open, ready } = usePlaidLink({ token: linkToken ?? "", onSuccess: handleSuccess });

  useEffect(() => {
    if (ready && pendingOpen) {
      setPendingOpen(false);
      open();
    }
  }, [open, pendingOpen, ready]);

  return (
    <div>
      <button
        className="btn-accent"
        type="button"
        disabled={working}
        onClick={() => void startStage(0)}
      >
        {working ? `Completing ${STAGE_LABELS[STAGES[stageIndex]]}…` : "Complete 8/8 evidence"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
