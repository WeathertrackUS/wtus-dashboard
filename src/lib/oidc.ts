import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  type Configuration,
} from "openid-client";

let configPromise: Promise<Configuration> | null = null;

export function getOidcClientSecret() {
  const secret = process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() || "";
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WTUS_DASHBOARD_OIDC_CLIENT_SECRET is required in production");
    }
    console.warn(
      "[OIDC] WTUS_DASHBOARD_OIDC_CLIENT_SECRET is not set — OIDC token exchange will fail",
    );
  }
  return secret;
}

export function getOidcConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuerUrl = new URL(
      process.env.OIDC_ISSUER_URL?.trim() || "https://auth.weathertrackus.com",
    );
    const clientId = "wtus-dashboard";
    const clientSecret = getOidcClientSecret();
    const redirectUri = new URL(
      "/api/auth/callback/wtus-auth",
      process.env.APP_URL?.trim() || "http://127.0.0.1:3000",
    ).toString();

    configPromise = discovery(
      issuerUrl,
      clientId,
      clientSecret,
      undefined,
    ).then((config) => {
      return Object.assign(config, { _redirectUri: redirectUri });
    });
  }
  return configPromise;
}

export {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
};
