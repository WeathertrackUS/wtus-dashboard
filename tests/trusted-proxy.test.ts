import { describe, it, expect, vi, afterEach } from "vitest";
import { getAppBaseUrl } from "../src/server/safe-redirect";

describe("trusted proxy / forwarded header validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores hostile X-Forwarded-Proto when protocol is not http/https", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");

    const req = new Request("http://localhost:3000/", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "evil.com",
        "x-forwarded-proto": "javascript",
      },
    });

    // Should not produce "javascript://evil.com" — falls back to request origin
    const base = getAppBaseUrl(req);
    expect(base).not.toContain("javascript");
  });

  it("uses APP_URL in production regardless of hostile forwarded headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://dashboard.weathertrackus.com");

    const req = new Request("http://localhost:3000/", {
      headers: {
        host: "evil.com",
        "x-forwarded-host": "evil.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getAppBaseUrl(req)).toBe("https://dashboard.weathertrackus.com");
  });

  it("rejects forwarded hosts not in TRUSTED_PROXY_HOSTS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("TRUSTED_PROXY_HOSTS", "proxy.internal,lb.internal");

    const req = new Request("http://localhost:3000/", {
      headers: {
        host: "evil.com",
        "x-forwarded-host": "evil.com",
        "x-forwarded-proto": "https",
      },
    });

    const base = getAppBaseUrl(req);
    // Should not trust evil.com — falls back to request URL origin
    expect(base).not.toContain("evil.com");
  });

  it("trusts forwarded hosts listed in TRUSTED_PROXY_HOSTS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("TRUSTED_PROXY_HOSTS", "dashboard.weathertrackus.com");

    const req = new Request("http://localhost:3000/", {
      headers: {
        host: "proxy.internal",
        "x-forwarded-host": "dashboard.weathertrackus.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getAppBaseUrl(req)).toBe("https://dashboard.weathertrackus.com");
  });

  it("allows valid http/https forwarded protocol", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");

    const req = new Request("http://localhost:3000/", {
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "app.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(getAppBaseUrl(req)).toBe("https://app.example.com");
  });
});
