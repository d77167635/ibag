import { useState } from "react";
import { supabase } from "../api/supabase";
import { IrisMark } from "./IrisMark";

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

export function Auth() {
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "reset") {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setLoading(false);
      if (resetError) { setError(friendlyError(resetError.message)); return; }
      setNotice("If an account exists for that email, we've sent a link to reset your password.");
      return;
    }

    if (mode === "sign_up" && password.length < 8) {
      setFieldErrors({ password: "Use at least 8 characters." });
      return;
    }
    if (mode === "sign_up" && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match." });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const result = mode === "sign_in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);

    if (result.error) { setError(friendlyError(result.error.message)); return; }
    if (mode === "sign_up" && !result.data.session) setNotice("Check your inbox — confirm your email to finish creating your account.");
  }

  const heading = mode === "sign_in" ? "Welcome back" : mode === "sign_up" ? "Create your iBag account" : "Reset your password";
  const subheading = mode === "sign_in"
    ? "Sign in to your financial intelligence environment."
    : mode === "sign_up"
    ? "One account for Iris intelligence and your Plaid data control plane."
    : "Enter the email on your account and we'll send a reset link.";

  return (
    <main className="auth-screen auth-screen-v2">
      <section className="auth-visual" aria-label="iBag financial intelligence">
        <div className="auth-visual-top">
          <div className="auth-logo"><span className="auth-logo-mark">i</span><span>iBag</span></div>
          <span className="auth-live"><i />SECURE ACCESS</span>
        </div>

        <div className="auth-visual-center">
          <div className="auth-orbit auth-orbit-a" />
          <div className="auth-orbit auth-orbit-b" />
          <div className="auth-iris-core"><IrisMark size={44} color="#eef8ff" /></div>
          <p className="auth-kicker">FINANCIAL INTELLIGENCE</p>
          <h1>See what your money<br />is actually doing.</h1>
          <p className="auth-visual-copy">iBag turns authorized financial evidence into an environment where Iris can explain what is happening, why it matters, and what the evidence supports next.</p>
        </div>

        <div className="auth-visual-bottom">
          <div><strong>IRIS</strong><span>Intelligence environment</span></div>
          <div><strong>PLAID</strong><span>Data control plane</span></div>
          <div><strong>READ-ONLY</strong><span>Phase 1 · no money movement</span></div>
        </div>
      </section>

      <section className="auth-panel auth-panel-v2">
        <div className="auth-card auth-card-v2">
          <div className="auth-mobile-brand"><span className="auth-logo-mark">i</span><strong>iBag</strong><span>·</span><IrisMark size={18} color="currentColor" /><span>Iris</span></div>
          <div className="auth-eyebrow">{mode === "reset" ? "ACCOUNT RECOVERY" : "SECURE ACCESS"}</div>
          <h2 className="auth-heading">{heading}</h2>
          <p className="auth-subheading">{subheading}</p>

          {error && <div className="banner banner-error" role="alert">{error}</div>}
          {notice && <div className="banner banner-success" role="status">{notice}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>

            {mode !== "reset" && <div className="field">
              <div className="field-label-row"><label htmlFor="password">Password</label>{mode === "sign_in" && <button type="button" className="btn-link" onClick={() => switchMode("reset")}>Forgot?</button>}</div>
              <div className="field-input-row">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "sign_in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "sign_up" ? 8 : undefined} className={fieldErrors.password ? "has-error" : ""} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              {mode === "sign_up" && !fieldErrors.password && <p className="field-hint">At least 8 characters.</p>}
            </div>}

            {mode === "sign_up" && <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={fieldErrors.confirmPassword ? "has-error" : ""} />
              {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
            </div>}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "sign_in" ? "Enter iBag" : mode === "sign_up" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <div className="auth-switch-row">
            {mode === "sign_in" && <>New to iBag? <button type="button" className="btn-link" onClick={() => switchMode("sign_up")}>Create an account</button></>}
            {mode === "sign_up" && <>Already have an account? <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>Sign in</button></>}
            {mode === "reset" && <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>Back to sign in</button>}
          </div>

          <p className="auth-privacy">Your financial intelligence is built from authorized provider data. Phase 1 is read-only and does not move money.</p>
        </div>
      </section>
    </main>
  );
}
