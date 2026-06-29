import { describe, it, expect, vi, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

const scriptPath = path.resolve("scripts/validate-auth-config.ts");

function runValidate(env: Record<string, string | undefined>) {
  return spawnSync("pnpm", ["exec", "tsx", scriptPath], {
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: true,
  });
}

describe("validate-auth-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const validBase = {
    NODE_ENV: "production",
    AUTH_SECRET: "a".repeat(32),
    WTUS_DASHBOARD_OIDC_CLIENT_SECRET: "b".repeat(32),
    OIDC_ISSUER_URL: "https://auth.weathertrackus.com",
    APP_URL: "https://dashboard.weathertrackus.com",
    NEXTAUTH_URL: "https://dashboard.weathertrackus.com",
    DATABASE_URL: "postgresql://wtus:wtus@localhost:5432/wtus_dashboard",
  };

  it("passes with valid production configuration", () => {
    const result = runValidate(validBase);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Auth configuration validation passed.");
  });

  it("rejects non-https OIDC_ISSUER_URL in production", () => {
    const result = runValidate({
      ...validBase,
      OIDC_ISSUER_URL: "http://auth.weathertrackus.com",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("OIDC_ISSUER_URL must use https in production");
  });

  it("rejects mismatched APP_URL and NEXTAUTH_URL origins", () => {
    const result = runValidate({
      ...validBase,
      NEXTAUTH_URL: "https://other.example.com",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must share the same origin");
  });

  it("rejects short OIDC client secrets", () => {
    const result = runValidate({
      ...validBase,
      WTUS_DASHBOARD_OIDC_CLIENT_SECRET: "short",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("WTUS_DASHBOARD_OIDC_CLIENT_SECRET must be at least 32 characters");
  });
});
