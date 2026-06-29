import { describe, it, expect, vi, afterEach } from "vitest";

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
