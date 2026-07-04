import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  rateLimitKeyFromRequest,
  _resetRateLimitBuckets,
} from "../src/server/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    _resetRateLimitBuckets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const config = { max: 3, windowMs: 60_000 };
    expect(checkRateLimit("k1", config).allowed).toBe(true);
    expect(checkRateLimit("k1", config).allowed).toBe(true);
    expect(checkRateLimit("k1", config).allowed).toBe(true);
  });

  it("rejects requests over the limit", () => {
    const config = { max: 2, windowMs: 60_000 };
    expect(checkRateLimit("k2", config).allowed).toBe(true);
    expect(checkRateLimit("k2", config).allowed).toBe(true);
    const third = checkRateLimit("k2", config);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const config = { max: 1, windowMs: 10_000 };
    expect(checkRateLimit("k3", config).allowed).toBe(true);
    expect(checkRateLimit("k3", config).allowed).toBe(false);

    vi.advanceTimersByTime(10_001);
    expect(checkRateLimit("k3", config).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const config = { max: 1, windowMs: 60_000 };
    expect(checkRateLimit("a", config).allowed).toBe(true);
    expect(checkRateLimit("b", config).allowed).toBe(true);
    expect(checkRateLimit("a", config).allowed).toBe(false);
    expect(checkRateLimit("b", config).allowed).toBe(false);
  });

  it("reports remaining count", () => {
    const config = { max: 3, windowMs: 60_000 };
    const r1 = checkRateLimit("rem", config);
    expect(r1.remaining).toBe(2);
    const r2 = checkRateLimit("rem", config);
    expect(r2.remaining).toBe(1);
    const r3 = checkRateLimit("rem", config);
    expect(r3.remaining).toBe(0);
  });
});

describe("rateLimitKeyFromRequest", () => {
  it("uses X-Forwarded-For first entry", () => {
    const req = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(rateLimitKeyFromRequest(req, "login")).toBe("login:1.2.3.4");
  });

  it("falls back to 'unknown' when no header present", () => {
    const req = new Request("http://localhost/api/auth/login");
    expect(rateLimitKeyFromRequest(req, "login")).toBe("login:unknown");
  });
});
