import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./api/supabase";
import { Auth } from "./components/Auth";
import { IrisConsumerHome } from "./components/IrisConsumerHome";
import { IrisCommandSurface } from "./components/IrisCommandSurface";
import { IrisCatalog } from "./components/IrisCatalog";
import { IrisActionOutcome } from "./components/IrisActionOutcome";
import { IrisEvidenceAccess } from "./components/IrisEvidenceAccess";
import { IrisExperienceShell } from "./components/IrisExperienceShell";
import "./iris-command-deck.css";
import "./components/IrisExperienceShell.css";

const accountControlStyle: React.CSSProperties = { position: "fixed", right: 20, bottom: 18, zIndex: 120, display: "flex", alignItems: "center", gap: 9, padding: "7px 9px 7px 11px", border: "1px solid rgba(255,255,255,.11)", borderRadius: 10, background: "rgba(7,9,14,.92)", boxShadow: "0 10px 30px rgba(0,0,0,.28)" };
const accountEmailStyle: React.CSSProperties = { maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#778198", font: "600 8px/1 Inter,system-ui,sans-serif" };
const controlButtonStyle: React.CSSProperties = { border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "6px 9px", background: "rgba(255,255,255,.035)", color: "#c5ccda", font: "700 8px/1 Inter,system-ui,sans-serif", letterSpacing: ".06em", cursor: "pointer" };
const signOutStyle: React.CSSProperties = { ...controlButtonStyle };
function readIrisPage() { const hash = window.location.hash.replace(/^#/, ""); if (hash.startsWith("workspace/iris/")) return hash.slice("workspace/".length) || "iris"; if (hash === "workspace/iris") return "iris"; return "iris"; }
function isRecoveryUrl() { const p = new URLSearchParams(window.location.search); const h = new URLSearchParams(window.location.hash.replace(/^#/, "")); return p.get("type") === "recovery" || h.get("type") === "recovery" || p.has("code"); }

export default function App() {
  const [session, setSession] = useState<Session | null>(null), [checkedAuth, setCheckedAuth] = useState(false), [recovery, setRecovery] = useState(isRecoveryUrl()), [irisPage, setIrisPage] = useState(readIrisPage()), [signingOut, setSigningOut] = useState(false);
  useEffect(() => { let active = true; const recoveryUrl = isRecoveryUrl(); supabase.auth.getSession().then(({ data }) => { if (!active) return; setSession(data.session); if (recoveryUrl && data.session) setRecovery(true); setCheckedAuth(true); }).catch(() => { if (active) { setSession(null); setCheckedAuth(true); } }); const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => { if (!active) return; if (event === "PASSWORD_RECOVERY") setRecovery(true); setSession(newSession); }); const sync = () => setIrisPage(readIrisPage()); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); return () => { active = false; listener.subscription.unsubscribe(); window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); }; }, []);
  const navigate = (page = "iris") => { const hash = page === "iris" ? "#workspace/iris" : `#workspace/${page}`; if (window.location.hash !== hash) window.location.hash = hash.slice(1); else setIrisPage(page); };
  const signOut = async () => { if (signingOut) return; setSigningOut(true); const { error } = await supabase.auth.signOut({ scope: "local" }); if (error) { setSigningOut(false); return; } window.location.replace("/"); };
  if (!checkedAuth) return <main className="iris4-screen"><div className="iris4-empty"><span>IRIS</span><strong>Checking your session…</strong><p>Authenticating securely.</p></div></main>;
  if (recovery && session) return <Auth recovery onRecoveryComplete={() => setRecovery(false)} />;
  if (!session) return <Auth />;

  const account = <div className="ia-account-control" style={accountControlStyle}><span aria-label="Signed-in account" style={accountEmailStyle}>{session.user.email ?? "Signed in"}</span><button aria-label="Open report catalog" style={controlButtonStyle} onClick={() => navigate("iris/catalog")}>Report Catalog</button><button aria-label="Sign out" style={signOutStyle} onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></div>;
  const content = irisPage === "iris/connect"
    ? <IrisEvidenceAccess go={navigate} />
    : irisPage === "iris/catalog"
      ? <IrisCatalog go={navigate} />
      : irisPage === "iris/action"
        ? <IrisActionOutcome mode="action" go={navigate} />
        : irisPage === "iris/outcomes"
          ? <IrisActionOutcome mode="outcomes" go={navigate} />
          : irisPage === "iris"
            ? <IrisConsumerHome go={navigate} />
            : <IrisCommandSurface page={irisPage} go={navigate} />;
  if (irisPage === "iris/connect") return <>{content}{account}</>;
  return <IrisExperienceShell page={irisPage} go={navigate}><div className="app-workspace app-workspace-iris">{content}{account}</div></IrisExperienceShell>;
}
