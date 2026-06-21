import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  type Configuration,
} from "openid-client";

let configPromise: Promise<Configuration> | null = null;

export function getOidcConfig(): Promise<Configuration> {
  if (!configPromise) {
    const issuerUrl = new URL(
      process.env.OIDC_ISSUER_URL?.trim() || "https://auth.weathertrackus.com",
    );
    const clientId = "wtus-dashboard";
    const clientSecret =
      process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() ||
      process.env.AUTH_SECRET?.trim() ||
      "";
    const redirectUri = new URL(
      "/api/auth/callback/wtus-auth",
      process.env.APP_URL?.trim() || "http://localhost:3000",
    ).toString();

    configPromise = discovery(
      issuerUrl,
      clientId,
      clientSecret,
      undefined,
    ).then((config) => {
      // Store redirect_uri for use in authorization URL
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
