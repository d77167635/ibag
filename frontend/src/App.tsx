import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisAssistant } from "./components/IrisAssistant";
import { IrisShell } from "./components/IrisShell";
import { IrisRouterBridge } from "./components/IrisRouterBridge";
import { IrisPlaidConnect } from "./components/IrisPlaidConnect";
import { PlaidControlPlane } from "./components/PlaidControlPlane";
import { PlaidKnowledgeCenter } from "./components/PlaidKnowledgeCenter";
import { SourceTruth } from "./components/SourceTruth";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCheckedAuth(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => { listener.subscription.unsubscribe(); window.removeEventListener("popstate", onPopState); };
  }, []);

  if (!checkedAuth) return null;
  if (!session) return <Auth />;
  if (path === "/source" || path === "/source/") return <SourceTruth />;
  if (path === "/plaid/knowledge" || path === "/plaid/knowledge/") return <PlaidKnowledgeCenter />;
  if (path === "/plaid" || path === "/plaid/") return <PlaidControlPlane />;
  return <><IrisRouterBridge /><IrisShell /><IrisAssistant /><IrisPlaidConnect /></>;
}
