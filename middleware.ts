import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitKeyFromRequest } from "./src/server/rate-limit";

// ---------------------------------------------------------------------------
// Security headers applied to every response
// ---------------------------------------------------------------------------

function getSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === "production";

  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://cdn.discordapp.com https://avatars.githubusercontent.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://auth.weathertrackus.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "0",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    ...(isProd
      ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Rate limits  (max requests per windowMs)
// ---------------------------------------------------------------------------

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "api/auth/login": { max: 10, windowMs: 60_000 },
  "api/auth/callback": { max: 20, windowMs: 60_000 },
  "api/onboarding/complete": { max: 5, windowMs: 60_000 },
  "api/onboarding/invites": { max: 10, windowMs: 60_000 },
};

function matchRateLimit(pathname: string) {
  for (const [prefix, config] of Object.entries(RATE_LIMITS)) {
    if (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`)) {
      return { namespace: prefix, config };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const { pathname } = url;
  const response = NextResponse.next();

  // --- Security headers ---------------------------------------------------
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  // --- Rate limiting ------------------------------------------------------
  const match = matchRateLimit(pathname);
  if (match) {
    const key = rateLimitKeyFromRequest(request, match.namespace);
    const result = checkRateLimit(key, match.config);

    response.headers.set("X-RateLimit-Limit", String(match.config.max));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      const rateLimited = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
      for (const [hKey, hValue] of Object.entries(headers)) {
        rateLimited.headers.set(hKey, hValue);
      }
      rateLimited.headers.set("Retry-After", String(retryAfterSec));
      return rateLimited;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
