import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createOAuthState,
  resolveSafeRedirectUrl,
  sanitizeRedirectPath,
  verifyOAuthState,
} from "../src/server/safe-redirect";

const APP_BASE = "https://dashboard.weathertrackus.com";
const AUTH_SECRET = "test-auth-secret";

describe("sanitizeRedirectPath", () => {
  it("allows valid same-origin paths with query strings and hashes", () => {
    expect(sanitizeRedirectPath("/tasks")).toBe("/tasks");
    expect(sanitizeRedirectPath("/tasks?tab=open")).toBe("/tasks?tab=open");
    expect(sanitizeRedirectPath("/#/onboard/abc123")).toBe("/#/onboard/abc123");
  });

  it("defaults empty input to /", () => {
    expect(sanitizeRedirectPath("")).toBe("/");
    expect(sanitizeRedirectPath("   ")).toBe("/");
  });

  it("rejects external absolute and protocol-relative URLs", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/");
    expect(sanitizeRedirectPath("///evil.com")).toBe("/");
  });

  it("rejects encoded open-redirect bypasses", () => {
    expect(sanitizeRedirectPath("/%2f%2fevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%5c%5cevil.com")).toBe("/");
    expect(sanitizeRedirectPath("/%2e%2e/etc/passwd")).toBe("/");
  });

  it("rejects credentials, backslashes, and javascript URLs", () => {
    expect(sanitizeRedirectPath("https://user:pass@evil.com")).toBe("/");
    expect(sanitizeRedirectPath("/\\@evil.com")).toBe("/");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects localhost targets in production", () => {
    expect(sanitizeRedirectPath("https://localhost/", { isProduction: true })).toBe("/");
    expect(sanitizeRedirectPath("http://127.0.0.1:3000/", { isProduction: true })).toBe("/");
    expect(sanitizeRedirectPath("/tasks", { isProduction: true })).toBe("/tasks");
  });

  it("rejects absolute URLs even outside production", () => {
    expect(sanitizeRedirectPath("http://127.0.0.1:3000/tasks", { isProduction: false })).toBe("/");
  });
});

describe("resolveSafeRedirectUrl", () => {
  it("returns same-origin absolute URLs as sanitized paths", () => {
    expect(resolveSafeRedirectUrl("/tasks", APP_BASE)).toBe(`${APP_BASE}/tasks`);
    expect(resolveSafeRedirectUrl(`${APP_BASE}/tasks?tab=open`, APP_BASE)).toBe(
      `${APP_BASE}/tasks?tab=open`,
    );
  });

  it("rejects external absolute URLs", () => {
    expect(resolveSafeRedirectUrl("https://evil.com/phish", APP_BASE)).toBe(`${APP_BASE}/`);
  });
});

describe("OAuth state binding", () => {
  it("round-trips a callback path through signed state", async () => {
    const state = await createOAuthState("/tasks?tab=open", AUTH_SECRET);
    const verified = await verifyOAuthState(state, AUTH_SECRET);

    expect(verified).toEqual({ callbackPath: "/tasks?tab=open" });
  });

  it("rejects tampered state", async () => {
    const state = await createOAuthState("/tasks", AUTH_SECRET);
    const tampered = `${state}x`;

    expect(await verifyOAuthState(tampered, AUTH_SECRET)).toBeNull();
  });

  it("rejects expired state", async () => {
    const state = await createOAuthState("/tasks", AUTH_SECRET);
    const separator = state.lastIndexOf(".");
    const encoded = state.slice(0, separator);
    const signature = state.slice(separator + 1);
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    payload.exp = Date.now() - 1_000;
    const expiredEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const expiredState = `${expiredEncoded}.${signature}`;

    expect(await verifyOAuthState(expiredState, AUTH_SECRET)).toBeNull();
  });

  it("sanitizes unsafe callback paths before signing", async () => {
    const state = await createOAuthState("//evil.com", AUTH_SECRET);
    const verified = await verifyOAuthState(state, AUTH_SECRET);

    expect(verified).toEqual({ callbackPath: "/" });
  });
});

describe("verifyOAuthState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects state after the TTL expires", async () => {
    const state = await createOAuthState("/tasks", AUTH_SECRET);

    vi.setSystemTime(new Date("2026-06-20T12:11:00.000Z"));
    expect(await verifyOAuthState(state, AUTH_SECRET)).toBeNull();
  });
});
