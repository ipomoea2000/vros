"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === "signup") {
      setMessage("Account created. Check your email if confirmation is enabled.");
    } else {
      setMessage("Signed in.");
    }
    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">V</div>
        <p className="eyebrow">Villordon Research Operating System</p>
        <h1>Research, manuscripts, and priorities in one place.</h1>
        <p className="muted">
          VROS 2.0 uses Supabase authentication and cloud-synced project data.
        </p>

        <form onSubmit={submit} className="form-stack">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </label>
          <button disabled={busy}>{busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>

        {message && <p className="notice">{message}</p>}

        <button className="link-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Create a new VROS account" : "Return to sign in"}
        </button>
      </section>
    </main>
  );
}
