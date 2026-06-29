import { describe, it, expect } from "vitest";
import { authOptions } from "../src/auth";

describe("authOptions providers", () => {
  it("does not register OAuth providers — login uses /api/auth/login", () => {
    expect(authOptions.providers).toEqual([]);
  });
});
