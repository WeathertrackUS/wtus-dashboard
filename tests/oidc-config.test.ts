import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
}));

describe("getOidcClientSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("warns in development when the client secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getOidcClientSecret } = await import("../src/lib/oidc");
    expect(getOidcClientSecret()).toBe("");
    expect(warn).toHaveBeenCalledWith(
      "[OIDC] WTUS_DASHBOARD_OIDC_CLIENT_SECRET is not set — OIDC token exchange will fail",
    );
  });

  it("throws in production when the client secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "");

    const { getOidcClientSecret } = await import("../src/lib/oidc");
    expect(() => getOidcClientSecret()).toThrow(
      "WTUS_DASHBOARD_OIDC_CLIENT_SECRET is required in production",
    );
  });
});

describe("getOidcConfig discovery cache", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("clears the cached promise after discovery fails so a later call can retry", async () => {
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "test-secret");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");

    const { discovery } = await import("openid-client");
    const mockDiscovery = vi.mocked(discovery);
    mockDiscovery
      .mockRejectedValueOnce(new Error("issuer unreachable"))
      .mockResolvedValueOnce({ issuer: "https://auth.weathertrackus.com" } as never);

    const { getOidcConfig } = await import("../src/lib/oidc");

    await expect(getOidcConfig()).rejects.toThrow("issuer unreachable");
    await expect(getOidcConfig()).resolves.toMatchObject({
      issuer: "https://auth.weathertrackus.com",
    });
    expect(mockDiscovery).toHaveBeenCalledTimes(2);
  });
});
