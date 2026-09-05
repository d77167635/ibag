import { useState, type FormEvent } from "react";
import { supabase } from "../api/supabase";
import { IrisMark } from "./IrisMark";
import "./IrisAuth.css";

type Mode = "sign_in" | "sign_up" | "reset";

function friendlyError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "That email and password don't match. Double-check them, or reset your password below.",
    "User already registered": "An account already exists for that email — try signing in instead.",
    "Email not confirmed": "Almost there — check your inbox and confirm your email before signing in.",
    "Email rate limit exceeded": "We've sent a few emails to this address already. Wait a few minutes and try again.",
    "Password should be at least 6 characters": "Password needs to be at least 6 characters.",
  };
  return known[message] ?? message;
}

export function Auth({ recovery = false, onRecoveryComplete }: { recovery?: boolean; onRecoveryComplete?: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? "reset" : "sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next); setError(null); setNotice(null); setFieldErrors({}); setPassword(""); setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setNotice(null);
    if (mode === "reset" && recovery) {
      if (password.length < 8) { setFieldErrors({ password: "Use at least 8 characters." }); return; }
      if (password !== confirmPassword) { setFieldErrors({ confirmPassword: "Passwords don't match." }); return; }
      setFieldErrors({}); setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (updateError) { setError(friendlyError(updateError.message)); return; }
      window.sessionStorage.setItem("iris.authenticated", "1"); onRecoveryComplete?.();
      setNotice("Password updated. Your Iris session is now secured with the new password."); return;
    }
    if (mode === "reset") {
      setLoading(true); const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); setLoading(false);
      if (resetError) { setError(friendlyError(resetError.message)); return; }
      setNotice("If an account exists for that email, we've sent a link to reset your password."); return;
    }
    if (mode === "sign_up" && password.length < 8) { setFieldErrors({ password: "Use at least 8 characters." }); return; }
    if (mode === "sign_up" && password !== confirmPassword) { setFieldErrors({ confirmPassword: "Passwords don't match." }); return; }
    setFieldErrors({}); setLoading(true);
    const result = mode === "sign_in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}#workspace/plaid` } });
    setLoading(false);
    if (result.error) { setError(friendlyError(result.error.message)); return; }
    if (mode === "sign_up" && !result.data.session) setNotice("Check your inbox — confirm your email to finish creating your account. You'll return to the Plaid control plane when verification is complete.");
  }

  const heading = mode === "sign_in" ? "Welcome back" : mode === "sign_up" ? "Enter the Iris environment" : recovery ? "Choose a new password" : "Reset your password";
  const subheading = mode === "sign_in" ? "Sign in to your financial intelligence environment." : mode === "sign_up" ? "One account for Iris intelligence, your financial evidence, and your connected data control plane." : recovery ? "Your recovery link is active. Set a new password to continue into Iris." : "Enter the email on your account and we'll send a reset link.";

  return (
    <main className="auth-screen auth-screen-v2">
      <section className="auth-visual auth-visual-iris" aria-label="Iris financial intelligence presentation">
        <div className="iris-presentation-grid" aria-hidden="true" /><div className="iris-presentation-glow iris-presentation-glow-a" aria-hidden="true" /><div className="iris-presentation-glow iris-presentation-glow-b" aria-hidden="true" />
        <div className="iris-intelligence-rings" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="iris-data-orbit iris-data-orbit-a" aria-hidden="true"><b>STATE</b><b>CASH FLOW</b><b>BEHAVIOR</b></div>
        <div className="iris-data-orbit iris-data-orbit-b" aria-hidden="true"><b>FORECAST</b><b>CAUSE</b><b>DECISION</b></div>
        <div className="auth-visual-top"><div className="auth-logo"><span className="auth-logo-mark"><IrisMark size={24} color="currentColor" /></span><span>Iris</span></div><span className="auth-live"><i />INTELLIGENCE ONLINE</span></div>
        <div className="auth-visual-center">
          <div className="auth-iris-core"><IrisMark size={58} color="#eef8ff" /></div>
          <p className="auth-kicker">IRIS · FINANCIAL INTELLIGENCE</p>
          <h1>See what your money<br />is actually doing.</h1>
          <p className="auth-visual-copy">Iris connects authorized financial evidence into a living intelligence environment — revealing relationships across cash flow, spending, behavior, debt, time, forecasts, decisions, and consequences.</p>
          <div className="iris-presentation-stream" aria-hidden="true"><span>OBSERVE</span><i /><span>RELATE</span><i /><span>REASON</span><i /><span>SIMULATE</span><i /><span>EMPOWER</span></div>
        </div>
        <div className="auth-visual-bottom"><div><strong>IRIS</strong><span>Intelligence environment</span></div><div><strong>PLAID</strong><span>Read-only source observations</span></div><div><strong>iBAG</strong><span>Savings &amp; round-up destination</span></div></div>
      </section>
      <section className="auth-panel auth-panel-v2">
        <div className="auth-card auth-card-v2">
          <div className="auth-mobile-brand"><IrisMark size={20} color="currentColor" /><strong>Iris</strong><span>·</span><span>Financial Intelligence</span></div>
          <div className="auth-eyebrow">{recovery ? "ACCOUNT RECOVERY" : mode === "reset" ? "ACCOUNT RECOVERY" : "SECURE IRIS ACCESS"}</div>
          <h2 className="auth-heading">{heading}</h2><p className="auth-subheading">{subheading}</p>
          {error && <div className="banner banner-error" role="alert">{error}</div>}{notice && <div className="banner banner-success" role="status">{notice}</div>}
          <form onSubmit={handleSubmit} noValidate>
            {!recovery && <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>}
            {(mode !== "reset" || recovery) && <div className="field"><div className="field-label-row"><label htmlFor="password">Password</label>{mode === "sign_in" && <button type="button" className="btn-link" onClick={() => switchMode("reset")}>Forgot?</button>}</div><div className="field-input-row"><input id="password" type={showPassword ? "text" : "password"} autoComplete={recovery || mode === "sign_up" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "sign_up" || recovery ? 8 : undefined} className={fieldErrors.password ? "has-error" : ""} /><button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div>{fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}{(mode === "sign_up" || recovery) && !fieldErrors.password && <p className="field-hint">At least 8 characters.</p>}</div>}
            {(mode === "sign_up" || recovery) && <div className="field"><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={fieldErrors.confirmPassword ? "has-error" : ""} />{fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}</div>}
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>{loading ? "Please wait…" : recovery ? "Update password" : mode === "sign_in" ? "Enter Iris" : mode === "sign_up" ? "Create Iris account" : "Send reset link"}</button>
          </form>
          {!recovery && <div className="auth-switch-row">{mode === "sign_in" && <>New to Iris? <button type="button" className="btn-link" onClick={() => switchMode("sign_up")}>Create an account</button></>}{mode === "sign_up" && <>Already have an account? <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>Sign in</button></>}{mode === "reset" && <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>Back to sign in</button>}</div>}
          <p className="auth-privacy">Iris uses authorized provider observations as evidence. Phase 1 is read-only: no bank or card money movement occurs.</p>
        </div>
      </section>
    </main>
  );
}
