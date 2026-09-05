import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../api/backend";

const STAGES = ["consent", "assets", "statements"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABELS: Record<Stage, string> = {
  consent: "product consent",
  assets: "Assets evidence",
  statements: "Statements evidence",
};

const CANONICAL = new Set(["auth", "transactions", "balance", "identity", "assets", "liabilities", "investments", "statements"]);
const CONSENT_PRODUCTS = new Set(["auth", "identity", "investments", "liabilities"]);

function canonicalObserved(products?: string[]) {
  return new Set((products ?? []).filter((product) => CANONICAL.has(product)));
}

function nextRequiredStage(observed: Set<string>): Stage | null {
  if ([...CONSENT_PRODUCTS].some((product) => !observed.has(product))) return "consent";
  if (!observed.has("assets")) return "assets";
  if (!observed.has("statements")) return "statements";
  return null;
}

export function PlaidEvidenceUpgradeButton({ itemId, observedProducts, onComplete }: { itemId: string; observedProducts?: string[]; onComplete: () => void }) {
  const [stage, setStage] = useState<Stage | null>(() => nextRequiredStage(canonicalObserved(observedProducts)));
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observed = useMemo(() => canonicalObserved(observedProducts), [observedProducts]);
  const observedCount = observed.size;

  const finishOrContinue = useCallback(async () => {
    const surface = await api.getPlaidSurface();
    const item = (surface.items ?? []).find((candidate: any) => candidate.item_id === itemId);
    const current = canonicalObserved(item?.observed_products);
    const next = nextRequiredStage(current);
    if (current.size === 8 && !next) {
      setStage(null);
      setWorking(false);
      setLinkToken(null);
      onComplete();
      return;
    }
    if (next) {
      setStage(next);
      setWorking(false);
      setLinkToken(null);
      await startStage(next);
    }
  }, [itemId, onComplete]);

  const startStage = useCallback(async (requestedStage: Stage) => {
    setWorking(true);
    setError(null);
    try {
      const response = await api.createUpgradeLinkToken(itemId, requestedStage);
      setStage(requestedStage);
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
      await finishOrContinue();
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Evidence refresh failed after Plaid consent.");
    }
  }, [finishOrContinue]);

  const { open, ready } = usePlaidLink({ token: linkToken ?? "", onSuccess: handleSuccess });

  useEffect(() => {
    if (ready && pendingOpen) {
      setPendingOpen(false);
      open();
    }
  }, [open, pendingOpen, ready]);

  if (observedCount === 8 && !stage) return <span className="runtime-state">8/8 certified</span>;

  return (
    <div>
      <button
        className="btn-accent"
        type="button"
        disabled={working}
        onClick={() => void startStage(stage ?? "consent")}
      >
        {working ? `Completing ${STAGE_LABELS[stage ?? "consent"]}…` : `Complete 8/8 evidence · ${observedCount}/8 observed`}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
