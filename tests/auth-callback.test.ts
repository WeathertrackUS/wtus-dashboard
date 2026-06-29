import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOAuthStateForNonce } from "../src/server/safe-redirect";

const AUTH_SECRET = "test-auth-secret";
const STATE_NONCE = "browser-bound-state-nonce";

// Mock openid-client at the module level
const mockAuthorizationCodeGrant = vi.fn();
const mockGetOidcConfig = vi.fn();

vi.mock("../src/lib/oidc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/oidc")>();
  return {
    ...actual,
    getOidcConfig: (...args: unknown[]) => mockGetOidcConfig(...args),
    authorizationCodeGrant: (...args: unknown[]) => mockAuthorizationCodeGrant(...args),
    buildAuthorizationUrl: vi.fn(),
    randomPKCECodeVerifier: vi.fn(() => "mock-code-verifier"),
    calculatePKCECodeChallenge: vi.fn(() => Promise.resolve("mock-challenge")),
  };
});

// Mock Prisma
const mockPrismaUserUpsert = vi.fn();
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaSessionCreate = vi.fn();

vi.mock("../src/db", () => ({
  get prisma() {
    return {
      user: {
        upsert: (...args: unknown[]) => mockPrismaUserUpsert(...args),
        findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
      },
      session: {
        create: (...args: unknown[]) => mockPrismaSessionCreate(...args),
      },
    };
  },
}));

function createRequest(
  url: string,
  cookies: Record<string, string> = {},
): Request {
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("; ");

  return new Request(url, {
    headers: {
      cookie: cookieHeader,
      host: "localhost:3000",
      "x-forwarded-proto": "http",
    },
  });
}

describe("GET /api/auth/callback/wtus-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "test-secret");
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);

    mockPrismaUserFindUnique.mockResolvedValue(null);

    mockGetOidcConfig.mockResolvedValue({
      _redirectUri: "http://localhost:3000/api/auth/callback/wtus-auth",
      serverMetadata: () => ({
        issuer: "https://auth.weathertrackus.com",
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("missing authorization code", () => {
    it("redirects with error when code is missing", async () => {
      const request = createRequest(
        "http://localhost:3000/api/auth/callback/wtus-auth?state=test-state",
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
    });
  });

  describe("missing state cookie", () => {
    it("redirects with error when state cookie is missing", async () => {
      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
    });
  });

  describe("state mismatch", () => {
    it("redirects with error when state does not match", async () => {
      const state = await createOAuthStateForNonce("/", AUTH_SECRET, "wrong-nonce");
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
    });
  });

  describe("missing PKCE code verifier", () => {
    it("redirects with error when PKCE cookie is missing", async () => {
      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
    });
  });

  describe("token exchange failure", () => {
    it("redirects with error when token exchange fails", async () => {
      mockAuthorizationCodeGrant.mockRejectedValue(
        new Error("Token exchange failed"),
      );

      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
      expect(mockAuthorizationCodeGrant).toHaveBeenCalled();
    });
  });

  describe("successful authentication", () => {
    it("creates session and redirects on valid callback", async () => {
      mockAuthorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          sub: "user-123",
          email: "test@example.com",
          name: "Test User",
          preferred_username: "testuser",
          wtus_member: true,
        }),
        id_token: "mock-id-token",
      });

      mockPrismaUserUpsert.mockResolvedValue({
        id: "user-123",
        discordUserId: "user-123",
      });

      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");

      expect(mockPrismaUserUpsert).toHaveBeenCalledWith({
        where: { discordUserId: "user-123" },
        update: expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
          discordHandle: "testuser",
          discordServerVerified: true,
          status: "active",
          onboardingStatus: "verified",
        }),
        create: expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
          discordHandle: "testuser",
          discordServerVerified: true,
          status: "active",
          onboardingStatus: "verified",
        }),
      });

      expect(mockPrismaSessionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          expires: expect.any(Date),
        }),
      });
    });

    it("does not set discordServerVerified when claim is missing", async () => {
      mockAuthorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          sub: "user-456",
          email: "no-discord@example.com",
          name: "No Discord User",
        }),
        id_token: "mock-id-token",
      });

      mockPrismaUserUpsert.mockResolvedValue({
        id: "user-456",
        discordUserId: "user-456",
      });

      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);

      expect(mockPrismaUserUpsert).toHaveBeenCalledWith({
        where: { discordUserId: "user-456" },
        update: expect.objectContaining({
          discordServerVerified: false,
          status: "invited",
          onboardingStatus: "pending",
        }),
        create: expect.objectContaining({
          discordServerVerified: false,
          status: "invited",
          onboardingStatus: "pending",
        }),
      });
    });

    it("preserves verified onboarding status on re-login", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        onboardingStatus: "verified",
        status: "active",
      });

      mockAuthorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          sub: "user-123",
          email: "test@example.com",
          preferred_username: "testuser",
          wtus_member: false,
        }),
        id_token: "mock-id-token",
      });

      mockPrismaUserUpsert.mockResolvedValue({
        id: "user-123",
        discordUserId: "user-123",
      });

      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import("../app/api/auth/callback/wtus-auth/route");
      await GET(request);

      expect(mockPrismaUserUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            onboardingStatus: "verified",
            status: "active",
          }),
        }),
      );
    });
  });

  describe("token claims validation", () => {
    it("rejects token without sub claim", async () => {
      mockAuthorizationCodeGrant.mockResolvedValue({
        claims: () => ({
          email: "test@example.com",
        }),
        id_token: "mock-id-token",
      });

      const state = await createOAuthStateForNonce("/", AUTH_SECRET, STATE_NONCE);
      const request = createRequest(
        `http://localhost:3000/api/auth/callback/wtus-auth?code=test-code&state=${encodeURIComponent(state)}`,
        {
          "wtus-oauth-state": STATE_NONCE,
          oidc_pkce: "test-pkce",
        },
      );

      const { GET } = await import(
        "../app/api/auth/callback/wtus-auth/route"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=OAuthCallback");
    });
  });
});
