import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { OktaAuth, toRelativeUrl } from "@okta/okta-auth-js";
import { Security, LoginCallback } from "@okta/okta-react";
import "./index.css";
import App from "./App.jsx";

const oktaAuth = new OktaAuth({
  issuer: "https://riversidefm.okta.com",
  clientId: "0oa12nsqzwmYELz4V698",
  redirectUri: `${window.location.origin}/login/callback`,
  scopes: ["openid", "email", "profile"],
  pkce: true,
});

function Root() {
  const navigate = useNavigate();
  const restoreOriginalUri = (_auth, originalUri) =>
    navigate(toRelativeUrl(originalUri || "/", window.location.origin));

  return (
    <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
      <Routes>
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Security>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);
