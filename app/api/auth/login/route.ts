import { NextResponse } from "next/server";
import {
  createOAuthStateForNonce,
  createOAuthStateNonce,
  getAppBaseUrl,
  getAuthSecret,
  isLocalAppUrl,
  sanitizeRedirectPath,
} from "../../../../src/server/safe-redirect";
import {
  getOidcConfig,
  buildAuthorizationUrl,
  randomPKCECodeVerifier,
  randomState,
  calculatePKCECodeChallenge,
} from "../../../../src/lib/oidc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  appBaseUrl: string,
  maxAge: number = 600,
) {
  const secure = isHttpsUrl(appBaseUrl);
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });
}

export async function GET(request: Request) {
  const appBaseUrl = getAppBaseUrl(request);

  if (process.env.NODE_ENV === "production" && isLocalAppUrl(appBaseUrl)) {
    return NextResponse.redirect(new URL("/?error=AuthOrigin", appBaseUrl));
  }

  const authSecret = getAuthSecret();
  if (!authSecret) {
    return NextResponse.redirect(new URL("/?error=AuthOrigin", appBaseUrl));
  }

  try {
    const config = await getOidcConfig();
    const redirectUri =
      (config as unknown as { _redirectUri?: string })._redirectUri ||
      new URL("/api/auth/callback/wtus-auth", appBaseUrl).toString();

    // Generate PKCE
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

    // Generate state and nonce for OIDC
    const oidcState = randomState();

    // Generate signed state carrying the callback path
    const requestUrl = new URL(request.url);
    const callbackPath = sanitizeRedirectPath(requestUrl.searchParams.get("callbackUrl") ?? "/");
    const stateNonce = createOAuthStateNonce();
    const oauthState = await createOAuthStateForNonce(callbackPath, authSecret, stateNonce);

    // Build authorization URL - use signed oauthState as the OIDC state parameter
    const authorizeUrl = buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: "openid",
      state: oauthState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const response = NextResponse.redirect(authorizeUrl);

    // Store PKCE code verifier and state nonce in cookies
    setCookie(response, "oidc_pkce", codeVerifier, appBaseUrl, 600);
    response.cookies.set("wtus-oauth-state", stateNonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: isLocalAppUrl(appBaseUrl) ? false : new URL(appBaseUrl).protocol === "https:",
      maxAge: 10 * 60,
      path: "/api/auth/callback/wtus-auth",
    });

    return response;
  } catch (error) {
    console.error("OIDC login error:", error);
    return NextResponse.redirect(new URL("/?error=AuthLogin", appBaseUrl));
  }
}
