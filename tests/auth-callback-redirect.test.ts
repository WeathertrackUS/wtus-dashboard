import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOAuthStateForNonce } from "../src/server/safe-redirect";

const AUTH_SECRET = "test-auth-secret";
const APP_BASE = "https://dashboard.weathertrackus.com";
const STATE_NONCE = "browser-bound-state-nonce";

const mockPrismaUserUpsert = vi.fn();
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaSessionCreate = vi.fn();
const mockAuthorizationCodeGrant = vi.fn();
const mockGetOidcConfig = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      user: {
        get upsert() {
          return mockPrismaUserUpsert;
        },
        get findUnique() {
          return mockPrismaUserFindUnique;
        },
      },
      session: {
        get create() {
          return mockPrismaSessionCreate;
        },
      },
    };
  },
}));

vi.mock("../src/lib/oidc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/oidc")>();
  return {
    ...actual,
    getOidcConfig: (...args: unknown[]) => mockGetOidcConfig(...args),
    authorizationCodeGrant: (...args: unknown[]) => mockAuthorizationCodeGrant(...args),
    buildAuthorizationUrl: vi.fn(
      (_config: unknown, params: Record<string, string>) => {
        const url = new URL("https://auth.weathertrackus.com/authorize");
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, value);
        }
        return url.toString();
      },
    ),
    randomPKCECodeVerifier: vi.fn(() => "mock-code-verifier"),
    calculatePKCECodeChallenge: vi.fn(() => Promise.resolve("mock-challenge")),
  };
});

async function createBoundState(callbackPath: string) {
  return createOAuthStateForNonce(callbackPath, AUTH_SECRET, STATE_NONCE);
}

function callbackRequest(url: string, includeStateCookie = true) {
  return new Request(url, {
    headers: includeStateCookie
      ? { cookie: `wtus-oauth-state=${STATE_NONCE}; oidc_pkce=mock-pkce-verifier` }
      : undefined,
  });
}

describe("wtus-auth callback redirect", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
    vi.stubEnv("APP_URL", APP_BASE);
    vi.stubEnv("NODE_ENV", "production");

    mockPrismaUserUpsert.mockResolvedValue({ id: "db-user-1" });
    mockPrismaUserFindUnique.mockResolvedValue(null);
    mockPrismaSessionCreate.mockResolvedValue({ id: "session-1" });
    mockAuthorizationCodeGrant.mockReset();
    mockGetOidcConfig.mockReset();

    mockGetOidcConfig.mockResolvedValue({
      _redirectUri: `${APP_BASE}/api/auth/callback/wtus-auth`,
      serverMetadata: () => ({
        issuer: "https://auth.weathertrackus.com",
      }),
    });

    mockAuthorizationCodeGrant.mockResolvedValue({
      claims: () => ({
        sub: "user-123",
        email: "member@example.com",
        preferred_username: "member",
        wtus_member: true,
      }),
      id_token: "mock-id-token",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to the path bound in signed OAuth state", async () => {
    const state = await createBoundState("/tasks?tab=open");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      callbackRequest(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`),
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe(`${APP_BASE}/tasks?tab=open`);
  });

  it("rejects requests with a mismatched callbackUrl query parameter", async () => {
    const state = await createBoundState("/tasks");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      callbackRequest(
        `${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}&callbackUrl=${encodeURIComponent("https://evil.com")}`,
      ),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/?error=OAuthCallback`);
  });

  it("rejects missing or tampered OAuth state before token exchange", async () => {
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const missingState = await GET(
      new Request(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123`),
    );
    const tamperedState = await GET(
      new Request(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=tampered`),
    );

    expect(missingState.headers.get("location")).toBe(`${APP_BASE}/?error=OAuthCallback`);
    expect(tamperedState.headers.get("location")).toBe(`${APP_BASE}/?error=OAuthCallback`);
    expect(mockAuthorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("rejects valid state when the browser-bound nonce cookie is missing", async () => {
    const state = await createBoundState("/tasks");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      callbackRequest(
        `${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`,
        false,
      ),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/?error=OAuthCallback`);
    expect(mockAuthorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("rejects unsafe callbackUrl input even when its sanitized fallback matches state", async () => {
    const state = await createBoundState("/");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      callbackRequest(
        `${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}&callbackUrl=${encodeURIComponent("https://evil.com")}`,
      ),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/?error=OAuthCallback`);
    expect(mockAuthorizationCodeGrant).not.toHaveBeenCalled();
  });

  it("falls back to / for unsafe destinations embedded in state", async () => {
    const state = await createBoundState("//evil.com");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      callbackRequest(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/`);
  });

  it("redirects to configured APP_URL after login even with hostile forwarded host", async () => {
    const state = await createBoundState("/");
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      new Request(
        `https://evil.com/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`,
        {
          headers: {
            cookie: `wtus-oauth-state=${STATE_NONCE}; oidc_pkce=mock-pkce-verifier`,
            host: "evil.com",
            "x-forwarded-host": "evil.com",
            "x-forwarded-proto": "https",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/`);
    expect(mockAuthorizationCodeGrant).toHaveBeenCalled();
  });
});

describe("auth login route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
    vi.stubEnv("APP_URL", APP_BASE);
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "test-secret");

    mockGetOidcConfig.mockReset();
    mockGetOidcConfig.mockResolvedValue({
      _redirectUri: `${APP_BASE}/api/auth/callback/wtus-auth`,
      serverMetadata: () => ({
        issuer: "https://auth.weathertrackus.com",
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("embeds a signed callback path in the OAuth state parameter", async () => {
    const { GET } = await import("../app/api/auth/login/route");

    const response = await GET(
      new Request(`${APP_BASE}/api/auth/login?callbackUrl=${encodeURIComponent("/tasks")}`),
    );

    const location = response.headers.get("location");
    expect(location).toBeTruthy();

    const loginUrl = new URL(location!);
    const state = loginUrl.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(loginUrl.searchParams.get("scope")).toBe("openid profile email");

    const { verifyOAuthState } = await import("../src/server/safe-redirect");
    const verifiedState = await verifyOAuthState(state!, AUTH_SECRET);
    const stateCookie = response.headers
      .get("set-cookie")
      ?.match(/wtus-oauth-state=([^;]+)/)?.[1];
    expect(verifiedState).toMatchObject({ callbackPath: "/tasks", nonce: stateCookie });
  });
});
