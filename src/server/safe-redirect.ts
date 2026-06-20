import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DUMMY_ORIGIN = "http://internal.invalid";
const STATE_TTL_MS = 10 * 60 * 1000;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

export type SanitizeOptions = {
  isProduction?: boolean;
};

type OAuthStatePayload = {
  callbackPath: string;
  exp: number;
  nonce: string;
};

function hasDisallowedCharacters(value: string) {
  return value.includes("\\") || value.includes("@") || /[\0\r\n\t]/.test(value);
}

function hasExplicitScheme(value: string) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

function failsRelativePathShape(value: string) {
  return !value.startsWith("/") || value.startsWith("//");
}

function decodeOnce(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function containsLocalhostHost(value: string) {
  if (/(?:^|\/\/)(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?=[/:]|$)/i.test(value)) {
    return true;
  }

  try {
    const parsed = new URL(value, DUMMY_ORIGIN);
    return LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function hasPathTraversal(value: string) {
  return value.split("/").some((segment) => segment === "..");
}

export function getAuthSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.WTUS_DASHBOARD_OIDC_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function getAppBaseUrl(request: Request) {
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

export function isLocalAppUrl(value: string) {
  try {
    const url = new URL(value);
    return LOCAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function sanitizeRedirectPath(input: string, options: SanitizeOptions = {}) {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const fallback = "/";

  let value = input.trim();
  if (!value) return fallback;

  const isAllowed = (candidate: string) => {
    if (failsRelativePathShape(candidate)) return false;
    if (hasExplicitScheme(candidate)) return false;
    if (hasDisallowedCharacters(candidate)) return false;
    if (isProduction && containsLocalhostHost(candidate)) return false;
    return true;
  };

  if (!isAllowed(value)) return fallback;

  const decoded = decodeOnce(value);
  if (decoded === null || !isAllowed(decoded)) return fallback;

  value = decoded;

  if (hasPathTraversal(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, DUMMY_ORIGIN);
  } catch {
    return fallback;
  }

  if (parsed.origin !== DUMMY_ORIGIN) return fallback;
  if (parsed.pathname.includes("\\")) return fallback;
  if (parsed.pathname.startsWith("//")) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function resolveSafeRedirectUrl(input: string, baseUrl: string, options: SanitizeOptions = {}) {
  const base = new URL(baseUrl);
  const trimmed = input.trim();

  if (!trimmed) {
    return `${base.origin}/`;
  }

  if (trimmed.startsWith("/")) {
    return `${base.origin}${sanitizeRedirectPath(trimmed, options)}`;
  }

  try {
    const target = new URL(trimmed);
    if (target.origin === base.origin) {
      const path = sanitizeRedirectPath(`${target.pathname}${target.search}${target.hash}`, options);
      return `${base.origin}${path}`;
    }
  } catch {
    // Fall through to safe default.
  }

  return `${base.origin}/`;
}

export function createOAuthState(callbackPath: string, secret: string) {
  const payload: OAuthStatePayload = {
    callbackPath: sanitizeRedirectPath(callbackPath),
    exp: Date.now() + STATE_TTL_MS,
    nonce: randomBytes(16).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state: string, secret: string) {
  const separator = state.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = state.slice(0, separator);
  const signature = state.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.callbackPath !== "string") return null;

    return {
      callbackPath: sanitizeRedirectPath(payload.callbackPath),
    };
  } catch {
    return null;
  }
}
