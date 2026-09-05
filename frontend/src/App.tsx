import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisApplication } from "./components/IrisApplication";
import { IrisAssistant } from "./components/IrisAssistant";
import { IrisIntelligenceWorkspace } from "./components/IrisIntelligenceWorkspace";
import { PlaidControlPlane } from "./components/PlaidControlPlane";
import "./iris-command-deck.css";

const accountControlStyle: React.CSSProperties = { position: "fixed", right: 20, bottom: 18, zIndex: 120, display: "flex", alignItems: "center", gap: 9, padding: "7px 9px 7px 11px", border: "1px solid rgba(255,255,255,.11)", borderRadius: 10, background: "rgba(7,9,14,.92)", boxShadow: "0 10px 30px rgba(0,0,0,.28)" };
const accountEmailStyle: React.CSSProperties = { maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#778198", font: "600 8px/1 Inter,system-ui,sans-serif" };
const signOutStyle: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "6px 9px", background: "rgba(255,255,255,.035)", color: "#c5ccda", font: "700 8px/1 Inter,system-ui,sans-serif", letterSpacing: ".06em", cursor: "pointer" };

function readWorkspace() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "workspace/plaid") return { workspace: "plaid", irisPage: "iris" };
  if (hash.startsWith("workspace/iris/")) return { workspace: "iris", irisPage: hash.slice("workspace/".length) || "iris" };
  if (hash === "workspace/iris") return { workspace: "iris", irisPage: "iris" };
  if (hash === "iris" || hash.startsWith("iris/")) return { workspace: "iris", irisPage: hash || "iris" };
  return { workspace: "ibag", irisPage: "iris" };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const initial = readWorkspace();
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [irisPage, setIrisPage] = useState(initial.irisPage);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setCheckedAuth(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    const onHashChange = () => { const next = readWorkspace(); setWorkspace(next.workspace); setIrisPage(next.irisPage); };
    window.addEventListener("hashchange", onHashChange);
    return () => { listener.subscription.unsubscribe(); window.removeEventListener("hashchange", onHashChange); };
  }, []);

  const navigate = (nextWorkspace: string, nextIrisPage = "iris") => {
    const hash = nextWorkspace === "plaid" ? "#workspace/plaid" : nextWorkspace === "iris" ? `#workspace/${nextIrisPage}` : "";
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    setWorkspace(nextWorkspace);
    setIrisPage(nextIrisPage);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) { setSigningOut(false); return; }
    window.history.replaceState(null, "", "/");
    setWorkspace("ibag"); setIrisPage("iris");
  };

  if (!checkedAuth) return null;
  if (!session) return <Auth />;

  const accountControl = <div className="ia-account-control" style={accountControlStyle}><span aria-label="Signed-in account" style={accountEmailStyle}>{session.user.email ?? "Signed in"}</span><button aria-label="Sign out of iBag" style={signOutStyle} onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></div>;
  const workspaceSwitch = <div className="ia-mode-switch" role="navigation" aria-label="iBag workspace switcher"><button type="button" className={workspace === "ibag" ? "active" : ""} onClick={() => navigate("ibag")}>iBag</button><button type="button" className={workspace === "plaid" ? "active" : ""} onClick={() => navigate("plaid")}>Plaid</button></div>;

  if (workspace === "plaid") return <div className="app-workspace app-workspace-plaid"><PlaidControlPlane />{workspaceSwitch}{accountControl}</div>;
  if (workspace === "iris") return <div className="app-workspace app-workspace-iris"><IrisIntelligenceWorkspace page={irisPage} go={(page) => navigate("iris", page)} />{workspaceSwitch}{accountControl}</div>;
  return <div className="app-workspace app-workspace-ibag">{workspaceSwitch}<IrisApplication /><IrisAssistant />{accountControl}</div>;
}
