import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  type Configuration,
} from "openid-client";

/** Matches NextAuth default database session lifetime. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Scopes required for profile claims read in the OIDC callback. */
export const OIDC_LOGIN_SCOPE = "openid profile email";

let configPromise: Promise<Configuration> | null = null;

export function resetOidcConfigCache() {
  configPromise = null;
}

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
    const redirectUri = buildOidcRedirectUri(
      process.env.APP_URL?.trim() || "http://127.0.0.1:3000",
    );

    configPromise = discovery(
      issuerUrl,
      clientId,
      clientSecret,
      undefined,
    )
      .then((config) => {
        return Object.assign(config, { _redirectUri: redirectUri });
      })
      .catch((error) => {
        configPromise = null;
        throw error;
      });
  }
  return configPromise;
}

export function buildOidcRedirectUri(appBaseUrl: string) {
  return new URL("/api/auth/callback/wtus-auth", appBaseUrl).toString();
}

export function resolveOidcRedirectUri(config: Configuration, appBaseUrl: string) {
  const configured = (config as Configuration & { _redirectUri?: string })._redirectUri;
  return configured ?? buildOidcRedirectUri(appBaseUrl);
}

/** Canonical callback URL for token exchange (matches login redirect_uri + OAuth query params). */
export function buildOidcCallbackUrl(redirectUri: string, requestUrl: URL) {
  const callbackUrl = new URL(redirectUri);
  for (const [key, value] of requestUrl.searchParams) {
    callbackUrl.searchParams.set(key, value);
  }
  return callbackUrl;
}

export {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
};
