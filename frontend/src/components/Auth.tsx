import { useState } from "react";
import { supabase } from "../api/supabase";

export function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onAuthed();
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: "80px auto" }}>
      <h1>Iris</h1>
      <p>{mode === "sign_in" ? "Sign in" : "Create an account"}</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        style={{ display: "block", width: "100%", marginBottom: 8 }}
      />

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Please wait…" : mode === "sign_in" ? "Sign in" : "Sign up"}
      </button>

      <p>
        <button
          type="button"
          onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}
        >
          {mode === "sign_in" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </p>
    </form>
  );
}
