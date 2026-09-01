import { describe, it, expect, vi } from "vitest";

vi.mock("../src/db", () => ({
  prisma: {},
}));
vi.mock("../src/server/leantime", () => ({
  fetchLeantimeTasks: vi.fn(),
}));

import { isGlobalOperator } from "../src/server/permissions";

describe("isGlobalOperator — real function", () => {
  it("returns true for owner role", () => {
    const access = { userId: "u1", globalRoles: ["owner"], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(true);
  });

  it("returns true for operations_lead role", () => {
    const access = { userId: "u1", globalRoles: ["operations_lead"], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(true);
  });

  it("returns true when user has both owner and member roles", () => {
    const access = { userId: "u1", globalRoles: ["owner", "member"], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(true);
  });

  it("returns false for member role only", () => {
    const access = { userId: "u1", globalRoles: ["member"], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(false);
  });

  it("returns false for empty roles", () => {
    const access = { userId: "u1", globalRoles: [] as string[], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(false);
  });

  it("returns true for operations_lead among multiple roles", () => {
    const access = { userId: "u1", globalRoles: ["member", "operations_lead"], sections: [] as never[] };
    expect(isGlobalOperator(access)).toBe(true);
  });
});
