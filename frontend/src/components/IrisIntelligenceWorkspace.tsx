import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { IrisIntelligenceScreens } from "./IrisIntelligenceScreens";

export function IrisIntelligenceWorkspace({ page = "iris", go }: { page?: string; go?: (page: string) => void }) {
  const [intel, setIntel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api.getIntelligence().then((data) => { if (alive) setIntel(data); }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Unable to load Iris intelligence"); });
    return () => { alive = false; };
  }, []);
  if (error) return <div className="iis-screen"><div className="iis-empty"><strong>Iris intelligence is unavailable.</strong><p>{error}</p></div></div>;
  return <IrisIntelligenceScreens page={page} intel={intel} go={go} />;
}
