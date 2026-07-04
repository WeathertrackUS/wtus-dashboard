import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../src/server/rate-limit";
import { hashToken, generateInviteToken } from "../src/server/token";

describe("RateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 60_000 });
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(true);
  });

  it("rejects requests exceeding the limit", () => {
    const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 60_000 });
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(false);
  });

  it("resets after window expires", async () => {
    const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 50 });
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(limiter.allow("key")).toBe(true);
  });

  it("tracks different keys independently", () => {
    const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
  });

  it("reset allows new requests", () => {
    const limiter = new RateLimiter({ maxAttempts: 1, windowMs: 60_000 });
    expect(limiter.allow("key")).toBe(true);
    expect(limiter.allow("key")).toBe(false);
    limiter.reset("key");
    expect(limiter.allow("key")).toBe(true);
  });
});

describe("token hashing", () => {
  it("produces consistent SHA-256 hashes", () => {
    const token = "test-token-abc";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("does not contain the raw token in the hash", () => {
    const token = "my-secret-token";
    const hash = hashToken(token);
    expect(hash).not.toContain(token);
  });
});

describe("generateInviteToken", () => {
  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateInviteToken()));
    expect(tokens.size).toBe(100);
  });

  it("generates UUID-format tokens", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
