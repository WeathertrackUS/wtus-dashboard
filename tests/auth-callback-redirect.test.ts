import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOAuthState } from "../src/server/safe-redirect";

const AUTH_SECRET = "test-auth-secret";
const APP_BASE = "https://dashboard.weathertrackus.com";

const mockPrismaUserUpsert = vi.fn();
const mockPrismaSessionCreate = vi.fn();
const mockFetch = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      user: {
        get upsert() {
          return mockPrismaUserUpsert;
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

function buildJwt(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function mockSuccessfulTokenExchange(sub = "user-123") {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      id_token: buildJwt({
        sub,
        email: "member@example.com",
        preferred_username: "member",
      }),
    }),
  });
}

describe("wtus-auth callback redirect", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
    vi.stubEnv("APP_URL", APP_BASE);
    vi.stubEnv("NODE_ENV", "production");

    mockPrismaUserUpsert.mockResolvedValue({ id: "db-user-1" });
    mockPrismaSessionCreate.mockResolvedValue({ id: "session-1" });
    mockFetch.mockReset();
    mockSuccessfulTokenExchange();

    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("redirects to the path bound in signed OAuth state", async () => {
    const state = createOAuthState("/tasks?tab=open", AUTH_SECRET);
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      new Request(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`),
    );

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toBe(`${APP_BASE}/tasks?tab=open`);
  });

  it("rejects requests with a mismatched callbackUrl query parameter", async () => {
    const state = createOAuthState("/tasks", AUTH_SECRET);
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      new Request(
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
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls back to / for unsafe destinations embedded in state", async () => {
    const state = createOAuthState("//evil.com", AUTH_SECRET);
    const { GET } = await import("../app/api/auth/callback/wtus-auth/route");

    const response = await GET(
      new Request(`${APP_BASE}/api/auth/callback/wtus-auth?code=abc123&state=${encodeURIComponent(state)}`),
    );

    expect(response.headers.get("location")).toBe(`${APP_BASE}/`);
  });
});

describe("auth login route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
    vi.stubEnv("APP_URL", APP_BASE);
    vi.stubEnv("WTUS_AUTH_URL", "https://auth.weathertrackus.com");
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
    const returnTo = loginUrl.searchParams.get("returnTo");
    expect(returnTo).toBeTruthy();

    const authorizeUrl = new URL(returnTo!);
    const state = authorizeUrl.searchParams.get("state");
    expect(state).toBeTruthy();

    const { verifyOAuthState } = await import("../src/server/safe-redirect");
    expect(verifyOAuthState(state!, AUTH_SECRET)).toEqual({ callbackPath: "/tasks" });
  });
});
