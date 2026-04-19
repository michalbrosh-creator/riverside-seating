import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Security } from "@okta/okta-react";
import { oktaAuth } from "./auth/oktaConfig";
import "./index.css";
import App from "./App.jsx";

const restoreOriginalUri = (_oktaAuth, originalUri) => {
  window.location.replace(originalUri || "/");
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
        <App />
      </Security>
    </BrowserRouter>
  </StrictMode>
);
