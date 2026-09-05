import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisApplication } from "./components/IrisApplication";
import { IrisAssistant } from "./components/IrisAssistant";
import { PlaidControlPlane } from "./components/PlaidControlPlane";
import "./iris-command-deck.css";

const accountControlStyle: React.CSSProperties = { position: "fixed", right: 20, bottom: 18, zIndex: 120, display: "flex", alignItems: "center", gap: 9, padding: "7px 9px 7px 11px", border: "1px solid rgba(255,255,255,.11)", borderRadius: 10, background: "rgba(7,9,14,.92)", boxShadow: "0 10px 30px rgba(0,0,0,.28)" };
const accountEmailStyle: React.CSSProperties = { maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#778198", font: "600 8px/1 Inter,system-ui,sans-serif" };
const signOutStyle: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "6px 9px", background: "rgba(255,255,255,.035)", color: "#c5ccda", font: "700 8px/1 Inter,system-ui,sans-serif", letterSpacing: ".06em", cursor: "pointer" };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCheckedAuth(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => { listener.subscription.unsubscribe(); window.removeEventListener("popstate", onPopState); };
  }, []);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) { setSigningOut(false); return; }
    window.history.replaceState(null, "", "/");
    setPath("/");
  };

  if (!checkedAuth) return null;
  if (!session) return <Auth />;
  const accountControl = <div className="ia-account-control" style={accountControlStyle}><span aria-label="Signed-in account" style={accountEmailStyle}>{session.user.email ?? "Signed in"}</span><button aria-label="Sign out of iBag" style={signOutStyle} onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></div>;
  const workspaceSwitch = <div className="ia-mode-switch" role="navigation" aria-label="iBag workspace switcher"><a className={path === "/plaid" || path === "/plaid/" ? "" : "active"} href="/">iBag</a><a className={path === "/plaid" || path === "/plaid/" ? "active" : ""} href="/plaid">Plaid</a></div>;
  if (path === "/plaid" || path === "/plaid/") return <><PlaidControlPlane />{workspaceSwitch}{accountControl}</>;
  return <>{workspaceSwitch}<IrisApplication /><IrisAssistant />{accountControl}</>;
}
