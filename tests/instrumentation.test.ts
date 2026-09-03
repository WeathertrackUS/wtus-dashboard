import { describe, it, expect, vi, afterEach } from "vitest";

import { register } from "../instrumentation";

describe("production startup validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws before the server starts when the OIDC client secret is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "");

    expect(register).toThrow(
      "WTUS_DASHBOARD_OIDC_CLIENT_SECRET is required in production",
    );
  });

  it("accepts a configured production OIDC client secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "configured-secret");

    expect(register).not.toThrow();
  });

  it("does not require the secret during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WTUS_DASHBOARD_OIDC_CLIENT_SECRET", "");

    expect(register).not.toThrow();
  });
});
