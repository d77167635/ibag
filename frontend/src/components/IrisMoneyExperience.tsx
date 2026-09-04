import { useEffect, useState } from "react";
import { IrisMoneyTopology } from "./IrisMoneyTopology";
import "../styles/iris-money-experience.css";

export function IrisMoneyExperience() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const check = () => setActive(document.querySelector(".iris-shell-crumb strong")?.textContent?.trim() === "Money");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
  if (!active) return null;
  return <div className="iris-money-experience"><IrisMoneyTopology accounts={[]} /></div>;
}
