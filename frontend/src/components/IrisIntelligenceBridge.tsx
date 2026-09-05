import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { IrisIntelligenceScreens } from "./IrisIntelligenceScreens";
import "./IrisIntelligenceBridge.css";

const DEEP_PAGES = new Set([
  "iris", "iris/findings", "iris/timeline", "iris/education", "iris/relationships", "iris/causes",
  "iris/decisions", "iris/scenarios", "iris/optimization", "iris/goals", "iris/evidence", "iris/uncertainty",
  "iris/reasoning", "iris/forecast", "iris/behavior", "iris/liquidity", "iris/roundups",
]);

export function IrisIntelligenceBridge() {
  const [page, setPage] = useState(() => window.location.hash.replace(/^#\/?/, ""));
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash.replace(/^#\/?/, ""));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!DEEP_PAGES.has(page) || intel) return;
    setLoading(true);
    api.getIntelligence().then(setIntel).catch(() => setIntel(null)).finally(() => setLoading(false));
  }, [page, intel]);

  const open = (next = "iris") => { window.location.hash = next; };
  const close = () => { window.location.hash = "home"; };

  if (!DEEP_PAGES.has(page)) return <button className="iris-deep-launcher" onClick={() => open()} aria-label="Open Iris Intelligence"><span>✦</span><b>Iris</b><small>Intelligence</small></button>;
  if (loading && !intel) return <div className="iris-deep-overlay"><div className="iris-deep-loading"><b>Building Iris Intelligence</b><span>Loading the current authorized intelligence envelope…</span></div></div>;
  return <div className="iris-deep-overlay"><div className="iris-deep-topbar"><button onClick={close}>← iBag</button><div><b>IRIS INTELLIGENCE</b><span>Evidence → state → relationships → decisions</span></div><button onClick={() => { setIntel(null); }}>Refresh intelligence</button></div><div className="iris-deep-body"><IrisIntelligenceScreens page={page} intel={intel} go={open}/></div></div>;
}
