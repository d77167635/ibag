import { useState } from "react";
import { supabase } from "../api/supabase";
import { IrisMark } from "./IrisMark";

type Mode = "sign_in" | "sign_up" | "reset";

function friendlyError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials":
      "That email and password don't match. Double-check them, or reset your password below.",
    "User already registered":
      "An account already exists for that email — try signing in instead.",
    "Email not confirmed":
      "Almost there — check your inbox and confirm your email before signing in.",
    "Email rate limit exceeded":
      "We've sent a few emails to this address already. Wait a few minutes and try again.",
    "Password should be at least 6 characters":
      "Password needs to be at least 6 characters.",
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      setLoading(false);
      if (resetError) {
        setError(friendlyError(resetError.message));
        return;
      }
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
    const result =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setLoading(false);

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }

    if (mode === "sign_up" && !result.data.session) {
      setNotice("Check your inbox — confirm your email to finish creating your account.");
      return;
    }
  }

  const heading =
    mode === "sign_in" ? "Sign in" : mode === "sign_up" ? "Create your account" : "Reset your password";
  const subheading =
    mode === "sign_in"
      ? "Welcome back — see where your money stands."
      : mode === "sign_up"
      ? "Takes under a minute. No card required to start."
      : "Enter the email on your account and we'll send a reset link.";

  return (
    <div className="auth-screen">
      <aside className="auth-brand">
        <div className="auth-brand-mark">
          <IrisMark size={26} color="#f4f2f8" />
          Iris
        </div>
        <div className="auth-brand-copy">
          <h1>Your money, understood.</h1>
          <p>
            Iris connects to your authorized financial data and turns what is actually observed into clear financial intelligence.
          </p>
        </div>
        <p className="auth-brand-foot">Phase 1 — read-only intelligence. No money movement. No simulated financial data.</p>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-mark">
            <IrisMark size={20} color="#453868" />
            <span>Iris</span>
          </div>

          <h2 className="auth-heading">{heading}</h2>
          <p className="auth-subheading">{subheading}</p>

          {error && <div className="banner banner-error">{error}</div>}
          {notice && <div className="banner banner-success">{notice}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "reset" && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="field-input-row">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "sign_up" ? 8 : undefined}
                    className={fieldErrors.password ? "has-error" : ""}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
                {mode === "sign_up" && !fieldErrors.password && (
                  <p className="field-hint">At least 8 characters.</p>
                )}
                {mode === "sign_in" && (
                  <p className="field-hint">
                    <button type="button" className="btn-link" onClick={() => switchMode("reset")}>
                      Forgot password?
                    </button>
                  </p>
                )}
              </div>
            )}

            {mode === "sign_up" && (
              <div className="field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={fieldErrors.confirmPassword ? "has-error" : ""}
                />
                {fieldErrors.confirmPassword && (
                  <p className="field-error">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "sign_in"
                ? "Sign in"
                : mode === "sign_up"
                ? "Create account"
                : "Send reset link"}
            </button>
          </form>

          <div className="auth-switch-row">
            {mode === "sign_in" && (
              <>
                Need an account?{" "}
                <button type="button" className="btn-link" onClick={() => switchMode("sign_up")}>
                  Sign up
                </button>
              </>
            )}
            {mode === "sign_up" && (
              <>
                Already have an account?{" "}
                <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>
                  Sign in
                </button>
              </>
            )}
            {mode === "reset" && (
              <button type="button" className="btn-link" onClick={() => switchMode("sign_in")}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
