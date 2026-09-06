import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisWorkspaceV3 } from "./components/IrisWorkspaceV3";
import "./iris-command-deck.css";
import "./iris-hd.css";
import "./styles/data-semantics.css";

function isRecoveryUrl() {
  const p = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return p.get("type") === "recovery" || h.get("type") === "recovery" || p.has("code");
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [recovery, setRecovery] = useState(isRecoveryUrl());

  useEffect(() => {
    let active = true;
    const recoveryUrl = isRecoveryUrl();
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (recoveryUrl && data.session) setRecovery(true);
      setCheckedAuth(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(newSession);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!checkedAuth) return null;
  if (recovery && session) return <Auth recovery onRecoveryComplete={() => setRecovery(false)} />;
  if (!session) return <Auth />;
  return <IrisWorkspaceV3 />;
}
