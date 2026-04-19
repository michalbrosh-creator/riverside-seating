import { OktaAuth } from "@okta/okta-auth-js";

export const PERMANENT_ADMINS = ["michal.brosh@riverside.fm"];

export const oktaAuth = new OktaAuth({
  issuer: import.meta.env.VITE_OKTA_ISSUER,
  clientId: import.meta.env.VITE_OKTA_CLIENT_ID,
  redirectUri: `${window.location.origin}/login/callback`,
  scopes: ["openid", "profile", "email"],
  pkce: true,
});
