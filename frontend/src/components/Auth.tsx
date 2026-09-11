import { useState, type FormEvent } from "react";
import { supabase } from "../api/supabase";
import { IrisMark } from "./IrisMark";
import "./IrisAuth.css";

type Mode = "sign_in" | "sign_up" | "reset";

function friendlyError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Those credentials could not be verified.",
    "User already registered": "An account already exists for this email. Sign in instead.",
    "Email not confirmed": "Confirm your email address before signing in.",
    "Email rate limit exceeded": "Email delivery is temporarily rate-limited. Please try again shortly.",
    "Database error saving new user": "Iris could not finish creating the account. The account record was not completed. Please try again shortly.",
  };
  return known[message] ?? message;
}

export function Auth({ recovery = false, onRecoveryComplete }: { recovery?: boolean; onRecoveryComplete?: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? "reset" : "sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetMessages = () => { setFieldError(null); setError(null); setNotice(null); };
  const switchMode = (next: Mode) => { setMode(next); resetMessages(); setPassword(""); setConfirmPassword(""); };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); resetMessages();
    if (mode === "reset" && recovery) {
      if (password.length < 8) { setFieldError("Use at least 8 characters."); return; }
      if (password !== confirmPassword) { setFieldError("Passwords do not match."); return; }
      setLoading(true); const { error: updateError } = await supabase.auth.updateUser({ password }); setLoading(false);
      if (updateError) { setError(friendlyError(updateError.message)); return; }
      onRecoveryComplete?.(); setNotice("Password updated. Your Iris session is secured with the new credential."); return;
    }
    if (mode === "reset") {
      if (!email.trim()) { setFieldError("Enter the email associated with your Iris account."); return; }
      setLoading(true); const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); setLoading(false);
      if (resetError) { setError(friendlyError(resetError.message)); return; }
      setNotice("If an account exists for that email, a secure recovery link has been sent."); return;
    }
    if (!email.trim()) { setFieldError("Enter your email address."); return; }
    if (mode === "sign_up" && password.length < 8) { setFieldError("Use at least 8 characters."); return; }
    if (mode === "sign_up" && password !== confirmPassword) { setFieldError("Passwords do not match."); return; }
    setLoading(true);
    const result = mode === "sign_in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (result.error) { setError(friendlyError(result.error.message)); return; }
    if (mode === "sign_up" && !result.data.session) setNotice("Account created. Check your inbox to verify your email before entering Iris.");
  }

  const isSignUp = mode === "sign_up";
  const heading = recovery ? "Secure your account" : mode === "sign_in" ? "Enter your intelligence environment" : isSignUp ? "Create your intelligence environment" : "Recover access";
  const subheading = recovery ? "Set a new credential and return to your Iris environment." : mode === "sign_in" ? "Your financial life, evidence, and intelligence remain behind one controlled access boundary." : isSignUp ? "One identity for your financial evidence, connected institutions, and evolving Iris intelligence." : "We will send a secure recovery link without revealing whether an account exists.";

  return (
    <main className="iris-auth-new">
      <div className="iris-auth-atmosphere" aria-hidden="true"><div className="iris-auth-grid" /><div className="iris-auth-radial iris-auth-radial-a" /><div className="iris-auth-radial iris-auth-radial-b" /><div className="iris-auth-orbit orbit-a" /><div className="iris-auth-orbit orbit-b" /><div className="iris-auth-orbit orbit-c" /></div>
      <header className="iris-auth-header"><div className="iris-auth-brand"><span><IrisMark size={22} color="currentColor" /></span><div><strong>IRIS</strong><small>FINANCIAL INTELLIGENCE</small></div></div><div className="iris-auth-status"><i />SECURE SYSTEM ACCESS</div></header>
      <section className="iris-auth-layout">
        <div className="iris-auth-intelligence">
          <div className="iris-auth-kicker">INTELLIGENCE SYSTEM · ACCESS LAYER</div>
          <div className="iris-auth-core"><div className="core-halo" /><IrisMark size={72} color="#eaf9ff" /><span className="core-node node-1">EVIDENCE</span><span className="core-node node-2">RELATIONSHIPS</span><span className="core-node node-3">REASONING</span><span className="core-node node-4">DECISIONS</span></div>
          <h1>From financial evidence<br />to <em>understanding.</em></h1>
          <p>Iris is designed to continuously form a governed picture of your financial life — grounded in observed evidence, explicit uncertainty, and traceable reasoning.</p>
          <div className="iris-auth-spectrum"><span>OBSERVE</span><b /><span>CONNECT</span><b /><span>REASON</span><b /><span>EXPLAIN</span><b /><span>ACT</span></div>
        </div>
        <div className="iris-auth-panel">
          <div className="iris-auth-card">
            <div className="iris-auth-mobile-brand"><IrisMark size={19} color="currentColor" /><strong>IRIS</strong><span>Financial Intelligence</span></div>
            <div className="iris-auth-label">{recovery ? "ACCOUNT RECOVERY" : mode === "reset" ? "ACCESS RECOVERY" : "CONTROLLED ACCESS"}</div>
            <h2>{heading}</h2><p className="iris-auth-subheading">{subheading}</p>
            {!recovery && <div className="iris-auth-mode"><button className={mode === "sign_in" ? "active" : ""} type="button" onClick={() => switchMode("sign_in")}>Sign in</button><button className={isSignUp ? "active" : ""} type="button" onClick={() => switchMode("sign_up")}>Create account</button></div>}
            {error && <div className="iris-auth-alert error" role="alert"><strong>Access could not be completed</strong><span>{error}</span></div>}
            {notice && <div className="iris-auth-alert success" role="status"><strong>Secure handoff</strong><span>{notice}</span></div>}
            {fieldError && <div className="iris-auth-field-error" role="alert">{fieldError}</div>}
            <form onSubmit={handleSubmit} noValidate>
              {!recovery && <label className="iris-auth-field"><span>Email address</span><input name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={e => { setEmail(e.target.value); setFieldError(null); }} autoFocus required placeholder="you@example.com" /></label>}
              {(mode !== "reset" || recovery) && <label className="iris-auth-field"><span>Password</span><div className="iris-auth-password"><input name="password" type={showPassword ? "text" : "password"} autoComplete={recovery || isSignUp ? "new-password" : "current-password"} value={password} onChange={e => { setPassword(e.target.value); setFieldError(null); }} required minLength={isSignUp || recovery ? 8 : undefined} placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button></div>{(isSignUp || recovery) && <small>Minimum 8 characters</small>}</label>}
              {(isSignUp || recovery) && <label className="iris-auth-field"><span>Confirm password</span><input name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFieldError(null); }} required placeholder="Repeat your password" /></label>}
              <button className="iris-auth-submit" type="submit" disabled={loading}>{loading ? "Verifying…" : recovery ? "Update credential" : mode === "sign_in" ? "Enter Iris" : isSignUp ? "Create Iris account" : "Send recovery link"}<span>↗</span></button>
            </form>
            {!recovery && mode === "sign_in" && <button className="iris-auth-forgot" type="button" onClick={() => switchMode("reset")}>Forgot your password?</button>}
            {!recovery && mode === "reset" && <button className="iris-auth-forgot" type="button" onClick={() => switchMode("sign_in")}>Return to secure access</button>}
            <div className="iris-auth-trust"><span><i />Encrypted session</span><span><i />Evidence remains governed</span><span><i />Read-only Phase 1</span></div>
          </div>
        </div>
      </section>
      <footer className="iris-auth-footer"><span>IRIS / ACCESS CONTROL</span><span>Authorized provider observations only · No financial movement in Phase 1</span></footer>
    </main>
  );
}
