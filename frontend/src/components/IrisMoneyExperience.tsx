import { useEffect, useState } from "react";
import { api } from "../api/backend";
import { IrisMoneyTopology } from "./IrisMoneyTopology";
import "../styles/iris-money-experience.css";

export function IrisMoneyExperience() {
  const [active, setActive] = useState(false);
  const [overview, setOverview] = useState<any | null>(null);
  const [intelligence, setIntelligence] = useState<any | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const isMoney = document.querySelector(".iris-shell-crumb strong")?.textContent?.trim() === "Money";
      if (!alive) return;
      setActive(isMoney);
      if (!isMoney || overview) return;
      const nextOverview = await api.getOverview();
      const nextIntelligence = nextOverview.accounts?.length ? await api.getIntelligence() : null;
      if (alive) { setOverview(nextOverview); setIntelligence(nextIntelligence); }
    };
    void check();
    const observer = new MutationObserver(() => void check());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { alive = false; observer.disconnect(); };
  }, [overview]);
  if (!active || !overview) return null;
  return <div className="iris-money-experience"><IrisMoneyTopology accounts={overview.accounts ?? []} liquidAssets={intelligence?.net_worth?.liquid_assets ?? null} revolvingDebt={intelligence?.debt_health?.revolvingDebt ?? null} safeToSpend={intelligence?.cash_flow_safety?.safeToSpend ?? null} /></div>;
}
