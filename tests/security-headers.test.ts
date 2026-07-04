import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/server/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 99, retryAfterMs: 0 }),
  rateLimitKeyFromRequest: vi.fn().mockReturnValue("test:key"),
}));

const { middleware } = await import("../../middleware");

function makeRequest(path: string, headers: Record<string, string> = {}) {
  const url = new URL(path, "http://localhost:3000");
  return new Request(url, { headers });
}

describe("security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets Content-Security-Policy on all responses", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("sets X-Frame-Options DENY", () => {
    const res = middleware(makeRequest("/tasks") as never);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets X-Content-Type-Options nosniff", () => {
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Referrer-Policy", () => {
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy with restricted features", () => {
    const res = middleware(makeRequest("/") as never);
    const pp = res.headers.get("Permissions-Policy");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  it("sets HSTS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("does not set HSTS in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Strict-Transport-Security")).toBeNull();
  });

  it("CSP allows Discord CDN images", () => {
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Content-Security-Policy")).toContain("cdn.discordapp.com");
  });

  it("CSP allows OIDC issuer origin for connect-src", () => {
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "connect-src 'self' https://auth.weathertrackus.com",
    );
  });

  it("sets X-XSS-Protection to 0 (modern browsers)", () => {
    const res = middleware(makeRequest("/") as never);
    expect(res.headers.get("X-XSS-Protection")).toBe("0");
  });
});
