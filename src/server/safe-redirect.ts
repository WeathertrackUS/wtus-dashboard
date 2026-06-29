import { createHash, randomBytes, webcrypto } from "node:crypto";

const { subtle } = webcrypto;
const DUMMY_ORIGIN = "http://internal.invalid";
const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_SIGNING_CONTEXT = "wtus-dashboard-oauth-state-v1";
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
  return process.env.AUTH_SECRET?.trim() || "";
}

function requestOriginFromHeaders(request: Request) {
  const headers = request.headers;
  const forwardedHost =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.trim() || "";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
  return forwardedHost && forwardedProto
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;
}

export function getAppBaseUrl(request: Request) {
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (configuredUrl) {
    try {
      const configured = new URL(configuredUrl);
      if (isProduction) {
        return configured.origin;
      }
      if (configured.hostname === "localhost" || configured.hostname === "127.0.0.1") {
        return requestOriginFromHeaders(request);
      }
      return configured.origin;
    } catch {
      // Fall through to request origin in development only.
    }
  }

  return requestOriginFromHeaders(request);
}

export function isLocalAppUrl(value: string) {
  try {
    const url = new URL(value);
    return LOCAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Mirrors NextAuth v4 session cookie naming (see next-auth/jwt). */
export function useSecureSessionCookie(appBaseUrl?: string) {
  const configured = process.env.NEXTAUTH_URL?.trim() || process.env.APP_URL?.trim() || "";
  if (configured.startsWith("https://")) return true;
  if (process.env.VERCEL) return true;
  if (appBaseUrl) return isHttpsUrl(appBaseUrl);
  return false;
}

export function buildSessionCookieName(appBaseUrl?: string) {
  return useSecureSessionCookie(appBaseUrl)
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
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

async function importStateSigningKey(signingKeyMaterial: string) {
  const derivedKey = createHash("sha256")
    .update(`${STATE_SIGNING_CONTEXT}\0${signingKeyMaterial}`)
    .digest();

  return subtle.importKey(
    "raw",
    derivedKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signStatePayload(encodedPayload: string, signingKeyMaterial: string) {
  const key = await importStateSigningKey(signingKeyMaterial);
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return Buffer.from(signature).toString("base64url");
}

async function verifyStatePayloadSignature(
  encodedPayload: string,
  signature: string,
  signingKeyMaterial: string,
) {
  const key = await importStateSigningKey(signingKeyMaterial);

  try {
    return await subtle.verify(
      "HMAC",
      key,
      Buffer.from(signature, "base64url"),
      new TextEncoder().encode(encodedPayload),
    );
  } catch {
    return false;
  }
}

export async function createOAuthState(callbackPath: string, signingKeyMaterial: string) {
  return createOAuthStateForNonce(callbackPath, signingKeyMaterial, createOAuthStateNonce());
}

export function createOAuthStateNonce() {
  return randomBytes(16).toString("hex");
}

export async function createOAuthStateForNonce(
  callbackPath: string,
  signingKeyMaterial: string,
  nonce: string,
) {
  const payload: OAuthStatePayload = {
    callbackPath: sanitizeRedirectPath(callbackPath),
    exp: Date.now() + STATE_TTL_MS,
    nonce,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await signStatePayload(encoded, signingKeyMaterial);
  return `${encoded}.${signature}`;
}

export async function verifyOAuthState(state: string, signingKeyMaterial: string) {
  const separator = state.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = state.slice(0, separator);
  const signature = state.slice(separator + 1);
  const isValid = await verifyStatePayloadSignature(encoded, signature, signingKeyMaterial);
  if (!isValid) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.callbackPath !== "string" || typeof payload.nonce !== "string" || !payload.nonce) return null;

    return {
      callbackPath: sanitizeRedirectPath(payload.callbackPath),
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}
