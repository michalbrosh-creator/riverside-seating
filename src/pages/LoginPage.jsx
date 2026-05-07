import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../App.css";

export default function LoginPage({ onLocalLogin }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.toLowerCase().endsWith("@riverside.fm")) {
      setError("Only @riverside.fm email addresses are allowed.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (authError) setError(authError.message);
    else setSent(true);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Riverside Seating</h1>
        <p className="login-subtitle">Sign in with your Riverside email</p>
        {sent ? (
          <div className="login-sent">
            <p>Magic link sent to <strong>{email}</strong></p>
            <p className="login-sent-hint">Check your inbox and click the link to sign in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="email"
              className="login-email-input"
              placeholder="you@riverside.fm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading || !email}>
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
        <button className="login-skip-btn" onClick={onLocalLogin}>
          Continue as local admin
        </button>
      </div>
    </div>
  );
}
