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
import "./iris-ui.css";

function readIrisPage() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("workspace/iris/")) return hash.slice("workspace/".length) || "iris";
  if (hash === "workspace/iris") return "iris";
  return "iris";
}

function authCallbackKind() {
  const p = new URLSearchParams(window.location.search);
  return p.get("iris_auth");
}

function isRecoveryUrl() {
  const p = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return p.get("iris_auth") === "recovery" || p.get("type") === "recovery" || h.get("type") === "recovery" || p.has("code");
}

function clearAuthCallback() {
  const clean = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState(null, "", clean);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [recovery, setRecovery] = useState(isRecoveryUrl());
  const [irisPage, setIrisPage] = useState(readIrisPage());
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const recoveryUrl = isRecoveryUrl();
    const callback = authCallbackKind();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (recoveryUrl && data.session) setRecovery(true);
      if (callback === "confirmed" && data.session) {
        clearAuthCallback();
        setIrisPage("iris");
      }
      setCheckedAuth(true);
    }).catch(() => {
      if (active) {
        setSession(null);
        setCheckedAuth(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(newSession);
      if (event === "SIGNED_IN" && authCallbackKind() === "confirmed") {
        clearAuthCallback();
        setIrisPage("iris");
      }
    });

    const sync = () => setIrisPage(readIrisPage());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const navigate = (page = "iris") => {
    const hash = page === "iris" ? "#workspace/iris" : `#workspace/${page}`;
    if (window.location.hash !== hash) window.location.hash = hash.slice(1);
    else setIrisPage(page);
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setSigningOut(false);
      return;
    }
    window.location.replace("/");
  };

  if (!checkedAuth) {
    return <main className="iris4-screen"><div className="iris4-empty"><span>IRIS</span><strong>Checking your session…</strong><p>Authenticating securely.</p></div></main>;
  }

  if (recovery && session) {
    return <Auth recovery onRecoveryComplete={() => { setRecovery(false); clearAuthCallback(); navigate("iris"); }} />;
  }

  if (!session) return <Auth />;

  const account = (
    <div className="ia-account-control">
      <span aria-label="Signed-in account" className="ia-account-email">{session.user.email ?? "Signed in"}</span>
      <button aria-label="Open report catalog" type="button" onClick={() => navigate("iris/catalog")}>Report Catalog</button>
      <button aria-label="Sign out" type="button" onClick={() => void signOut()} disabled={signingOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );

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
