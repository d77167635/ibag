import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { IrisIntelligenceScreens } from "./IrisIntelligenceScreens";
import { IrisCatalog } from "./IrisCatalog";

export function IrisIntelligenceWorkspace({ page = "iris", go }: { page?: string; go?: (page: string) => void }) {
  const [intel, setIntel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasConnectedData, setHasConnectedData] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getIntelligence(), api.getPlaidSurface()]).then(([data, plaid]) => {
      if (!alive) return;
      setIntel(data);
      setHasConnectedData(Array.isArray(plaid?.items) && plaid.items.length > 0);
    }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Unable to load Iris intelligence"); });
    return () => { alive = false; };
  }, []);

  const openPlaid = () => { window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#workspace/plaid`); window.dispatchEvent(new HashChangeEvent("hashchange")); };
  if (error) return <div className="iis-screen"><div className="iis-empty"><strong>Iris intelligence is unavailable.</strong><p>{error}</p></div></div>;
  if (hasConnectedData === false) return <div className="iis-screen"><div className="iis-empty"><span className="eyebrow">IRIS</span><strong>Your intelligence workspace is ready.</strong><p>Iris has no financial observations for this account yet. Connect a real financial institution through the Plaid control plane and Iris will begin building evidence from the authorized data.</p><p>No financial data is invented, copied from another account, seeded, or simulated.</p><button type="button" onClick={openPlaid}>Open Plaid control plane →</button></div></div>;
  if (page === "iris/catalog") return <IrisCatalog go={go} />;
  return <IrisIntelligenceScreens page={page} intel={intel} go={go} />;
}
