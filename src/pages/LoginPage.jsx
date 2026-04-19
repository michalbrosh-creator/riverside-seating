import { useOktaAuth } from "@okta/okta-react";
import "../App.css";

export default function LoginPage({ onLocalLogin }) {
  const { oktaAuth } = useOktaAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Riverside Seating</h1>
        <p className="login-subtitle">Sign in to manage your office floor plan</p>
        <button
          className="login-btn"
          onClick={() => oktaAuth.signInWithRedirect()}
        >
          Sign in with Okta
        </button>
        <button className="login-skip-btn" onClick={onLocalLogin}>
          Continue without signing in
        </button>
      </div>
    </div>
  );
}
