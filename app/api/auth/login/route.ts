import { NextResponse } from "next/server";
import {
  createOAuthState,
  getAppBaseUrl,
  getAuthSecret,
  isLocalAppUrl,
  sanitizeRedirectPath,
} from "../../../../src/server/safe-redirect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const appBaseUrl = getAppBaseUrl(request);

  if (process.env.NODE_ENV === "production" && isLocalAppUrl(appBaseUrl)) {
    return NextResponse.redirect(new URL("/?error=AuthOrigin", appBaseUrl));
  }

  const authSecret = getAuthSecret();
  if (!authSecret) {
    return NextResponse.redirect(new URL("/?error=AuthOrigin", appBaseUrl));
  }

  const requestUrl = new URL(request.url);
  const callbackPath = sanitizeRedirectPath(requestUrl.searchParams.get("callbackUrl") ?? "/");
  const oauthState = createOAuthState(callbackPath, authSecret);

  const authBaseUrl =
    process.env.WTUS_AUTH_URL?.trim() ||
    "https://auth.weathertrackus.com";

  const authorizeUrl = new URL("/authorize", authBaseUrl);
  authorizeUrl.searchParams.set("client_id", "wtus-dashboard");
  authorizeUrl.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/callback/wtus-auth", appBaseUrl).toString(),
  );
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid");
  authorizeUrl.searchParams.set("state", oauthState);

  const loginUrl = new URL("/login", authBaseUrl);
  loginUrl.searchParams.set("returnTo", authorizeUrl.toString());

  return NextResponse.redirect(loginUrl);
}
