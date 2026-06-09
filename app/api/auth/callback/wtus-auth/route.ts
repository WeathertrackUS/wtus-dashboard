import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  id_token?: string;
};

type TokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  discord_user_id?: string;
};

function decodeJwtPayload(token: string): TokenClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as TokenClaims;
  } catch {
    return null;
  }
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function buildSessionCookieName(appBaseUrl: string) {
  return process.env.NODE_ENV === "production" && isHttpsUrl(appBaseUrl)
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() || "";
  const callbackUrl = url.searchParams.get("callbackUrl")?.trim() || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?error=OAuthCallback", url.origin));
  }

  const requestOrigin = url.origin;
  const configuredAppUrl = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "";
  const appBaseUrl = (() => {
    if (!configuredAppUrl) return requestOrigin;
    try {
      const configured = new URL(configuredAppUrl);
      if (configured.hostname === "localhost" || configured.hostname === "127.0.0.1") {
        return requestOrigin;
      }
    } catch {
      return requestOrigin;
    }
    return configuredAppUrl;
  })();
  const authBaseUrl =
    process.env.WTUS_AUTH_URL?.trim() ||
    "https://auth.weathertrackus.com";

  const tokenResponse = await fetch(new URL("/token", authBaseUrl), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: "wtus-dashboard",
      client_secret:
        process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() ||
        process.env.AUTH_SECRET?.trim() ||
        "",
      redirect_uri: new URL("/api/auth/callback/wtus-auth", appBaseUrl).toString(),
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?error=OAuthCallback", url.origin));
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const claims =
    (tokens.id_token && decodeJwtPayload(tokens.id_token)) ||
    (tokens.access_token && decodeJwtPayload(tokens.access_token)) ||
    null;

  if (!claims?.sub) {
    return NextResponse.redirect(new URL("/?error=OAuthCallback", url.origin));
  }

  const user = await prisma.user.upsert({
    where: {
      discordUserId: claims.discord_user_id || claims.sub,
    },
    update: {
      email: claims.email ?? null,
      name: claims.name ?? claims.preferred_username ?? claims.email ?? null,
      discordUserId: claims.discord_user_id || claims.sub,
      discordHandle: claims.preferred_username ?? null,
      discordServerVerified: true,
      status: "active",
      onboardingStatus: "verified",
    },
    create: {
      email: claims.email ?? null,
      name: claims.name ?? claims.preferred_username ?? claims.email ?? null,
      discordUserId: claims.discord_user_id || claims.sub,
      discordHandle: claims.preferred_username ?? null,
      discordServerVerified: true,
      status: "active",
      onboardingStatus: "verified",
    },
  });

  const sessionToken = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const useSecureCookie = isHttpsUrl(appBaseUrl);
  const response = NextResponse.redirect(new URL(callbackUrl, appBaseUrl));
  response.cookies.set(buildSessionCookieName(appBaseUrl), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie,
    path: "/",
  });
  response.cookies.set("next-auth.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookie,
    path: "/",
  });
  if (useSecureCookie) {
    response.cookies.set("__Secure-next-auth.session-token", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  }
  return response;
}
