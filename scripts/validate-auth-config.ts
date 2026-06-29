#!/usr/bin/env tsx
import "dotenv/config";

type CheckResult = { ok: true } | { ok: false; message: string };

const isProduction = process.env.NODE_ENV === "production";

function checkSet(name: string): CheckResult {
  const value = process.env[name]?.trim();
  if (!value) {
    return { ok: false, message: `${name} is missing or empty` };
  }
  return { ok: true };
}

function checkUrl(name: string, options: { requireHttps?: boolean; forbidLocalhost?: boolean } = {}): CheckResult {
  const base = checkSet(name);
  if (!base.ok) return base;

  try {
    const url = new URL(process.env[name]!.trim());
    if (options.requireHttps && url.protocol !== "https:") {
      return { ok: false, message: `${name} must use https in production` };
    }
    if (options.forbidLocalhost) {
      const host = url.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "[::1]") {
        return { ok: false, message: `${name} must not use localhost in production` };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, message: `${name} is not a valid URL` };
  }
}

function main() {
  const failures: string[] = [];

  const required = [
    "AUTH_SECRET",
    "WTUS_DASHBOARD_OIDC_CLIENT_SECRET",
    "OIDC_ISSUER_URL",
    "APP_URL",
    "NEXTAUTH_URL",
    "DATABASE_URL",
  ];

  for (const name of required) {
    const result = checkSet(name);
    if (!result.ok) failures.push(result.message);
  }

  const authSecret = process.env.AUTH_SECRET?.trim() || "";
  if (authSecret && authSecret.length < 32) {
    failures.push("AUTH_SECRET must be at least 32 characters");
  }

  const oidcSecret = process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() || "";
  if (oidcSecret && authSecret && oidcSecret === authSecret) {
    failures.push("WTUS_DASHBOARD_OIDC_CLIENT_SECRET must differ from AUTH_SECRET");
  }

  if (isProduction) {
    for (const name of ["APP_URL", "NEXTAUTH_URL", "OIDC_ISSUER_URL"] as const) {
      const result = checkUrl(name, { requireHttps: true, forbidLocalhost: true });
      if (!result.ok) failures.push(result.message);
    }
  }

  const appUrlRaw = process.env.APP_URL?.trim();
  const nextauthUrlRaw = process.env.NEXTAUTH_URL?.trim();
  if (appUrlRaw && nextauthUrlRaw) {
    try {
      const appOrigin = new URL(appUrlRaw).origin;
      const nextauthOrigin = new URL(nextauthUrlRaw).origin;
      if (appOrigin !== nextauthOrigin) {
        failures.push(
          `APP_URL (${appOrigin}) and NEXTAUTH_URL (${nextauthOrigin}) must share the same origin`,
        );
      }
    } catch {
      // Individual URL validation already captured above.
    }
  }

  const appUrl = appUrlRaw;
  if (appUrl) {
    try {
      const redirectUri = new URL("/api/auth/callback/wtus-auth", appUrl).toString();
      console.log(`Expected OIDC redirect URI: ${redirectUri}`);
    } catch {
      failures.push("APP_URL cannot be used to build the OIDC redirect URI");
    }
  }

  if (failures.length > 0) {
    console.error("Auth configuration validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Auth configuration validation passed.");
}

main();
