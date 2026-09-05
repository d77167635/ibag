import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisApplication } from "./components/IrisApplication";
import { IrisAssistant } from "./components/IrisAssistant";
import { PlaidControlPlane } from "./components/PlaidControlPlane";
import "./iris-command-deck.css";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckedAuth(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  if (!checkedAuth) return null;
  if (!session) return <Auth />;
  if (path === "/plaid" || path === "/plaid/") return <PlaidControlPlane />;
  return (
    <>
      <div className="ia-mode-switch" role="navigation" aria-label="iBag workspace switcher">
        <a className="active" href="/">iBag</a>
        <a href="/plaid">Plaid</a>
      </div>
      <IrisApplication />
      <IrisAssistant />
    </>
  );
}
