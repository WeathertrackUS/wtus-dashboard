import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAppBaseUrl(request: Request) {
  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.trim() || "";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
  const requestOrigin =
    forwardedHost && forwardedProto ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "";

  if (!configuredUrl) return requestOrigin;

  try {
    const configured = new URL(configuredUrl);
    if (configured.hostname === "localhost" || configured.hostname === "127.0.0.1") {
      return requestOrigin;
    }
  } catch {
    return requestOrigin;
  }

  return configuredUrl;
}

function isLocalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const appBaseUrl = getAppBaseUrl(request);

  if (process.env.NODE_ENV === "production" && isLocalUrl(appBaseUrl)) {
    return NextResponse.redirect(new URL("/?error=AuthOrigin", appBaseUrl));
  }

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
  authorizeUrl.searchParams.set("state", crypto.randomUUID());

  const loginUrl = new URL("/login", authBaseUrl);
  loginUrl.searchParams.set("returnTo", authorizeUrl.toString());

  return NextResponse.redirect(loginUrl);
}
