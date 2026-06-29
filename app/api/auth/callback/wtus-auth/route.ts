import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/db";
import {
  getOidcConfig,
  authorizationCodeGrant,
  SESSION_MAX_AGE_SECONDS,
  resolveOidcRedirectUri,
  buildOidcCallbackUrl,
} from "../../../../../src/lib/oidc";
import {
  getAppBaseUrl,
  getAuthSecret,
  buildSessionCookieName,
  useSecureSessionCookie,
  readRequestCookie,
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
  wtus_member?: boolean;
};

function oauthErrorRedirect(requestUrl: URL, appBaseUrl: string) {
  const response = NextResponse.redirect(new URL("/?error=OAuthCallback", appBaseUrl || requestUrl.origin));
  clearOAuthStateCookie(response);
  response.cookies.delete("oidc_pkce");
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
  const stateCookie = readRequestCookie(request, "wtus-oauth-state");
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

  const codeVerifier = readRequestCookie(request, "oidc_pkce");
  if (!codeVerifier) {
    console.error("[AUTH] Missing PKCE code verifier cookie");
    return oauthErrorRedirect(url, appBaseUrl);
  }

  try {
    const config = await getOidcConfig();
    const redirectUri = resolveOidcRedirectUri(config, appBaseUrl);
    const callbackUrlObj = buildOidcCallbackUrl(redirectUri, url);

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
    const isDiscordVerified = idTokenClaims.wtus_member === true;

    const existingUser = await prisma.user.findUnique({
      where: { discordUserId },
      select: { onboardingStatus: true, status: true },
    });
    const isOnboarded =
      existingUser?.onboardingStatus === "verified" && existingUser?.status === "active";

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
        status: isOnboarded ? "active" : isDiscordVerified ? "active" : "invited",
        onboardingStatus: isOnboarded ? "verified" : isDiscordVerified ? "verified" : "pending",
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

    const sessionExpires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    const sessionToken = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpires,
      },
    });

    const useSecureCookie = useSecureSessionCookie(appBaseUrl);
    const safeCallbackPath = verifiedState.callbackPath;
    const response = NextResponse.redirect(new URL(safeCallbackPath, appBaseUrl));
    clearOAuthStateCookie(response);

    response.cookies.set(buildSessionCookieName(appBaseUrl), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: useSecureCookie,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    response.cookies.delete("oidc_pkce");

    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error("[AUTH] OIDC token exchange/verification failed:", error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error("[AUTH] OIDC token exchange/verification failed:", String(error));
    }
    return oauthErrorRedirect(url, appBaseUrl);
  }
}
