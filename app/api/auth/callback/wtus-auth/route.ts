import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import { getOidcConfig, authorizationCodeGrant } from "../../../../../src/lib/oidc";
import {
  getAppBaseUrl,
  getAuthSecret,
  sanitizeRedirectPath,
  verifyOAuthState,
} from "../../../../../src/server/safe-redirect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  discord_user_id?: string;
  wtus_discord_verified?: boolean;
};

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

function oauthErrorRedirect(requestUrl: URL, appBaseUrl: string) {
  const response = NextResponse.redirect(new URL("/?error=OAuthCallback", appBaseUrl || requestUrl.origin));
  clearOAuthStateCookie(response);
  return response;
}

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set("wtus-oauth-state", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/api/auth/callback/wtus-auth",
  });
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const entry of cookieHeader.split(";")) {
    const [key, ...valueParts] = entry.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return "";
      }
    }
  }
  return "";
}

function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() || "";
  const state = url.searchParams.get("state")?.trim() || "";
  const appBaseUrl = getAppBaseUrl(request);
  const authSecret = getAuthSecret();

  if (!code || !state || !authSecret) {
    return oauthErrorRedirect(url, appBaseUrl);
  }

  const verifiedState = await verifyOAuthState(state, authSecret);
  const stateCookie = readCookie(request, "wtus-oauth-state");
  if (!verifiedState || !stateCookie || stateCookie !== verifiedState.nonce) {
    return oauthErrorRedirect(url, appBaseUrl);
  }

  const callbackUrlParam = url.searchParams.get("callbackUrl");
  if (callbackUrlParam !== null) {
    const sanitizedParam = sanitizeRedirectPath(callbackUrlParam);
    if (sanitizedParam !== callbackUrlParam.trim() || sanitizedParam !== verifiedState.callbackPath) {
      return oauthErrorRedirect(url, appBaseUrl);
    }
  }

  // Retrieve PKCE code verifier from cookies
  const cookieHeader = request.headers.get("cookie");
  const codeVerifier = getCookieValue(cookieHeader, "oidc_pkce");

  if (!codeVerifier) {
    console.error("[AUTH] Missing PKCE code verifier cookie");
    return oauthErrorRedirect(url, appBaseUrl);
  }

  try {
    const config = await getOidcConfig();
    const redirectUri =
      (config as unknown as { _redirectUri?: string })._redirectUri ||
      new URL("/api/auth/callback/wtus-auth", appBaseUrl).toString();

    const callbackUrlObj = new URL(request.url);

    const tokens = await authorizationCodeGrant(config, callbackUrlObj, {
      expectedState: state,
      pkceCodeVerifier: codeVerifier,
    });

    const idTokenClaims = tokens.claims() as TokenClaims | undefined;

    if (!idTokenClaims?.sub) {
      console.error("[AUTH] Missing sub claim in verified token");
      return oauthErrorRedirect(url, appBaseUrl);
    }

    console.log("[AUTH] OIDC token verified successfully", {
      sub: idTokenClaims.sub,
      issuer: tokens.id_token ? "verified" : "no-id-token",
    });

    const discordUserId = idTokenClaims.discord_user_id || idTokenClaims.sub;
    const isDiscordVerified = idTokenClaims.wtus_discord_verified === true;

    const user = await prisma.user.upsert({
      where: {
        discordUserId,
      },
      update: {
        email: idTokenClaims.email ?? null,
        name:
          idTokenClaims.name ??
          idTokenClaims.preferred_username ??
          idTokenClaims.email ??
          null,
        discordUserId,
        discordHandle: idTokenClaims.preferred_username ?? null,
        discordServerVerified: isDiscordVerified,
        status: isDiscordVerified ? "active" : "invited",
        onboardingStatus: isDiscordVerified ? "verified" : "pending",
      },
      create: {
        email: idTokenClaims.email ?? null,
        name:
          idTokenClaims.name ??
          idTokenClaims.preferred_username ??
          idTokenClaims.email ??
          null,
        discordUserId,
        discordHandle: idTokenClaims.preferred_username ?? null,
        discordServerVerified: isDiscordVerified,
        status: isDiscordVerified ? "active" : "invited",
        onboardingStatus: isDiscordVerified ? "verified" : "pending",
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
    const safeCallbackPath = verifiedState.callbackPath;
    const response = NextResponse.redirect(new URL(safeCallbackPath, appBaseUrl));
    clearOAuthStateCookie(response);

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
      response.cookies.set(
        "__Secure-next-auth.session-token",
        sessionToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
        },
      );
    }

    response.cookies.delete("oidc_pkce");

    return response;
  } catch (error) {
    console.error("[AUTH] OIDC token exchange/verification failed:", error);
    return oauthErrorRedirect(url, appBaseUrl);
  }
}
